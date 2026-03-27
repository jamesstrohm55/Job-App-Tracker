from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.application import (
    BoardColumn,
    BoardMoveRequest,
    BoardReorderRequest,
    BoardResponse,
)
from app.services.application_service import get_board, move_application, reorder_column

router = APIRouter(prefix="/board", tags=["board"])


@router.get("")
async def board(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    columns = await get_board(user.id, db)
    return {
        "columns": [
            {"stage": stage.value, "applications": apps}
            for stage, apps in columns.items()
        ]
    }


@router.patch("/move")
async def move(
    body: BoardMoveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    app = await move_application(body.application_id, user.id, body.new_stage, body.new_order, db)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return {"ok": True}


@router.patch("/reorder")
async def reorder(
    body: BoardReorderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await reorder_column(user.id, body.stage, body.ordered_ids, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reorder request"
        )
    return {"ok": True}
