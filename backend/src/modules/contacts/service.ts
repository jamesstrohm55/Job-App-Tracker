import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { CreateContactInput, UpdateContactInput } from './schemas.js';

async function verifyApplicationOwnership(userId: string, applicationId: string) {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId },
  });
  if (!app) throw ApiError.notFound('Application');
  return app;
}

export async function listContacts(userId: string, applicationId: string) {
  await verifyApplicationOwnership(userId, applicationId);
  return prisma.contact.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getContact(userId: string, applicationId: string, contactId: string) {
  await verifyApplicationOwnership(userId, applicationId);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, applicationId },
  });
  if (!contact) throw ApiError.notFound('Contact');
  return contact;
}

export async function createContact(userId: string, applicationId: string, data: CreateContactInput) {
  await verifyApplicationOwnership(userId, applicationId);
  return prisma.contact.create({
    data: {
      ...data,
      email: data.email || null,
      applicationId,
    },
  });
}

export async function updateContact(
  userId: string,
  applicationId: string,
  contactId: string,
  data: UpdateContactInput,
) {
  await verifyApplicationOwnership(userId, applicationId);
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, applicationId },
  });
  if (!existing) throw ApiError.notFound('Contact');

  return prisma.contact.update({
    where: { id: contactId },
    data: {
      ...data,
      ...(data.email !== undefined && { email: data.email || null }),
    },
  });
}

export async function deleteContact(userId: string, applicationId: string, contactId: string) {
  await verifyApplicationOwnership(userId, applicationId);
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, applicationId },
  });
  if (!existing) throw ApiError.notFound('Contact');

  await prisma.contact.delete({ where: { id: contactId } });
}
