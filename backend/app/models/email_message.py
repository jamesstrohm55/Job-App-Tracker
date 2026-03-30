import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Text
from sqlmodel import Field, SQLModel

TZDateTime = DateTime(timezone=True)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmailMessage(SQLModel, table=True):
    __tablename__ = "email_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    application_id: uuid.UUID | None = Field(default=None, foreign_key="applications.id", index=True)
    gmail_message_id: str = Field(unique=True, index=True)
    thread_id: str = Field(index=True)
    subject: str
    from_address: str
    to_address: str | None = None
    snippet: str | None = None
    body_preview: str | None = None
    body_html: str | None = Field(default=None, sa_type=Text)
    body_text: str | None = Field(default=None, sa_type=Text)
    received_at: datetime = Field(index=True, sa_type=TZDateTime)
    is_auto_linked: bool = Field(default=False)
    label: str = Field(default="inbox")
    is_read: bool = Field(default=False)
    is_job_related: bool = Field(default=False)
    intent: str | None = None
    extracted_company: str | None = None
    extracted_position: str | None = None
    is_dismissed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
    updated_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
