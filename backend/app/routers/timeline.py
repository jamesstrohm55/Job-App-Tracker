import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.timeline import TimelineEventCreate, TimelineEventResponse, TimelineEventUpdate
from app.services.timeline_service import (
    create_timeline_event,
    delete_timeline_event,
    get_timeline_events,
    update_timeline_event,
)

router = APIRouter(tags=["timeline"])


@router.get(
    "/applications/{app_id}/timeline",
    response_model=list[TimelineEventResponse],
)
async def get_events(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_timeline_events(app_id, user.id, db)


@router.post(
    "/applications/{app_id}/timeline",
    response_model=TimelineEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_event(
    app_id: uuid.UUID,
    body: TimelineEventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await create_timeline_event(app_id, user.id, body, db)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return event


@router.put("/timeline/{event_id}", response_model=TimelineEventResponse)
async def update_event(
    event_id: uuid.UUID,
    body: TimelineEventUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await update_timeline_event(event_id, user.id, body, db)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.delete("/timeline/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await delete_timeline_event(event_id, user.id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
