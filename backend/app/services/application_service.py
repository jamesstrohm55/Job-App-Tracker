import uuid
from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, StageEnum
from app.schemas.application import ApplicationCreate, ApplicationUpdate
from app.services.timeline_service import auto_create_stage_event


async def create_application(
    data: ApplicationCreate, user_id: uuid.UUID, db: AsyncSession
) -> Application:
    # Get the next stage_order for this user+stage
    result = await db.execute(
        select(func.coalesce(func.max(Application.stage_order), -1)).where(
            Application.user_id == user_id,
            Application.stage == data.stage,
            Application.is_archived == False,  # noqa: E712
        )
    )
    max_order = result.scalar_one()

    app = Application(
        user_id=user_id,
        company=data.company,
        position=data.position,
        url=data.url,
        location=data.location,
        work_model=data.work_model,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        salary_currency=data.salary_currency,
        stage=data.stage,
        stage_order=max_order + 1,
        notes=data.notes,
        applied_date=data.applied_date,
    )
    db.add(app)
    await db.flush()
    await db.refresh(app)
    return app


async def get_application(
    app_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Application | None:
    result = await db.execute(
        select(Application).where(Application.id == app_id, Application.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_applications(
    user_id: uuid.UUID,
    db: AsyncSession,
    stage: StageEnum | None = None,
    search: str | None = None,
    archived: bool = False,
    page: int = 1,
    size: int = 50,
) -> tuple[list[Application], int]:
    query = select(Application).where(
        Application.user_id == user_id,
        Application.is_archived == archived,
    )

    if stage:
        query = query.where(Application.stage == stage)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            Application.company.ilike(pattern) | Application.position.ilike(pattern)
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Order: interview first, then by stage priority, then most recent
    stage_priority = case(
        (Application.stage == StageEnum.INTERVIEW, 0),
        (Application.stage == StageEnum.SCREENING, 1),
        (Application.stage == StageEnum.OFFER, 2),
        (Application.stage == StageEnum.APPLIED, 3),
        (Application.stage == StageEnum.SAVED, 4),
        (Application.stage == StageEnum.REJECTED, 5),
        (Application.stage == StageEnum.WITHDRAWN, 6),
        else_=7,
    )
    query = query.order_by(stage_priority, Application.updated_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def update_application(
    app_id: uuid.UUID, user_id: uuid.UUID, data: ApplicationUpdate, db: AsyncSession
) -> Application | None:
    app = await get_application(app_id, user_id, db)
    if not app:
        return None

    old_stage = app.stage
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(app, field, value)
    app.updated_at = datetime.now(timezone.utc)

    db.add(app)

    # Auto-create timeline event on stage change
    if "stage" in update_data and update_data["stage"] != old_stage:
        await auto_create_stage_event(app_id, update_data["stage"], db)

    await db.flush()
    await db.refresh(app)
    return app


async def delete_application(
    app_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> bool:
    from app.models.application import ApplicationContact
    from app.models.email_message import EmailMessage
    from app.models.timeline_event import TimelineEvent

    app = await get_application(app_id, user_id, db)
    if not app:
        return False

    # Unlink emails (set application_id to NULL, don't delete the emails)
    result = await db.execute(
        select(EmailMessage).where(EmailMessage.application_id == app_id)
    )
    for email in result.scalars().all():
        email.application_id = None
        db.add(email)

    # Delete timeline events
    result = await db.execute(
        select(TimelineEvent).where(TimelineEvent.application_id == app_id)
    )
    for event in result.scalars().all():
        await db.delete(event)

    # Delete contact links
    result = await db.execute(
        select(ApplicationContact).where(ApplicationContact.application_id == app_id)
    )
    for link in result.scalars().all():
        await db.delete(link)

    await db.delete(app)
    return True


async def get_board(user_id: uuid.UUID, db: AsyncSession) -> dict[StageEnum, list[dict]]:
    from app.models.timeline_event import EventTypeEnum, TimelineEvent

    result = await db.execute(
        select(Application)
        .where(Application.user_id == user_id, Application.is_archived == False)  # noqa: E712
        .order_by(Application.stage_order)
    )
    apps = result.scalars().all()

    # Get latest interview event for apps in interview stage
    interview_app_ids = [a.id for a in apps if a.stage == StageEnum.INTERVIEW]
    interview_map: dict[uuid.UUID, dict] = {}

    if interview_app_ids:
        interview_types = [
            EventTypeEnum.PHONE_SCREEN, EventTypeEnum.TECHNICAL_INTERVIEW,
            EventTypeEnum.BEHAVIORAL_INTERVIEW, EventTypeEnum.ONSITE,
            EventTypeEnum.TAKE_HOME,
        ]
        for app_id in interview_app_ids:
            ev_result = await db.execute(
                select(TimelineEvent)
                .where(
                    TimelineEvent.application_id == app_id,
                    TimelineEvent.event_type.in_(interview_types),
                )
                .order_by(TimelineEvent.event_date.desc())
                .limit(1)
            )
            event = ev_result.scalar_one_or_none()
            if event:
                interview_map[app_id] = {
                    "title": event.title,
                    "description": event.description,
                    "event_date": event.event_date.isoformat() if event.event_date else None,
                }

    board: dict[StageEnum, list[dict]] = {stage: [] for stage in StageEnum}
    for app in apps:
        app_dict = {
            "id": str(app.id), "user_id": str(app.user_id),
            "company": app.company, "position": app.position,
            "url": app.url, "location": app.location,
            "work_model": app.work_model.value if app.work_model else None,
            "salary_min": app.salary_min, "salary_max": app.salary_max,
            "salary_currency": app.salary_currency,
            "stage": app.stage.value, "stage_order": app.stage_order,
            "notes": app.notes, "applied_date": str(app.applied_date) if app.applied_date else None,
            "is_archived": app.is_archived,
            "created_at": app.created_at.isoformat(), "updated_at": app.updated_at.isoformat(),
            "interview_info": interview_map.get(app.id),
        }
        board[app.stage].append(app_dict)
    return board


async def move_application(
    app_id: uuid.UUID,
    user_id: uuid.UUID,
    new_stage: StageEnum,
    new_order: int,
    db: AsyncSession,
) -> Application | None:
    app = await get_application(app_id, user_id, db)
    if not app:
        return None

    old_stage = app.stage
    old_order = app.stage_order

    # If moving within the same column, shift cards between old and new positions
    if old_stage == new_stage:
        if new_order > old_order:
            # Moving down: shift cards between old+1..new up by 1
            result = await db.execute(
                select(Application).where(
                    Application.user_id == user_id,
                    Application.stage == old_stage,
                    Application.is_archived == False,  # noqa: E712
                    Application.stage_order > old_order,
                    Application.stage_order <= new_order,
                    Application.id != app_id,
                )
            )
            for a in result.scalars().all():
                a.stage_order -= 1
                db.add(a)
        elif new_order < old_order:
            # Moving up: shift cards between new..old-1 down by 1
            result = await db.execute(
                select(Application).where(
                    Application.user_id == user_id,
                    Application.stage == old_stage,
                    Application.is_archived == False,  # noqa: E712
                    Application.stage_order >= new_order,
                    Application.stage_order < old_order,
                    Application.id != app_id,
                )
            )
            for a in result.scalars().all():
                a.stage_order += 1
                db.add(a)
    else:
        # Moving to a different column
        # Close the gap in the old column
        result = await db.execute(
            select(Application).where(
                Application.user_id == user_id,
                Application.stage == old_stage,
                Application.is_archived == False,  # noqa: E712
                Application.stage_order > old_order,
                Application.id != app_id,
            )
        )
        for a in result.scalars().all():
            a.stage_order -= 1
            db.add(a)

        # Make room in the new column
        result = await db.execute(
            select(Application).where(
                Application.user_id == user_id,
                Application.stage == new_stage,
                Application.is_archived == False,  # noqa: E712
                Application.stage_order >= new_order,
            )
        )
        for a in result.scalars().all():
            a.stage_order += 1
            db.add(a)

    app.stage = new_stage
    app.stage_order = new_order
    app.updated_at = datetime.now(timezone.utc)
    db.add(app)

    # Auto-create timeline event when stage changes via board drag
    if old_stage != new_stage:
        await auto_create_stage_event(app_id, new_stage.value, db)

    await db.flush()
    await db.refresh(app)
    return app


async def reorder_column(
    user_id: uuid.UUID,
    stage: StageEnum,
    ordered_ids: list[uuid.UUID],
    db: AsyncSession,
) -> bool:
    for idx, app_id in enumerate(ordered_ids):
        result = await db.execute(
            select(Application).where(
                Application.id == app_id,
                Application.user_id == user_id,
                Application.stage == stage,
            )
        )
        app = result.scalar_one_or_none()
        if not app:
            return False
        app.stage_order = idx
        db.add(app)
    return True
