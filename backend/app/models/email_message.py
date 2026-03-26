import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
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
    snippet: str | None = None
    body_preview: str | None = None
    received_at: datetime = Field(index=True, sa_type=TZDateTime)
    is_auto_linked: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
    updated_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
