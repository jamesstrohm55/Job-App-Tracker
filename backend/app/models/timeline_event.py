import enum
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class EventTypeEnum(str, enum.Enum):
    APPLIED = "applied"
    PHONE_SCREEN = "phone_screen"
    TECHNICAL_INTERVIEW = "technical_interview"
    BEHAVIORAL_INTERVIEW = "behavioral_interview"
    ONSITE = "onsite"
    TAKE_HOME = "take_home"
    OFFER = "offer"
    REJECTION = "rejection"
    WITHDRAWAL = "withdrawal"
    FOLLOW_UP = "follow_up"
    OTHER = "other"


class TimelineEvent(SQLModel, table=True):
    __tablename__ = "timeline_events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    application_id: uuid.UUID = Field(foreign_key="applications.id", index=True)
    event_type: EventTypeEnum
    title: str
    description: str | None = None
    event_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
