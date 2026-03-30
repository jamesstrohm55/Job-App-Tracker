import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.application import Application, StageEnum
from app.models.email_account import EmailAccount
from app.models.email_message import EmailMessage
from app.models.timeline_event import EventTypeEnum, TimelineEvent
from app.models.user import User
from app.schemas.email import (
    ConfirmRejectionRequest,
    EmailLinkRequest,
    EmailListResponse,
    EmailMessageResponse,
    EmailSyncResponse,
    GmailConnectRequest,
    GmailStatusResponse,
    PendingAction,
    PendingActionsResponse,
)
from app.services.gmail_service import (
    connect_gmail,
    disconnect_gmail,
    fetch_email_body,
    get_gmail_auth_url,
    get_gmail_status,
    import_gmail_email,
    reply_to_email,
    search_gmail,
    send_email,
    sync_all_emails,
    sync_emails,
    trash_application_emails,
    trash_rejection_emails,
    trash_single_email,
)

router = APIRouter(prefix="/emails", tags=["emails"])


# ── Gmail OAuth ──

@router.get("/gmail/url")
async def gmail_auth_url():
    return {"url": get_gmail_auth_url()}


@router.post("/connect-gmail")
async def connect(
    body: GmailConnectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        account = await connect_gmail(body.code, user.id, db)
        return {"ok": True, "email_address": account.email_address}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gmail connection failed: {e}",
        )


