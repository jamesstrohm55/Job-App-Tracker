import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import ApplicationContact
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate


async def create_contact(
    data: ContactCreate, user_id: uuid.UUID, db: AsyncSession
) -> Contact:
    contact = Contact(user_id=user_id, **data.model_dump())
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


async def get_contact(
    contact_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Contact | None:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_contacts(
    user_id: uuid.UUID,
    db: AsyncSession,
    search: str | None = None,
    company: str | None = None,
) -> tuple[list[Contact], int]:
    query = select(Contact).where(Contact.user_id == user_id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            Contact.name.ilike(pattern)
            | Contact.email.ilike(pattern)
            | Contact.company.ilike(pattern)
        )
    if company:
        query = query.where(Contact.company.ilike(f"%{company}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Contact.updated_at.desc())
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def update_contact(
    contact_id: uuid.UUID, user_id: uuid.UUID, data: ContactUpdate, db: AsyncSession
) -> Contact | None:
    contact = await get_contact(contact_id, user_id, db)
    if not contact:
        return None

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    contact.updated_at = datetime.now(timezone.utc)

    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


async def delete_contact(
    contact_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> bool:
    contact = await get_contact(contact_id, user_id, db)
    if not contact:
        return False

    # Remove all application links first
    result = await db.execute(
        select(ApplicationContact).where(ApplicationContact.contact_id == contact_id)
    )
    for link in result.scalars().all():
        await db.delete(link)

    await db.delete(contact)
    return True


async def link_contact_to_application(
    application_id: uuid.UUID, contact_id: uuid.UUID, db: AsyncSession
) -> bool:
    # Check if already linked
    result = await db.execute(
        select(ApplicationContact).where(
            ApplicationContact.application_id == application_id,
            ApplicationContact.contact_id == contact_id,
        )
    )
    if result.scalar_one_or_none():
        return True  # Already linked

    link = ApplicationContact(application_id=application_id, contact_id=contact_id)
    db.add(link)
    return True


async def unlink_contact_from_application(
    application_id: uuid.UUID, contact_id: uuid.UUID, db: AsyncSession
) -> bool:
    result = await db.execute(
        select(ApplicationContact).where(
            ApplicationContact.application_id == application_id,
            ApplicationContact.contact_id == contact_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        return False
    await db.delete(link)
    return True


async def get_contacts_for_application(
    application_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> list[Contact]:
    result = await db.execute(
        select(Contact)
        .join(ApplicationContact, ApplicationContact.contact_id == Contact.id)
        .where(
            ApplicationContact.application_id == application_id,
            Contact.user_id == user_id,
        )
        .order_by(Contact.name)
    )
    return list(result.scalars().all())
