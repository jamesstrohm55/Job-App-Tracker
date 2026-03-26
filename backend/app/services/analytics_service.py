import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, StageEnum
from app.models.timeline_event import EventTypeEnum, TimelineEvent


async def get_summary(user_id: uuid.UUID, db: AsyncSession) -> dict:
    # Total applications (non-archived)
    total_result = await db.execute(
        select(func.count()).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
        )
    )
    total = total_result.scalar_one()

    # Active (not rejected, withdrawn, or archived)
    active_result = await db.execute(
        select(func.count()).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
            Application.stage.notin_([StageEnum.REJECTED, StageEnum.WITHDRAWN]),
        )
    )
    active = active_result.scalar_one()

    # Offers
    offer_result = await db.execute(
        select(func.count()).where(
            Application.user_id == user_id,
            Application.stage == StageEnum.OFFER,
        )
    )
    offers = offer_result.scalar_one()

    # Rejections
    rejection_result = await db.execute(
        select(func.count()).where(
            Application.user_id == user_id,
            Application.stage == StageEnum.REJECTED,
        )
    )
    rejections = rejection_result.scalar_one()

    # Response rate: applications that moved past "applied" stage
    applied_result = await db.execute(
        select(func.count()).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
            Application.stage != StageEnum.SAVED,
        )
    )
    applied_count = applied_result.scalar_one()

    responded_result = await db.execute(
        select(func.count()).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
            Application.stage.in_([
                StageEnum.SCREENING,
                StageEnum.INTERVIEW,
                StageEnum.OFFER,
                StageEnum.REJECTED,
            ]),
        )
    )
    responded_count = responded_result.scalar_one()

    response_rate = (responded_count / applied_count * 100) if applied_count > 0 else 0.0

    # Avg days to first response (from applied event to next event)
    avg_days = await _calc_avg_response_days(user_id, db)

    return {
        "total_applications": total,
        "active_applications": active,
        "response_rate": round(response_rate, 1),
        "offer_count": offers,
        "rejection_count": rejections,
        "avg_days_to_response": avg_days,
    }


async def _calc_avg_response_days(user_id: uuid.UUID, db: AsyncSession) -> float | None:
    """Calculate average days between 'applied' and first subsequent event per application."""
    # Get applications with at least an applied event
    result = await db.execute(
        select(
            TimelineEvent.application_id,
            func.min(TimelineEvent.event_date).label("first_date"),
        )
        .join(Application, Application.id == TimelineEvent.application_id)
        .where(
            Application.user_id == user_id,
            TimelineEvent.event_type == EventTypeEnum.APPLIED,
        )
        .group_by(TimelineEvent.application_id)
    )
    applied_dates = {row[0]: row[1] for row in result.all()}

    if not applied_dates:
        return None

    # Get earliest non-applied event for each of those applications
    response_types = [
        EventTypeEnum.PHONE_SCREEN,
        EventTypeEnum.TECHNICAL_INTERVIEW,
        EventTypeEnum.BEHAVIORAL_INTERVIEW,
        EventTypeEnum.ONSITE,
        EventTypeEnum.TAKE_HOME,
        EventTypeEnum.OFFER,
        EventTypeEnum.REJECTION,
    ]

    result = await db.execute(
        select(
            TimelineEvent.application_id,
            func.min(TimelineEvent.event_date).label("response_date"),
        )
        .join(Application, Application.id == TimelineEvent.application_id)
        .where(
            Application.user_id == user_id,
            TimelineEvent.application_id.in_(list(applied_dates.keys())),
            TimelineEvent.event_type.in_(response_types),
        )
        .group_by(TimelineEvent.application_id)
    )
    response_dates = {row[0]: row[1] for row in result.all()}

    if not response_dates:
        return None

    total_days = 0.0
    count = 0
    for app_id, applied_dt in applied_dates.items():
        if app_id in response_dates:
            delta = response_dates[app_id] - applied_dt
            total_days += delta.total_seconds() / 86400
            count += 1

    return round(total_days / count, 1) if count > 0 else None