@router.delete("/disconnect-gmail", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await disconnect_gmail(user.id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gmail not connected")


@router.get("/gmail/status", response_model=GmailStatusResponse)
async def gmail_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_gmail_status(user.id, db)


# ── Sync ──

@router.post("/sync", response_model=EmailSyncResponse)
async def sync(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import time
    start = time.monotonic()
    try:
        result = await sync_emails(user.id, db)
        result["sync_duration_seconds"] = round(time.monotonic() - start, 2)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sync-all")
async def sync_all(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync ALL emails from last 15 days."""
    import time
    start = time.monotonic()
    try:
        result = await sync_all_emails(user.id, db)
        result["sync_duration_seconds"] = round(time.monotonic() - start, 2)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Email Client ──

@router.get("/inbox")
async def inbox(
    label: str = "inbox",
    category: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Paginated inbox with filters."""
    query = select(EmailMessage).where(EmailMessage.user_id == user.id)

    if label == "all":
        pass
    elif label == "job":
        query = query.where(EmailMessage.is_job_related == True)  # noqa: E712
    else:
        query = query.where(EmailMessage.label == label)

    if category:
        query = query.where(EmailMessage.intent == category)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            EmailMessage.subject.ilike(pattern)
            | EmailMessage.from_address.ilike(pattern)
            | EmailMessage.snippet.ilike(pattern)
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(EmailMessage.received_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": [
            {
                "id": str(e.id),
                "gmail_message_id": e.gmail_message_id,
                "thread_id": e.thread_id,
                "subject": e.subject,
                "from_address": e.from_address,
                "to_address": e.to_address,
                "snippet": e.snippet,
                "received_at": e.received_at.isoformat() if e.received_at else None,
                "label": e.label,
                "is_read": e.is_read,
                "is_job_related": e.is_job_related,
                "intent": e.intent,
                "extracted_company": e.extracted_company,
                "application_id": str(e.application_id) if e.application_id else None,
            }
            for e in items
        ],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/{email_id}/body")
async def get_body(
    email_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch full email body (lazy loaded and cached)."""
    try:
        return await fetch_email_body(user.id, email_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


class ComposeRequest(BaseModel):
    to: str
    subject: str
    body_html: str


@router.post("/compose")
async def compose(
    body: ComposeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a new email."""
    try:
        email = await send_email(user.id, body.to, body.subject, body.body_html, db)
        return {"ok": True, "id": str(email.id)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class ReplyRequest(BaseModel):
    body_html: str


@router.post("/{email_id}/reply")
async def reply(
    email_id: uuid.UUID,
    body: ReplyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reply to an email."""
    try:
        email = await reply_to_email(user.id, email_id, body.body_html, db)
        return {"ok": True, "id": str(email.id)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{email_id}/trash")
async def trash_email(
    email_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trash a single email."""
    if not await trash_single_email(user.id, email_id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return {"ok": True}


@router.patch("/{email_id}/read")
async def mark_read(
    email_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark email as read."""
    result = await db.execute(
        select(EmailMessage).where(EmailMessage.id == email_id, EmailMessage.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    email.is_read = True
    db.add(email)
    return {"ok": True}


# ── Pending Actions (unified notifications for the board) ──

@router.get("/pending-actions", response_model=PendingActionsResponse)
async def pending_actions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all pending actions: new meetings, past interviews, rejection matches."""
    actions: list[PendingAction] = []
    now = datetime.now(timezone.utc)

    # 1. New meeting emails — unlinked emails with intent=interview, not dismissed
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.user_id == user.id,
            EmailMessage.intent == "interview",
            EmailMessage.application_id.is_(None),
            EmailMessage.is_dismissed == False,  # noqa: E712
        ).order_by(EmailMessage.received_at.desc()).limit(10)
    )
    for email in result.scalars().all():
        actions.append(PendingAction(
            type="new_meeting",
            email_id=str(email.id),
            gmail_message_id=email.gmail_message_id,
            subject=email.subject,
            from_address=email.from_address,
            snippet=email.snippet,
            received_at=email.received_at,
            extracted_company=email.extracted_company,
        ))

    # 2. Past interviews — apps in interview stage with past event dates
    interview_types = [
        EventTypeEnum.PHONE_SCREEN, EventTypeEnum.TECHNICAL_INTERVIEW,
        EventTypeEnum.BEHAVIORAL_INTERVIEW, EventTypeEnum.ONSITE,
        EventTypeEnum.TAKE_HOME,
    ]
    apps_result = await db.execute(
        select(Application).where(
            Application.user_id == user.id,
            Application.stage == StageEnum.INTERVIEW,
            Application.is_archived == False,  # noqa: E712
        )
    )
    for app in apps_result.scalars().all():
        ev_result = await db.execute(
            select(TimelineEvent).where(
                TimelineEvent.application_id == app.id,
                TimelineEvent.event_type.in_(interview_types),
            ).order_by(TimelineEvent.event_date.desc()).limit(1)
        )
        event = ev_result.scalar_one_or_none()
        if event and event.event_date and event.event_date < now:
            actions.append(PendingAction(
                type="past_interview",
                application_id=str(app.id),
                company=app.company,
                position=app.position,
                interview_title=event.title,
                interview_date=event.event_date.isoformat(),
            ))

    # 3. Rejection matches — unlinked rejection emails matching an existing app
    rej_result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.user_id == user.id,
            EmailMessage.intent == "rejection",
            EmailMessage.application_id.is_(None),
            EmailMessage.is_dismissed == False,  # noqa: E712
        ).order_by(EmailMessage.received_at.desc()).limit(10)
    )
    # Get non-rejected apps for matching
    active_apps = await db.execute(
        select(Application).where(
            Application.user_id == user.id,
            Application.is_archived == False,  # noqa: E712
            Application.stage != StageEnum.REJECTED,
        )
    )
    app_companies = {a.company.lower(): a for a in active_apps.scalars().all()}

    for email in rej_result.scalars().all():
        company = email.extracted_company
        if company and company.lower() in app_companies:
            matched_app = app_companies[company.lower()]
            actions.append(PendingAction(
                type="rejection_detected",
                email_id=str(email.id),
                subject=email.subject,
                extracted_company=company,
                application_id=str(matched_app.id),
                company=matched_app.company,
            ))

    return PendingActionsResponse(actions=actions)


# ── User Actions ──

class DismissEmailRequest(BaseModel):
    email_id: uuid.UUID


@router.post("/dismiss")
async def dismiss_email(
    body: DismissEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss an email from pending notifications."""
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == body.email_id, EmailMessage.user_id == user.id
        )
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    email.is_dismissed = True
    db.add(email)
    return {"ok": True}


@router.post("/confirm-rejection")
async def confirm_rejection(
    body: ConfirmRejectionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm a rejection: link email to app, move app to rejected stage."""
    # Get the email
    email_result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == body.email_id, EmailMessage.user_id == user.id
        )
    )
    email = email_result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    # Get the application
    app_result = await db.execute(
        select(Application).where(
            Application.id == body.application_id, Application.user_id == user.id
        )
    )
    app = app_result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Link email
    email.application_id = app.id
    db.add(email)

    # Move to rejected
    if app.stage != StageEnum.REJECTED:
        app.stage = StageEnum.REJECTED
        app.updated_at = datetime.now(timezone.utc)
        db.add(app)

    # Add timeline event
    db.add(TimelineEvent(
        application_id=app.id,
        event_type=EventTypeEnum.REJECTION,
        title="Application rejected",
        description=f"Confirmed from email: {email.subject[:100]}",
        event_date=email.received_at or datetime.now(timezone.utc),
    ))

    return {"ok": True}


class ImportAsInterviewRequest(BaseModel):
    gmail_message_id: str
    company: str
    position: str = "Unknown Position"


@router.post("/import-as-interview")
async def import_as_interview(
    body: ImportAsInterviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a Gmail email as an interview: create/find app, parse details, create timeline event."""
    from app.services.interview_extractor import extract_interview_details

    # Import or find the email
    try:
        email = await import_gmail_email(user.id, body.gmail_message_id, None, db)
    except ValueError:
        result = await db.execute(
            select(EmailMessage).where(EmailMessage.gmail_message_id == body.gmail_message_id)
        )
        email = result.scalar_one_or_none()
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not found")

    # Find or create application
    app_result = await db.execute(
        select(Application).where(
            Application.user_id == user.id,
            Application.company == body.company,
            Application.is_archived == False,  # noqa: E712
        )
    )
    app = app_result.scalar_one_or_none()

    if not app:
        order_result = await db.execute(
            select(func.coalesce(func.max(Application.stage_order), -1)).where(
                Application.user_id == user.id,
                Application.stage == StageEnum.INTERVIEW,
            )
        )
        app = Application(
            user_id=user.id,
            company=body.company,
            position=body.position,
            stage=StageEnum.INTERVIEW,
            stage_order=order_result.scalar_one() + 1,
            applied_date=email.received_at.date() if email.received_at else None,
        )
        db.add(app)
        await db.flush()

    # Move to interview if not already
    if app.stage in (StageEnum.SAVED, StageEnum.APPLIED, StageEnum.SCREENING):
        app.stage = StageEnum.INTERVIEW
        app.updated_at = datetime.now(timezone.utc)
        db.add(app)

    # Link email
    email.application_id = app.id
    email.is_dismissed = True  # Remove from pending notifications
    db.add(email)

    # Fetch full body for interview detail parsing
    body_text = email.snippet or ""
    try:
        account_result = await db.execute(
            select(EmailAccount).where(
                EmailAccount.user_id == user.id, EmailAccount.is_active == True  # noqa: E712
            )
        )
        account = account_result.scalar_one_or_none()
        if account:
            from app.services.encryption import decrypt_token
            from app.services.gmail_service import _build_gmail_client, _extract_raw_html, _strip_html
            refresh_token = decrypt_token(account.encrypted_refresh_token)
            service = _build_gmail_client(refresh_token)
            full_msg = service.users().messages().get(
                userId="me", id=body.gmail_message_id, format="full"
            ).execute()
            raw_html = _extract_raw_html(full_msg.get("payload", {}))
            if raw_html:
                body_text = _strip_html(raw_html)
    except Exception:
        pass

    # Parse interview details
    details = extract_interview_details(email.subject, body_text, email.from_address)

    desc_parts = [f"From email: {email.subject[:100]}"]
    if details.get("date"):
        time_str = details["date"]
        if details.get("time"):
            time_str += f" at {details['time']}"
        if details.get("timezone"):
            time_str += f" ({details['timezone']})"
        desc_parts.append(f"Scheduled: {time_str}")
    if details.get("participants"):
        desc_parts.append(f"Participants: {', '.join(details['participants'])}")
    if details.get("meeting_link"):
        desc_parts.append(f"Meeting link: {details['meeting_link']}")

    type_map = {
        "phone_screen": EventTypeEnum.PHONE_SCREEN,
        "technical": EventTypeEnum.TECHNICAL_INTERVIEW,
        "behavioral": EventTypeEnum.BEHAVIORAL_INTERVIEW,
        "onsite": EventTypeEnum.ONSITE,
        "assessment": EventTypeEnum.TAKE_HOME,
    }
    interview_type = details.get("type") or "other"
    type_labels = {
        "phone_screen": "Phone Screen", "technical": "Technical Interview",
        "behavioral": "Behavioral Interview", "onsite": "Onsite Interview",
        "assessment": "Assessment/Challenge", "other": "Interview",
    }

    # Parse actual interview date from extracted details
    interview_dt = email.received_at  # fallback
    if details.get("date"):
        from dateutil import parser as dateparser
        try:
            date_str = details["date"]
            if details.get("time"):
                date_str += f" {details['time']}"
            interview_dt = dateparser.parse(date_str)
            if interview_dt and interview_dt.tzinfo is None:
                interview_dt = interview_dt.replace(tzinfo=timezone.utc)
        except Exception:
            interview_dt = email.received_at

    db.add(TimelineEvent(
        application_id=app.id,
        event_type=type_map.get(interview_type, EventTypeEnum.TECHNICAL_INTERVIEW),
        title=f"{type_labels.get(interview_type, 'Interview')} scheduled",
        description="\n".join(desc_parts),
        event_date=interview_dt,
    ))

    return {"ok": True, "application_id": str(app.id), "company": app.company}


# ── Trash ──

@router.post("/trash-rejections")
async def trash_rejections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await trash_rejection_emails(user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/trash-application/{app_id}")
async def trash_app_emails(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await trash_application_emails(user.id, app_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Search & Import ──

@router.get("/search")
async def search(
    q: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        results = await search_gmail(user.id, q, db)
        return {"results": results}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


class ImportEmailRequest(BaseModel):
    gmail_message_id: str
    application_id: uuid.UUID | None = None


@router.post("/import", response_model=EmailMessageResponse, status_code=status.HTTP_201_CREATED)
async def import_email(
    body: ImportEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await import_gmail_email(user.id, body.gmail_message_id, body.application_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Email CRUD ──

@router.get("", response_model=EmailListResponse)
async def list_emails(
    linked: bool | None = None,
    application_id: uuid.UUID | None = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(EmailMessage).where(EmailMessage.user_id == user.id)
    if linked is True:
        query = query.where(EmailMessage.application_id.isnot(None))
    elif linked is False:
        query = query.where(EmailMessage.application_id.is_(None))
    if application_id:
        query = query.where(EmailMessage.application_id == application_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    query = query.order_by(EmailMessage.received_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return EmailListResponse(items=list(result.scalars().all()), total=total)


@router.get("/{email_id}", response_model=EmailMessageResponse)
async def get_email(
    email_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmailMessage).where(EmailMessage.id == email_id, EmailMessage.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return email


@router.patch("/{email_id}/link")
async def link_email(
    email_id: uuid.UUID,
    body: EmailLinkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Link an email to an application. Does NOT auto-update stages."""
    result = await db.execute(
        select(EmailMessage).where(EmailMessage.id == email_id, EmailMessage.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    app_result = await db.execute(
        select(Application).where(Application.id == body.application_id, Application.user_id == user.id)
    )
    if not app_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    email.application_id = body.application_id
    email.is_auto_linked = False
    db.add(email)
    return {"ok": True}


@router.patch("/{email_id}/unlink")
async def unlink_email(
    email_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmailMessage).where(EmailMessage.id == email_id, EmailMessage.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    email.application_id = None
    email.is_auto_linked = False
    db.add(email)
    return {"ok": True}
