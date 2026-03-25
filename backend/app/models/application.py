import enum
import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel


class StageEnum(str, enum.Enum):
    SAVED = "saved"
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class WorkModelEnum(str, enum.Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    company: str = Field(index=True)
    position: str
    url: str | None = None
    location: str | None = None
    work_model: WorkModelEnum | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str = Field(default="USD")
    stage: StageEnum = Field(default=StageEnum.SAVED)
    stage_order: int = Field(default=0)
    notes: str | None = None
    applied_date: date | None = None
    is_archived: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ApplicationContact(SQLModel, table=True):
    __tablename__ = "application_contacts"

    application_id: uuid.UUID = Field(foreign_key="applications.id", primary_key=True)
    contact_id: uuid.UUID = Field(foreign_key="contacts.id", primary_key=True)
