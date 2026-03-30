"""Gmail API integration: OAuth, sync, email client, compose, reply."""

import base64
import uuid
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
from app.services.email_parser import classify_email, REJECTION_KEYWORDS
from app.services.encryption import decrypt_token, encrypt_token
from app.utils.gmail_queries import build_job_email_query

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
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
    """Fetch new emails from Gmail, classify them, and store. No auto-creating apps."""
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)
    query = build_job_email_query(after_date=account.last_sync_at)

    messages_response = service.users().messages().list(
        userId="me", q=query, maxResults=100
    ).execute()

    message_ids = [m["id"] for m in messages_response.get("messages", [])]

    if not message_ids:
        account.last_sync_at = datetime.now(timezone.utc)
        db.add(account)
        return {"new_emails": 0, "auto_linked": 0}

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

    for msg_id in message_ids:
        # Skip already stored
        existing = await db.execute(
            select(EmailMessage).where(EmailMessage.gmail_message_id == msg_id)
        )
        if existing.scalar_one_or_none():
            continue

        # Fetch metadata
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

        # Classify
        classification = classify_email(from_address, subject, snippet, tracked_companies)
        if not classification["is_job_related"]:
            continue

        intent = classification.get("intent")

        # For application_confirmed emails, fetch full body to check for hidden rejections
        if intent == "application_confirmed":
            try:
                full_msg = service.users().messages().get(
                    userId="me", id=msg_id, format="full"
                ).execute()
                raw_html = _extract_raw_html(full_msg.get("payload", {}))
                if raw_html:
                    clean = _strip_html(raw_html)
                    if any(kw in clean.lower() for kw in REJECTION_KEYWORDS):
                        intent = "rejection"
            except Exception:
                pass

        # Try to link to existing application (exact match only)
        application_id = None
        is_auto_linked = False
        matched = classification.get("matched_company")
        if matched and matched in company_map:
            application_id = company_map[matched]
            is_auto_linked = True
            auto_linked += 1
        else:
            # Try extracted company exact match
            extracted = classification.get("extracted_company")
            if extracted and extracted in company_map:
                application_id = company_map[extracted]
                is_auto_linked = True
                auto_linked += 1

        # Store email with classification
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
            intent=intent,
            extracted_company=classification.get("extracted_company"),
            extracted_position=classification.get("extracted_position"),
        )
        db.add(email_msg)
        new_count += 1

    account.last_sync_at = datetime.now(timezone.utc)
    db.add(account)

    return {"new_emails": new_count, "auto_linked": auto_linked}


