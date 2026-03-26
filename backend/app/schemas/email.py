import uuid
from datetime import datetime

from pydantic import BaseModel


class GmailConnectRequest(BaseModel):
    code: str


class EmailSyncResponse(BaseModel):
    new_emails: int
    auto_linked: int
    suggestions: int


class EmailMessageResponse(BaseModel):
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
