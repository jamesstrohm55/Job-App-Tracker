from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsSummary,
    ResponseRateResponse,
    StageDistributionResponse,
    StageFunnelResponse,
    TimelineResponse,
)
from app.services.analytics_service import (
    get_response_rates,
    get_stage_distribution,
    get_stage_funnel,
    get_summary,
    get_timeline,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_summary(user.id, db)


@router.get("/funnel", response_model=StageFunnelResponse)
async def funnel(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_stage_funnel(user.id, db)


@router.get("/timeline", response_model=TimelineResponse)
async def timeline(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_timeline(user.id, db)


@router.get("/response-rates", response_model=ResponseRateResponse)
async def response_rates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_response_rates(user.id, db)


@router.get("/stage-distribution", response_model=StageDistributionResponse)
async def stage_distribution(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_stage_distribution(user.id, db)