async def sync_all_emails(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Sync ALL emails from last 15 days. Classify and auto-create apps from confirmations."""
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    # Fetch all emails from last 15 days
    query = "newer_than:15d"
    all_message_ids = []
    page_token = None

    while True:
        resp = service.users().messages().list(
            userId="me", q=query, maxResults=500, pageToken=page_token
        ).execute()
        all_message_ids.extend(m["id"] for m in resp.get("messages", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

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

    for msg_id in all_message_ids:
        # Skip already stored
        existing = await db.execute(
            select(EmailMessage).where(EmailMessage.gmail_message_id == msg_id)
        )
        if existing.scalar_one_or_none():
            continue

        # Fetch metadata only (fast)
        msg = service.users().messages().get(
            userId="me", id=msg_id, format="metadata",
            metadataHeaders=["Subject", "From", "To", "Date"]
        ).execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        subject = headers.get("Subject", "(no subject)")
        from_address = headers.get("From", "")
        to_address = headers.get("To", "")
        snippet = msg.get("snippet", "")
        thread_id = msg.get("threadId", "")
        label_ids = msg.get("labelIds", [])
        internal_date_ms = int(msg.get("internalDate", "0"))
        received_at = datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc)

        # Determine label
        label = "inbox"
        if "SENT" in label_ids:
            label = "sent"
        elif "TRASH" in label_ids:
            label = "trash"
        elif "DRAFT" in label_ids:
            label = "draft"

        is_read = "UNREAD" not in label_ids

        # Classify
        classification = classify_email(from_address, subject, snippet, tracked_companies)
        is_job = classification["is_job_related"]
        intent = classification.get("intent") if is_job else None

        # Rejection override for application_confirmed emails
        if intent == "application_confirmed":
            # Quick check snippet for rejection keywords
            if any(kw in snippet.lower() for kw in REJECTION_KEYWORDS):
                intent = "rejection"

        # Try to link to existing application
        application_id = None
        is_auto_linked = False
        if is_job:
            matched = classification.get("matched_company")
            if matched and matched in company_map:
                application_id = company_map[matched]
                is_auto_linked = True
                auto_linked += 1
            else:
                extracted = classification.get("extracted_company")
                if extracted and extracted in company_map:
                    application_id = company_map[extracted]
                    is_auto_linked = True
                    auto_linked += 1

        # Auto-create application from clear confirmations
        if (
            is_job
            and intent == "application_confirmed"
            and not application_id
            and label == "inbox"
        ):
            company_name = classification.get("extracted_company")
            if company_name and company_name not in company_map:
                order_result = await db.execute(
                    select(func.coalesce(func.max(Application.stage_order), -1)).where(
                        Application.user_id == user_id,
                        Application.stage == StageEnum.APPLIED,
                    )
                )
                new_app = Application(
                    user_id=user_id,
                    company=company_name,
                    position=classification.get("extracted_position") or "Unknown Position",
                    stage=StageEnum.APPLIED,
                    stage_order=order_result.scalar_one() + 1,
                    applied_date=received_at.date(),
                )
                db.add(new_app)
                await db.flush()

                application_id = new_app.id
                is_auto_linked = True
                company_map[company_name] = new_app.id
                tracked_companies.append(company_name)
                auto_created += 1

                db.add(TimelineEvent(
                    application_id=new_app.id,
                    event_type=EventTypeEnum.APPLIED,
                    title=f"Applied to {company_name}",
                    description=f"Auto-detected from email: {subject[:100]}",
                    event_date=received_at,
                ))

        # Store email
        email_msg = EmailMessage(
            user_id=user_id,
            application_id=application_id,
            gmail_message_id=msg_id,
            thread_id=thread_id,
            subject=subject,
            from_address=from_address,
            to_address=to_address,
            snippet=snippet,
            body_preview=snippet[:500] if snippet else None,
            received_at=received_at,
            is_auto_linked=is_auto_linked,
            label=label,
            is_read=is_read,
            is_job_related=is_job,
            intent=intent,
            extracted_company=classification.get("extracted_company") if is_job else None,
            extracted_position=classification.get("extracted_position") if is_job else None,
        )
        db.add(email_msg)
        new_count += 1

    account.last_sync_at = datetime.now(timezone.utc)
    db.add(account)

    return {"new_emails": new_count, "auto_linked": auto_linked, "auto_created": auto_created}


async def fetch_email_body(user_id: uuid.UUID, email_id: uuid.UUID, db: AsyncSession) -> dict:
    """Fetch full email body. Returns cached version if available."""
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == email_id, EmailMessage.user_id == user_id
        )
    )
    email = result.scalar_one_or_none()
    if not email:
        raise ValueError("Email not found")

    # Return cached body if available
    if email.body_html or email.body_text:
        return {"body_html": email.body_html, "body_text": email.body_text}

    # Fetch from Gmail
    account_result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = account_result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    msg = service.users().messages().get(
        userId="me", id=email.gmail_message_id, format="full"
    ).execute()

    raw_html = _extract_raw_html(msg.get("payload", {}))
    body_text = _extract_body_text(msg.get("payload", {}))

    # Cache in DB
    email.body_html = raw_html
    email.body_text = body_text or _strip_html(raw_html) if raw_html else None
    db.add(email)

    return {"body_html": email.body_html, "body_text": email.body_text}


async def send_email(
    user_id: uuid.UUID, to: str, subject: str, body_html: str, db: AsyncSession
) -> EmailMessage:
    """Compose and send an email via Gmail."""
    account_result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = account_result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    # Build MIME message
    message = MIMEMultipart("alternative")
    message["to"] = to
    message["from"] = account.email_address
    message["subject"] = subject
    message.attach(MIMEText(body_html, "html"))

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()

    # Store locally
    email_msg = EmailMessage(
        user_id=user_id,
        gmail_message_id=sent["id"],
        thread_id=sent.get("threadId", ""),
        subject=subject,
        from_address=account.email_address,
        to_address=to,
        snippet=body_html[:200],
        body_html=body_html,
        received_at=datetime.now(timezone.utc),
        label="sent",
        is_read=True,
    )
    db.add(email_msg)
    await db.flush()
    await db.refresh(email_msg)
    return email_msg


async def reply_to_email(
    user_id: uuid.UUID, email_id: uuid.UUID, body_html: str, db: AsyncSession
) -> EmailMessage:
    """Reply to an email."""
    # Get original email
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == email_id, EmailMessage.user_id == user_id
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise ValueError("Email not found")

    account_result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = account_result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    # Build reply
    reply_to = original.from_address
    subject = original.subject
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    message = MIMEMultipart("alternative")
    message["to"] = reply_to
    message["from"] = account.email_address
    message["subject"] = subject
    message["In-Reply-To"] = original.gmail_message_id
    message["References"] = original.gmail_message_id
    message.attach(MIMEText(body_html, "html"))

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    sent = service.users().messages().send(
        userId="me", body={"raw": raw, "threadId": original.thread_id}
    ).execute()

    # Store locally
    email_msg = EmailMessage(
        user_id=user_id,
        gmail_message_id=sent["id"],
        thread_id=original.thread_id,
        subject=subject,
        from_address=account.email_address,
        to_address=reply_to,
        snippet=body_html[:200],
        body_html=body_html,
        received_at=datetime.now(timezone.utc),
        label="sent",
        is_read=True,
    )
    db.add(email_msg)
    await db.flush()
    await db.refresh(email_msg)
    return email_msg


async def trash_single_email(user_id: uuid.UUID, email_id: uuid.UUID, db: AsyncSession) -> bool:
    """Trash a single email in Gmail and update local record."""
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == email_id, EmailMessage.user_id == user_id
        )
    )
    email = result.scalar_one_or_none()
    if not email:
        return False

    account_result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = account_result.scalar_one_or_none()
    if account:
        refresh_token = decrypt_token(account.encrypted_refresh_token)
        service = _build_gmail_client(refresh_token)
        try:
            service.users().messages().trash(userId="me", id=email.gmail_message_id).execute()
        except Exception:
            pass

    email.label = "trash"
    db.add(email)
    return True


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


async def search_gmail(user_id: uuid.UUID, query: str, db: AsyncSession) -> list[dict]:
    """Search Gmail with a custom query and return results (without storing them)."""
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    messages_response = service.users().messages().list(
        userId="me", q=query, maxResults=20
    ).execute()

    message_ids = [m["id"] for m in messages_response.get("messages", [])]
    results = []

    for msg_id in message_ids:
        msg = service.users().messages().get(
            userId="me", id=msg_id, format="metadata",
            metadataHeaders=["Subject", "From", "Date"]
        ).execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        internal_date_ms = int(msg.get("internalDate", "0"))

        # Check if already stored
        existing = await db.execute(
            select(EmailMessage).where(EmailMessage.gmail_message_id == msg_id)
        )
        is_stored = existing.scalar_one_or_none() is not None

        results.append({
            "gmail_message_id": msg_id,
            "subject": headers.get("Subject", "(no subject)"),
            "from_address": headers.get("From", ""),
            "snippet": msg.get("snippet", ""),
            "received_at": datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc).isoformat(),
            "is_stored": is_stored,
        })

    return results


async def import_gmail_email(
    user_id: uuid.UUID, gmail_message_id: str, application_id: uuid.UUID | None, db: AsyncSession
) -> EmailMessage:
    """Import a specific Gmail email into the tracker and optionally link it."""
    # Check if already stored
    existing = await db.execute(
        select(EmailMessage).where(EmailMessage.gmail_message_id == gmail_message_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("Email already imported")

    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_active == True  # noqa: E712
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("Gmail not connected")

    refresh_token = decrypt_token(account.encrypted_refresh_token)
    service = _build_gmail_client(refresh_token)

    msg = service.users().messages().get(
        userId="me", id=gmail_message_id, format="metadata",
        metadataHeaders=["Subject", "From", "Date"]
    ).execute()

    headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
    internal_date_ms = int(msg.get("internalDate", "0"))

    email_msg = EmailMessage(
        user_id=user_id,
        application_id=application_id,
        gmail_message_id=gmail_message_id,
        thread_id=msg.get("threadId", ""),
        subject=headers.get("Subject", "(no subject)"),
        from_address=headers.get("From", ""),
        snippet=msg.get("snippet", ""),
        body_preview=msg.get("snippet", "")[:500],
        received_at=datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc),
        is_auto_linked=False,
    )
    db.add(email_msg)
    await db.flush()
    await db.refresh(email_msg)
    return email_msg


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
