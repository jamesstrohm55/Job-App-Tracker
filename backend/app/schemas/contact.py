import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str | None = None
    phone: str | None = None
    role: str | None = None
    company: str | None = None
    linkedin_url: str | None = None
    notes: str | None = None


class ContactUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    role: str | None = None
    company: str | None = None
    linkedin_url: str | None = None
    notes: str | None = None


class ContactResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: str | None
    phone: str | None
    role: str | None
    company: str | None
    linkedin_url: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
