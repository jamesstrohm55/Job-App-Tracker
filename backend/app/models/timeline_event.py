import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

TZDateTime = DateTime(timezone=True)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
    event_date: datetime = Field(sa_type=TZDateTime)
    created_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
    updated_at: datetime = Field(default_factory=_utcnow, sa_type=TZDateTime)
