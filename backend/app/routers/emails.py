import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.application import Application
from app.models.email_message import EmailMessage
from app.models.user import User
from app.schemas.email import (
    EmailLinkRequest,
    EmailListResponse,
    EmailMessageResponse,
    EmailSuggestion,
    EmailSuggestionsResponse,
    EmailSyncResponse,
    GmailConnectRequest,
    GmailStatusResponse,
)
from app.services.email_parser import classify_email
from app.services.gmail_service import (
    connect_gmail,
    disconnect_gmail,
    get_gmail_auth_url,
    get_gmail_status,
    sync_emails,
)

router = APIRouter(prefix="/emails", tags=["emails"])


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gmail not connected"
        )


@router.get("/gmail/status", response_model=GmailStatusResponse)
async def gmail_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_gmail_status(user.id, db)


@router.post("/sync", response_model=EmailSyncResponse)
async def sync(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await sync_emails(user.id, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
    items = list(result.scalars().all())

    return EmailListResponse(items=items, total=total)


@router.get("/suggestions", response_model=EmailSuggestionsResponse)
async def suggestions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get unlinked emails
    result = await db.execute(
        select(EmailMessage)
        .where(
            EmailMessage.user_id == user.id,
            EmailMessage.application_id.is_(None),
        )
        .order_by(EmailMessage.received_at.desc())
        .limit(50)
    )
    unlinked = result.scalars().all()

    # Get tracked companies
    app_result = await db.execute(
        select(Application.company).where(
            Application.user_id == user.id,
            Application.is_archived == False,  # noqa: E712
        )
    )
    tracked_companies = [r[0] for r in app_result.all()]

    suggestion_list = []
    for email in unlinked:
        classification = classify_email(
            email.from_address, email.subject, email.snippet or "", tracked_companies
        )
        if classification["is_job_related"]:
            suggestion_list.append(
                EmailSuggestion(
                    email=email,
                    matched_company=classification["matched_company"],
                    confidence=classification["confidence"] or "low",
                )
            )

    return EmailSuggestionsResponse(suggestions=suggestion_list)


@router.get("/{email_id}", response_model=EmailMessageResponse)
async def get_email(
    email_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == email_id, EmailMessage.user_id == user.id
        )
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
    result = await db.execute(
        select(EmailMessage).where(
            EmailMessage.id == email_id, EmailMessage.user_id == user.id
        )
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    # Verify the application belongs to the user
    app_result = await db.execute(
        select(Application).where(
            Application.id == body.application_id, Application.user_id == user.id
        )
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
        select(EmailMessage).where(
            EmailMessage.id == email_id, EmailMessage.user_id == user.id
        )
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")

    email.application_id = None
    email.is_auto_linked = False
    db.add(email)
    return {"ok": True}
