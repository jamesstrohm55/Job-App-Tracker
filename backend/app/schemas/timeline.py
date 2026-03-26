import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.timeline_event import EventTypeEnum


class TimelineEventCreate(BaseModel):
    event_type: EventTypeEnum
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    event_date: datetime


class TimelineEventUpdate(BaseModel):
    event_type: EventTypeEnum | None = None
    title: str | None = None
    description: str | None = None
    event_date: datetime | None = None


class TimelineEventResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    application_id: uuid.UUID
    event_type: EventTypeEnum
    title: str
    description: str | None
    event_date: datetime
    created_at: datetime
    updated_at: datetime
