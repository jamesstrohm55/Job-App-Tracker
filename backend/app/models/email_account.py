import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class EmailAccount(SQLModel, table=True):
    __tablename__ = "email_accounts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True)
    email_address: str
    encrypted_refresh_token: bytes
    last_sync_at: datetime | None = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
