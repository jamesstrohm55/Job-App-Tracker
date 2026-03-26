from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_applications: int
    active_applications: int
    response_rate: float  # percentage
    offer_count: int
    rejection_count: int
    avg_days_to_response: float | None


class StageFunnelEntry(BaseModel):
    stage: str
    count: int
    percentage: float


class StageFunnelResponse(BaseModel):
    entries: list[StageFunnelEntry]


class TimelineBucket(BaseModel):
    period: str  # "2026-03-17" or "2026-W12"
    count: int


class TimelineResponse(BaseModel):
    buckets: list[TimelineBucket]
    granularity: str  # "daily" or "weekly"


class ResponseRateBucket(BaseModel):
    period: str
    total: int
    responded: int
    rate: float


class ResponseRateResponse(BaseModel):
    buckets: list[ResponseRateBucket]


class StageDistributionEntry(BaseModel):
    stage: str
    count: int
    percentage: float


class StageDistributionResponse(BaseModel):
    entries: list[StageDistributionEntry]
