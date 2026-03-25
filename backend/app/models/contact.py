import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Contact(SQLModel, table=True):
    __tablename__ = "contacts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    name: str
    email: str | None = None
    phone: str | None = None
    role: str | None = None
    company: str | None = None
    linkedin_url: str | None = None
    notes: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
