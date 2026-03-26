"""Gmail API integration: OAuth, sync, and email fetching."""

import uuid
from datetime import datetime, timezone

from thefuzz import fuzz
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.application import Application, StageEnum
from app.models.email_account import EmailAccount
from app.models.email_message import EmailMessage
from app.models.timeline_event import EventTypeEnum, TimelineEvent
from app.services.email_parser import classify_email
from app.services.encryption import decrypt_token, encrypt_token
from app.utils.gmail_queries import build_job_email_query

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def _build_gmail_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.gmail_redirect_uri],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES)
    flow.redirect_uri = settings.gmail_redirect_uri
    return flow


def get_gmail_auth_url() -> str:
    flow = _build_gmail_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


async def connect_gmail(code: str, user_id: uuid.UUID, db: AsyncSession) -> EmailAccount:
    """Exchange Gmail OAuth code for credentials and store encrypted refresh token."""
    import os
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
    flow = _build_gmail_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    if not credentials.refresh_token:
        raise ValueError("No refresh token received. User may need to re-authorize with prompt=consent.")

    # Get the user's Gmail address
    service = build("gmail", "v1", credentials=credentials)
    profile = service.users().getProfile(userId="me").execute()
    email_address = profile["emailAddress"]

    encrypted_token = encrypt_token(credentials.refresh_token)

    # Upsert email account
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()

    if account:
        account.email_address = email_address
        account.encrypted_refresh_token = encrypted_token
        account.is_active = True
        account.updated_at = datetime.now(timezone.utc)
    else:
        account = EmailAccount(
            user_id=user_id,
            email_address=email_address,
            encrypted_refresh_token=encrypted_token,
        )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


async def disconnect_gmail(user_id: uuid.UUID, db: AsyncSession) -> bool:
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        return False

    account.is_active = False
    account.updated_at = datetime.now(timezone.utc)
    db.add(account)
    return True


def _build_gmail_client(refresh_token: str) -> object:
    """Build an authenticated Gmail API client from a refresh token."""
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=GMAIL_SCOPES,
    )
    credentials.refresh(GoogleRequest())
    return build("gmail", "v1", credentials=credentials)


