import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ListApplicationsQuery,
  CreateTimelineEventInput,
} from './schemas.js';

export async function listApplications(userId: string, query: ListApplicationsQuery) {
  const { page, limit, status, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ApplicationWhereInput = {
    userId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { company: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { _count: { select: { contacts: true, timeline: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  return {
    data: applications,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getApplication(userId: string, id: string) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      timeline: { orderBy: { createdAt: 'desc' } },
      _count: { select: { contacts: true } },
    },
  });

  if (!application) throw ApiError.notFound('Application');

  return application;
}

export async function createApplication(userId: string, data: CreateApplicationInput) {
  const application = await prisma.application.create({
    data: {
      ...data,
      url: data.url || null,
      userId,
    },
    include: {
      timeline: true,
      _count: { select: { contacts: true } },
    },
  });

  // Create initial timeline event
  await prisma.applicationEvent.create({
    data: {
      applicationId: application.id,
      type: 'CREATED',
      description: `Application created with status ${application.status}`,
    },
  });

  return application;
}

export async function updateApplication(
  userId: string,
  id: string,
  data: UpdateApplicationInput,
) {
  const existing = await prisma.application.findFirst({
    where: { id, userId },
  });

  if (!existing) throw ApiError.notFound('Application');

  const application = await prisma.application.update({
    where: { id },
    data: {
      ...data,
      ...(data.url !== undefined && { url: data.url || null }),
    },
    include: {
      timeline: { orderBy: { createdAt: 'desc' } },
      _count: { select: { contacts: true } },
    },
  });

  // Track status change in timeline
  if (data.status && data.status !== existing.status) {
    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        type: 'STATUS_CHANGE',
        description: `Status changed from ${existing.status} to ${data.status}`,
        metadata: { fromStatus: existing.status, toStatus: data.status },
      },
    });
  }

  return application;
}

export async function deleteApplication(userId: string, id: string): Promise<void> {
  const existing = await prisma.application.findFirst({
    where: { id, userId },
  });

  if (!existing) throw ApiError.notFound('Application');

  await prisma.application.delete({ where: { id } });
}

export async function getTimeline(userId: string, applicationId: string) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
  });

  if (!application) throw ApiError.notFound('Application');

  return prisma.applicationEvent.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addTimelineEvent(
  userId: string,
  applicationId: string,
  data: CreateTimelineEventInput,
) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
  });

  if (!application) throw ApiError.notFound('Application');

  return prisma.applicationEvent.create({
    data: {
      applicationId,
      type: data.type,
      description: data.description,
      metadata: data.metadata ?? undefined,
    },
  });
}
