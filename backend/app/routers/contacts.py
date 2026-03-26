import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactListResponse, ContactResponse, ContactUpdate
from app.services.contact_service import (
    create_contact,
    delete_contact,
    get_contact,
    get_contacts_for_application,
    link_contact_to_application,
    list_contacts,
    unlink_contact_from_application,
    update_contact,
)

router = APIRouter(tags=["contacts"])


@router.post("/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create(
    body: ContactCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_contact(body, user.id, db)


@router.get("/contacts", response_model=ContactListResponse)
async def list_all(
    search: str | None = None,
    company: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_contacts(user.id, db, search, company)
    return ContactListResponse(items=items, total=total)


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_one(
    contact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await get_contact(contact_id, user.id, db)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update(
    contact_id: uuid.UUID,
    body: ContactUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await update_contact(contact_id, user.id, body, db)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    contact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await delete_contact(contact_id, user.id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")


# Application-contact linking
@router.get(
    "/applications/{app_id}/contacts",
    response_model=list[ContactResponse],
)
async def get_app_contacts(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_contacts_for_application(app_id, user.id, db)


@router.post(
    "/applications/{app_id}/contacts/{contact_id}",
    status_code=status.HTTP_201_CREATED,
)
async def link(
    app_id: uuid.UUID,
    contact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify contact belongs to user
    contact = await get_contact(contact_id, user.id, db)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    await link_contact_to_application(app_id, contact_id, db)
    return {"ok": True}


@router.delete(
    "/applications/{app_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unlink(
    app_id: uuid.UUID,
    contact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await unlink_contact_from_application(app_id, contact_id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
