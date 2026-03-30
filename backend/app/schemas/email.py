import uuid
from datetime import datetime

from pydantic import BaseModel


class GmailConnectRequest(BaseModel):
    code: str


class EmailSyncResponse(BaseModel):
    new_emails: int
    auto_linked: int
    sync_duration_seconds: float = 0.0


class EmailMessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    application_id: uuid.UUID | None
    gmail_message_id: str
    thread_id: str
    subject: str
    from_address: str
    snippet: str | None
    body_preview: str | None
    received_at: datetime
    is_auto_linked: bool
    intent: str | None = None
    extracted_company: str | None = None
    extracted_position: str | None = None
    is_dismissed: bool = False
    created_at: datetime
    updated_at: datetime


class EmailListResponse(BaseModel):
    items: list[EmailMessageResponse]
    total: int


class EmailLinkRequest(BaseModel):
    application_id: uuid.UUID


class EmailSuggestion(BaseModel):
    email: EmailMessageResponse
    matched_company: str | None
    confidence: str


class EmailSuggestionsResponse(BaseModel):
    suggestions: list[EmailSuggestion]


class GmailStatusResponse(BaseModel):
    connected: bool
    email_address: str | None = None
    last_sync_at: datetime | None = None
    total_emails: int = 0


class PendingAction(BaseModel):
    type: str  # "new_meeting" | "past_interview" | "rejection_detected"
    # Email fields (for new_meeting and rejection_detected)
    email_id: str | None = None
    gmail_message_id: str | None = None
    subject: str | None = None
    from_address: str | None = None
    snippet: str | None = None
    received_at: datetime | None = None
    extracted_company: str | None = None
    # Application fields (for past_interview and rejection_detected)
    application_id: str | None = None
    company: str | None = None
    position: str | None = None
    # Past interview specific
    interview_title: str | None = None
    interview_date: str | None = None


class PendingActionsResponse(BaseModel):
    actions: list[PendingAction]


class ConfirmRejectionRequest(BaseModel):
    email_id: uuid.UUID
    application_id: uuid.UUID
