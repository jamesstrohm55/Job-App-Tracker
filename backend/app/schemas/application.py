import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.application import StageEnum, WorkModelEnum


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=200)
    url: str | None = None
    location: str | None = None
    work_model: WorkModelEnum | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str = "USD"
    stage: StageEnum = StageEnum.SAVED
    notes: str | None = None
    applied_date: date | None = None


class ApplicationUpdate(BaseModel):
    company: str | None = None
    position: str | None = None
    url: str | None = None
    location: str | None = None
    work_model: WorkModelEnum | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    stage: StageEnum | None = None
    notes: str | None = None
    applied_date: date | None = None
    is_archived: bool | None = None


class InterviewInfo(BaseModel):
    title: str | None = None
    description: str | None = None
    event_date: datetime | None = None


class ApplicationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    company: str
    position: str
    url: str | None
    location: str | None
    work_model: WorkModelEnum | None
    salary_min: int | None
    salary_max: int | None
    salary_currency: str
    stage: StageEnum
    stage_order: int
    notes: str | None
    applied_date: date | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    interview_info: InterviewInfo | None = None


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    size: int


class BoardMoveRequest(BaseModel):
    application_id: uuid.UUID
    new_stage: StageEnum
    new_order: int = Field(ge=0)


class BoardReorderRequest(BaseModel):
    stage: StageEnum
    ordered_ids: list[uuid.UUID]


class BoardColumn(BaseModel):
    stage: StageEnum
    applications: list[ApplicationResponse]


class BoardResponse(BaseModel):
    columns: list[BoardColumn]
