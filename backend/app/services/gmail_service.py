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
from app.services.email_parser import classify_email, match_company
from app.services.encryption import decrypt_token, encrypt_token
from app.utils.gmail_queries import build_job_email_query

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


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


def _strip_html(html: str) -> str:
    """Convert HTML to readable plain text."""
    import re as _re
    # Remove style and script blocks entirely
    text = _re.sub(r"<style[^>]*>.*?</style>", "", html, flags=_re.DOTALL | _re.IGNORECASE)
    text = _re.sub(r"<script[^>]*>.*?</script>", "", text, flags=_re.DOTALL | _re.IGNORECASE)
    # Replace <br>, <p>, <div>, <tr>, <li> with newlines
    text = _re.sub(r"<br\s*/?>", "\n", text, flags=_re.IGNORECASE)
    text = _re.sub(r"</(p|div|tr|li|h[1-6])>", "\n", text, flags=_re.IGNORECASE)
    # Strip remaining tags
    text = _re.sub(r"<[^>]+>", " ", text)
    # Decode HTML entities
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    # Collapse whitespace but preserve newlines
    lines = [_re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(line for line in lines if line)
    return text.strip()


def _extract_body_text(payload: dict) -> str | None:
    """Extract plain text body from a Gmail message payload."""
    import base64

    def _get_text_from_parts(parts: list[dict]) -> str | None:
        for part in parts:
            mime = part.get("mimeType", "")
            if mime == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            if mime.startswith("multipart/"):
                result = _get_text_from_parts(part.get("parts", []))
                if result:
                    return result
        # Fallback: try text/html with proper stripping
        for part in parts:
            if part.get("mimeType") == "text/html":
                data = part.get("body", {}).get("data", "")
                if data:
                    html = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                    return _strip_html(html)
        return None

    # Simple message (no parts)
    if payload.get("mimeType", "").startswith("text/"):
        data = payload.get("body", {}).get("data", "")
        if data:
            text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            if payload.get("mimeType") == "text/html":
                return _strip_html(text)
            return text

    # Multipart message
    parts = payload.get("parts", [])
    if parts:
        return _get_text_from_parts(parts)

    return None


def _extract_raw_html(payload: dict) -> str | None:
    """Extract raw HTML body from a Gmail message payload (for LLM consumption)."""
    import base64

    def _find_html(parts: list[dict]) -> str | None:
        for part in parts:
            if part.get("mimeType") == "text/html":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            if part.get("mimeType", "").startswith("multipart/"):
                result = _find_html(part.get("parts", []))
                if result:
                    return result
        return None

    if payload.get("mimeType") == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    parts = payload.get("parts", [])
    if parts:
        return _find_html(parts)
    return None


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

    # ── PASS 1: Fetch metadata + rules pre-filter (fast, no LLM) ──
    email_batch: list[dict] = []

    for msg_id in message_ids:
        existing = await db.execute(
            select(EmailMessage).where(EmailMessage.gmail_message_id == msg_id)
        )
        if existing.scalar_one_or_none():
            continue

        msg = service.users().messages().get(
            userId="me", id=msg_id, format="metadata",
            metadataHeaders=["Subject", "From", "Date"]
        ).execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "(no subject)")
        from_address = headers.get("From", "")
        snippet = msg.get("snippet", "")
        thread_id = msg.get("threadId", "")
        internal_date_ms = int(msg.get("internalDate", "0"))
        received_at = datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc)

        rules_result = classify_email(from_address, subject, snippet, tracked_companies)
        if not rules_result["is_job_related"]:
            continue

        rules_intent = rules_result.get("intent")

        entry = {
            "msg_id": msg_id, "subject": subject, "from_address": from_address,
            "snippet": snippet, "thread_id": thread_id, "received_at": received_at,
            "rules_result": rules_result, "rules_intent": rules_intent,
            "llm_snippet": snippet,
        }

        # For interviews and application_confirmed, fetch full body
        # (interviews need meeting details, app_confirmed might be rejections in disguise)
        if rules_intent in ("interview", "application_confirmed"):
            try:
                full_msg = service.users().messages().get(
                    userId="me", id=msg_id, format="full"
                ).execute()
                # Get clean text for rejection override
                body_text = _extract_body_text(full_msg.get("payload", {}))
                if body_text:
                    entry["full_body"] = body_text

                # For LLM, strip HTML fully and send clean text
                raw_html = _extract_raw_html(full_msg.get("payload", {}))
                if raw_html:
                    clean = _strip_html(raw_html)
                    entry["llm_snippet"] = clean[:3000]
                    entry["full_body"] = clean  # Override with better extraction
                    print(f"[SYNC:body] fetched {len(clean)} chars clean for: {subject[:60]}")
                elif body_text:
                    entry["llm_snippet"] = body_text[:2000]
                    print(f"[SYNC:body] fetched {len(body_text)} chars text for: {subject[:60]}")
                else:
                    print(f"[SYNC:body] EMPTY body for: {subject[:60]}")
            except Exception as e:
                print(f"[SYNC] Failed to fetch full body: {e}")

        email_batch.append(entry)

    # ── PASS 2: Process all emails (rules only + rejection override) ──
    for entry in email_batch:
        subject = entry["subject"]
        from_address = entry["from_address"]
        snippet = entry["snippet"]
        msg_id = entry["msg_id"]
        thread_id = entry["thread_id"]
        received_at = entry["received_at"]
        rules_result = entry["rules_result"]
        rules_intent = entry["rules_intent"]

        classification = rules_result
        source = "rules"

        intent = classification.get("intent")

        # Safety net: check ALL available text for rejection language.
        # LinkedIn HTML bodies often have the rejection text buried deep,
        # but the Gmail snippet (which Google extracts) usually has it.
        from app.services.email_parser import REJECTION_KEYWORDS
        texts_to_check = [
            snippet,  # Gmail's own text extraction — most reliable
            entry.get("full_body") or "",
            entry.get("llm_snippet") or "",
        ]
        combined_text = " ".join(texts_to_check).lower()
        if intent == "application_confirmed":
            print(f"[DEBUG:override] checking {len(combined_text)} chars for rejection keywords | snippet={snippet[:100]} | has_body={bool(entry.get('full_body'))}")
        if intent != "rejection" and any(kw in combined_text for kw in REJECTION_KEYWORDS):
            matched_kw = next(kw for kw in REJECTION_KEYWORDS if kw in combined_text)
            print(f"[SYNC:override] rejection detected via '{matched_kw}' for: {subject[:60]}")
            intent = "rejection"
            classification["intent"] = "rejection"
            source = f"{source}+override"

        print(f"[SYNC:{source}] intent={intent} | company={classification.get('extracted_company')} | matched={classification.get('matched_company')} | subject={subject[:80]}")
        application_id = None
        is_auto_linked = False

        # Try to match to existing application
        matched_company = classification.get("matched_company")
        if matched_company and matched_company in company_map:
            application_id = company_map[matched_company]
            is_auto_linked = True
            auto_linked += 1

        # Auto-create application if no match exists
        # Works for application_confirmed AND interview (you might get an interview
        # invite without a prior "application confirmed" email)
        if not application_id and intent in ("application_confirmed", "interview", "rejection", "offer"):
            company_name = classification.get("extracted_company")
            if company_name:
                # Try to match extracted company to existing apps
                if company_name in company_map:
                    application_id = company_map[company_name]
                    is_auto_linked = True
                    auto_linked += 1
                else:
                    # Fuzzy match
                    for comp_name, comp_id in company_map.items():
                        if fuzz.ratio(company_name.lower(), comp_name.lower()) >= 85:
                            application_id = comp_id
                            is_auto_linked = True
                            auto_linked += 1
                            break

                # Still no match — create a new application
                if not application_id:
                    position = classification.get("extracted_position") or "Unknown Position"
                    initial_stage = StageEnum.INTERVIEW if intent == "interview" else StageEnum.APPLIED

                    order_result = await db.execute(
                        select(func.coalesce(func.max(Application.stage_order), -1)).where(
                            Application.user_id == user_id,
                            Application.stage == initial_stage,
                        )
                    )
                    next_order = order_result.scalar_one() + 1

                    new_app = Application(
                        user_id=user_id,
                        company=company_name,
                        position=position,
                        stage=initial_stage,
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

                    # Add initial timeline event
                    db.add(TimelineEvent(
                        application_id=new_app.id,
                        event_type=EventTypeEnum.APPLIED,
                        title=f"Applied to {company_name}",
                        description=f"Auto-detected from email: {subject[:100]}",
                        event_date=received_at,
                    ))
                    timeline_events += 1

        # Auto-update stage and add timeline events for existing applications
        if application_id and intent in ("interview", "rejection", "offer"):
            app_result = await db.execute(
                select(Application).where(Application.id == application_id)
            )
            app = app_result.scalar_one_or_none()

            if app and intent == "interview":
                # Move to interview stage if not already past it
                if app.stage in (StageEnum.SAVED, StageEnum.APPLIED, StageEnum.SCREENING):
                    app.stage = StageEnum.INTERVIEW
                    app.updated_at = datetime.now(timezone.utc)
                    db.add(app)
                    stage_updates += 1

                # Build rich interview description from LLM details
                interview_details = classification.get("interview_details") or {}
                desc_parts = [f"Auto-detected from email: {subject[:100]}"]

                interview_type = interview_details.get("type")
                interview_date = interview_details.get("date")
                interview_time = interview_details.get("time")
                interview_tz = interview_details.get("timezone")
                participants = interview_details.get("participants") or []
                meeting_link = interview_details.get("meeting_link")
                notes = interview_details.get("notes")

                if interview_date:
                    time_str = f"{interview_date}"
                    if interview_time:
                        time_str += f" at {interview_time}"
                    if interview_tz:
                        time_str += f" ({interview_tz})"
                    desc_parts.append(f"Scheduled: {time_str}")

                if participants:
                    desc_parts.append(f"Participants: {', '.join(participants)}")

                if meeting_link:
                    desc_parts.append(f"Meeting link: {meeting_link}")

                if notes:
                    desc_parts.append(f"Notes: {notes}")

                # Map interview type to event type
                type_map = {
                    "phone_screen": EventTypeEnum.PHONE_SCREEN,
                    "technical": EventTypeEnum.TECHNICAL_INTERVIEW,
                    "behavioral": EventTypeEnum.BEHAVIORAL_INTERVIEW,
                    "onsite": EventTypeEnum.ONSITE,
                    "assessment": EventTypeEnum.TAKE_HOME,
                }
                event_type = type_map.get(interview_type or "", EventTypeEnum.TECHNICAL_INTERVIEW)

                title = "Interview scheduled"
                if interview_type:
                    type_labels = {
                        "phone_screen": "Phone Screen",
                        "technical": "Technical Interview",
                        "behavioral": "Behavioral Interview",
                        "onsite": "Onsite Interview",
                        "assessment": "Assessment/Challenge",
                        "other": "Interview",
                    }
                    title = f"{type_labels.get(interview_type, 'Interview')} scheduled"

                db.add(TimelineEvent(
                    application_id=application_id,
                    event_type=event_type,
                    title=title,
                    description="\n".join(desc_parts),
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
                    title="Application rejected",
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
                    title="Offer received",
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
        "llm_failures": 0,
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


async def trash_rejection_emails(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Move all rejection-linked emails to Gmail trash to free up space."""
    # Get Gmail account
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    # Get emails linked to rejected applications
    result = await db.execute(
        select(EmailMessage)
        .join(Application, Application.id == EmailMessage.application_id)
        .where(
            EmailMessage.user_id == user_id,
            Application.stage == StageEnum.REJECTED,
            EmailMessage.application_id.isnot(None),
        )
    )
    emails = result.scalars().all()

    if not emails:
        return {"trashed": 0}

    # Build Gmail client
    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    trashed = 0
    for email in emails:
        try:
            service.users().messages().trash(userId="me", id=email.gmail_message_id).execute()
            trashed += 1
        except Exception as e:
            print(f"[TRASH] Failed to trash {email.gmail_message_id}: {e}")

    return {"trashed": trashed}


async def trash_application_emails(
    user_id: uuid.UUID, application_id: uuid.UUID, db: AsyncSession
) -> dict:
    """Move all emails linked to a specific application to Gmail trash."""
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.user_id == user_id,
            EmailMessage.application_id == application_id,
        )
    )
    emails = result.scalars().all()

    if not emails:
        return {"trashed": 0}

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    trashed = 0
    for email in emails:
        try:
            service.users().messages().trash(userId="me", id=email.gmail_message_id).execute()
            trashed += 1
        except Exception as e:
            print(f"[TRASH] Failed to trash {email.gmail_message_id}: {e}")

    return {"trashed": trashed}
