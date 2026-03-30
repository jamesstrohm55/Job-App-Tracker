import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

TZDateTime = DateTime(timezone=True)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmailAccount(SQLModel, table=True):
    __tablename__ = "email_accounts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True)
    email_address: str
    encrypted_refresh_token: bytes
    last_sync_at: datetime | None = Field(default=None, sa_type=TZDateTime)
    last_history_id: str | None = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
    updated_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
