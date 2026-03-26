import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.timeline_event import EventTypeEnum, TimelineEvent
from app.schemas.timeline import TimelineEventCreate, TimelineEventUpdate


async def create_timeline_event(
    application_id: uuid.UUID,
    user_id: uuid.UUID,
    data: TimelineEventCreate,
    db: AsyncSession,
) -> TimelineEvent | None:
    # Verify the application belongs to the user
    result = await db.execute(
        select(Application).where(
            Application.id == application_id, Application.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        return None

    event = TimelineEvent(application_id=application_id, **data.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def get_timeline_events(
    application_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> list[TimelineEvent]:
    # Verify the application belongs to the user
    result = await db.execute(
        select(Application).where(
            Application.id == application_id, Application.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        return []

    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.application_id == application_id)
        .order_by(TimelineEvent.event_date.desc())
    )
    return list(result.scalars().all())


async def update_timeline_event(
    event_id: uuid.UUID, user_id: uuid.UUID, data: TimelineEventUpdate, db: AsyncSession
) -> TimelineEvent | None:
    result = await db.execute(
        select(TimelineEvent)
        .join(Application, Application.id == TimelineEvent.application_id)
        .where(TimelineEvent.id == event_id, Application.user_id == user_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        return None

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    event.updated_at = datetime.now(timezone.utc)

    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def delete_timeline_event(
    event_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> bool:
    result = await db.execute(
        select(TimelineEvent)
        .join(Application, Application.id == TimelineEvent.application_id)
        .where(TimelineEvent.id == event_id, Application.user_id == user_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        return False
    await db.delete(event)
    return True


async def auto_create_stage_event(
    application_id: uuid.UUID, new_stage: str, db: AsyncSession
) -> TimelineEvent:
    """Auto-create a timeline event when an application stage changes."""
    stage_to_event: dict[str, EventTypeEnum] = {
        "applied": EventTypeEnum.APPLIED,
        "screening": EventTypeEnum.PHONE_SCREEN,
        "interview": EventTypeEnum.TECHNICAL_INTERVIEW,
        "offer": EventTypeEnum.OFFER,
        "rejected": EventTypeEnum.REJECTION,
        "withdrawn": EventTypeEnum.WITHDRAWAL,
    }

    event_type = stage_to_event.get(new_stage, EventTypeEnum.OTHER)
    title = f"Stage changed to {new_stage.replace('_', ' ').title()}"

    event = TimelineEvent(
        application_id=application_id,
        event_type=event_type,
        title=title,
        event_date=datetime.now(timezone.utc),
    )
    db.add(event)
    return event
