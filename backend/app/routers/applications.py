import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.application import StageEnum
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.services.application_service import (
    create_application,
    delete_application,
    get_application,
    list_applications,
    update_application,
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create(
    body: ApplicationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app = await create_application(body, user.id, db)
    return app


@router.get("", response_model=ApplicationListResponse)
async def list_apps(
    stage: StageEnum | None = None,
    search: str | None = None,
    archived: bool = False,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_applications(user.id, db, stage, search, archived, page, size)
    return ApplicationListResponse(items=items, total=total, page=page, size=size)


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_app(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app = await get_application(app_id, user.id, db)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_app(
    app_id: uuid.UUID,
    body: ApplicationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app = await update_application(app_id, user.id, body, db)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def patch_app(
    app_id: uuid.UUID,
    body: ApplicationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app = await update_application(app_id, user.id, body, db)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_application(app_id, user.id, db)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