async def sync_emails(
    user_id: uuid.UUID, db: AsyncSession
) -> dict:
    """Fetch new emails from Gmail and store them, auto-linking where possible."""
    # Get the email account
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    # Decrypt the refresh token and build client
    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    # Build search query
    query = build_job_email_query(after_date=account.last_sync_at)

    # Fetch message list
    messages_response = service.users().messages().list(
        userId="me", q=query, maxResults=100
    ).execute()

    message_ids = [m["id"] for m in messages_response.get("messages", [])]

    if not message_ids:
        account.last_sync_at = datetime.now(timezone.utc)
        db.add(account)
        return {"new_emails": 0, "auto_linked": 0, "suggestions": 0}

    # Get tracked companies for matching
    app_result = await db.execute(
        select(Application.company, Application.id).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
        )
    )
    company_map: dict[str, uuid.UUID] = {}
    tracked_companies: list[str] = []
    for company, app_id in app_result.all():
        company_map[company] = app_id
        tracked_companies.append(company)

    new_count = 0
    auto_linked = 0
    auto_created = 0
    stage_updates = 0
    timeline_events = 0

    for msg_id in message_ids:
        # Skip if already stored
        existing = await db.execute(
            select(EmailMessage).where(EmailMessage.gmail_message_id == msg_id)
        )
        if existing.scalar_one_or_none():
            continue

        # Fetch message metadata
        msg = service.users().messages().get(
            userId="me", id=msg_id, format="metadata",
            metadataHeaders=["Subject", "From", "Date"]
        ).execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "(no subject)")
        from_address = headers.get("From", "")
        snippet = msg.get("snippet", "")
        thread_id = msg.get("threadId", "")

        # Parse the date
        internal_date_ms = int(msg.get("internalDate", "0"))
        received_at = datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc)

        # Classify the email
        classification = classify_email(from_address, subject, snippet, tracked_companies)

        if not classification["is_job_related"]:
            continue

        intent = classification.get("intent")
        print(f"[SYNC] intent={intent} | company={classification.get('extracted_company')} | matched={classification.get('matched_company')} | subject={subject[:80]}")
        application_id = None
        is_auto_linked = False

        # Try to match to existing application
        if classification["matched_company"] and classification["confidence"] in ("high", "medium"):
            matched = classification["matched_company"]
            if matched in company_map:
                application_id = company_map[matched]
                is_auto_linked = True
                auto_linked += 1

        # Auto-create application if this is a confirmation email and no match exists
        if not application_id and intent == "application_confirmed":
            company_name = classification.get("extracted_company")
            if company_name and company_name not in company_map:
                position = classification.get("extracted_position") or "Unknown Position"
                # Get next stage_order
                order_result = await db.execute(
                    select(func.coalesce(func.max(Application.stage_order), -1)).where(
                        Application.user_id == user_id,
                        Application.stage == StageEnum.APPLIED,
                    )
                )
                next_order = order_result.scalar_one() + 1

                new_app = Application(
                    user_id=user_id,
                    company=company_name,
                    position=position,
                    stage=StageEnum.APPLIED,
                    stage_order=next_order,
                    applied_date=received_at.date(),
                )
                db.add(new_app)
                await db.flush()

                application_id = new_app.id
                is_auto_linked = True
                company_map[company_name] = new_app.id
                tracked_companies.append(company_name)
                auto_created += 1

                # Add "Applied" timeline event
                db.add(TimelineEvent(
                    application_id=new_app.id,
                    event_type=EventTypeEnum.APPLIED,
                    title=f"Applied to {company_name}",
                    description=f"Auto-detected from email: {subject[:100]}",
                    event_date=received_at,
                ))
                timeline_events += 1

        # If no application_id yet, try to match via extracted company name
        if not application_id and intent in ("interview", "rejection", "offer"):
            extracted = classification.get("extracted_company")
            if extracted:
                # Try exact match first
                if extracted in company_map:
                    application_id = company_map[extracted]
                    is_auto_linked = True
                    auto_linked += 1
                else:
                    # Try fuzzy match against tracked companies
                    for comp_name, comp_id in company_map.items():
                        if fuzz.ratio(extracted.lower(), comp_name.lower()) >= 70:
                            application_id = comp_id
                            is_auto_linked = True
                            auto_linked += 1
                            break

        # Auto-update stage and add timeline events for existing applications
        if application_id and intent in ("interview", "rejection", "offer"):
            app_result = await db.execute(
                select(Application).where(Application.id == application_id)
            )
            app = app_result.scalar_one_or_none()

            if app and intent == "interview":
                # Move to interview stage if not already past it
                if app.stage in (StageEnum.APPLIED, StageEnum.SCREENING):
                    app.stage = StageEnum.INTERVIEW
                    app.updated_at = datetime.now(timezone.utc)
                    db.add(app)
                    stage_updates += 1

                db.add(TimelineEvent(
                    application_id=application_id,
                    event_type=EventTypeEnum.TECHNICAL_INTERVIEW,
                    title=f"Interview scheduled",
                    description=f"Auto-detected from email: {subject[:100]}",
                    event_date=received_at,
                ))
                timeline_events += 1

            elif app and intent == "rejection":
                if app.stage != StageEnum.REJECTED:
                    app.stage = StageEnum.REJECTED
                    app.updated_at = datetime.now(timezone.utc)
                    db.add(app)
                    stage_updates += 1

                db.add(TimelineEvent(
                    application_id=application_id,
                    event_type=EventTypeEnum.REJECTION,
                    title=f"Application rejected",
                    description=f"Auto-detected from email: {subject[:100]}",
                    event_date=received_at,
                ))
                timeline_events += 1

            elif app and intent == "offer":
                if app.stage != StageEnum.OFFER:
                    app.stage = StageEnum.OFFER
                    app.updated_at = datetime.now(timezone.utc)
                    db.add(app)
                    stage_updates += 1

                db.add(TimelineEvent(
                    application_id=application_id,
                    event_type=EventTypeEnum.OFFER,
                    title=f"Offer received",
                    description=f"Auto-detected from email: {subject[:100]}",
                    event_date=received_at,
                ))
                timeline_events += 1

        # Store the email
        email_msg = EmailMessage(
            user_id=user_id,
            application_id=application_id,
            gmail_message_id=msg_id,
            thread_id=thread_id,
            subject=subject,
            from_address=from_address,
            snippet=snippet,
            body_preview=snippet[:500] if snippet else None,
            received_at=received_at,
            is_auto_linked=is_auto_linked,
        )
        db.add(email_msg)
        new_count += 1

    # Update last sync time
    account.last_sync_at = datetime.now(timezone.utc)
    db.add(account)

    return {
        "new_emails": new_count,
        "auto_linked": auto_linked,
        "auto_created": auto_created,
        "stage_updates": stage_updates,
        "timeline_events": timeline_events,
    }


async def get_gmail_status(user_id: uuid.UUID, db: AsyncSession) -> dict:
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()

    if not account or not account.is_active:
        return {"connected": False, "email_address": None, "last_sync_at": None, "total_emails": 0}

    count_result = await db.execute(
        select(func.count()).where(EmailMessage.user_id == user_id)
    )
    total = count_result.scalar_one()

    return {
        "connected": True,
        "email_address": account.email_address,
        "last_sync_at": account.last_sync_at,
        "total_emails": total,
    }