async def get_stage_funnel(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Stage conversion funnel — how many apps reached each stage."""
    # Count apps that have ever been in each stage (via timeline events)
    # Fallback: use current stage distribution as approximation
    stage_order = [
        StageEnum.APPLIED,
        StageEnum.SCREENING,
        StageEnum.INTERVIEW,
        StageEnum.OFFER,
    ]

    # For a proper funnel, count apps whose current stage is at or past each level
    stage_rank = {
        StageEnum.SAVED: 0,
        StageEnum.APPLIED: 1,
        StageEnum.SCREENING: 2,
        StageEnum.INTERVIEW: 3,
        StageEnum.OFFER: 4,
        StageEnum.REJECTED: 2,  # rejected counts as reaching screening level
        StageEnum.WITHDRAWN: 1,
    }

    result = await db.execute(
        select(Application.stage, func.count()).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
        ).group_by(Application.stage)
    )
    stage_counts = {row[0]: row[1] for row in result.all()}

    # Build funnel: count apps at or past each funnel stage
    entries = []
    total_applied = sum(
        count for stage, count in stage_counts.items()
        if stage_rank.get(stage, 0) >= 1
    )

    for funnel_stage in stage_order:
        rank = stage_rank[funnel_stage]
        count = sum(
            c for s, c in stage_counts.items()
            if stage_rank.get(s, 0) >= rank
        )
        pct = (count / total_applied * 100) if total_applied > 0 else 0.0
        entries.append({
            "stage": funnel_stage.value,
            "count": count,
            "percentage": round(pct, 1),
        })

    return {"entries": entries}


async def get_timeline(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Applications created over time, bucketed by week."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    result = await db.execute(
        select(
            func.date(Application.created_at).label("day"),
            func.count().label("count"),
        )
        .where(
            Application.user_id == user_id,
            Application.created_at >= cutoff,
        )
        .group_by(func.date(Application.created_at))
        .order_by(func.date(Application.created_at))
    )

    buckets = [{"period": str(row[0]), "count": row[1]} for row in result.all()]
    return {"buckets": buckets, "granularity": "daily"}


async def get_response_rates(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Response rate by week over the last 90 days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    # Get applications created in each week
    result = await db.execute(
        select(
            func.date(Application.created_at).label("day"),
            func.count().label("total"),
            func.sum(
                case(
                    (
                        Application.stage.in_([
                            StageEnum.SCREENING,
                            StageEnum.INTERVIEW,
                            StageEnum.OFFER,
                            StageEnum.REJECTED,
                        ]),
                        1,
                    ),
                    else_=0,
                )
            ).label("responded"),
        )
        .where(
            Application.user_id == user_id,
            Application.created_at >= cutoff,
            Application.stage != StageEnum.SAVED,
        )
        .group_by(func.date(Application.created_at))
        .order_by(func.date(Application.created_at))
    )

    buckets = []
    for row in result.all():
        total = row[1]
        responded = row[2] or 0
        rate = (responded / total * 100) if total > 0 else 0.0
        buckets.append({
            "period": str(row[0]),
            "total": total,
            "responded": responded,
            "rate": round(rate, 1),
        })

    return {"buckets": buckets}


async def get_stage_distribution(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Current stage distribution (for donut chart)."""
    result = await db.execute(
        select(Application.stage, func.count()).where(
            Application.user_id == user_id,
            Application.is_archived == False,  # noqa: E712
        ).group_by(Application.stage)
    )

    total = 0
    raw = []
    for row in result.all():
        raw.append((row[0], row[1]))
        total += row[1]

    entries = [
        {
            "stage": stage.value,
            "count": count,
            "percentage": round(count / total * 100, 1) if total > 0 else 0.0,
        }
        for stage, count in raw
    ]

    return {"entries": entries}
