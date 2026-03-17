import { z } from 'zod';

const applicationStatusEnum = z.enum([
  'SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN',
]);

export const createApplicationSchema = z.object({
  company: z.string().min(1).max(255),
  position: z.string().min(1).max(255),
  url: z.string().url().optional().or(z.literal('')),
  location: z.string().max(255).optional(),
  salary: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: applicationStatusEnum.optional(),
  appliedAt: z.coerce.date().optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const listApplicationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: applicationStatusEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'company', 'position', 'appliedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const applicationIdParam = z.object({
  id: z.string().min(1),
});

export const createTimelineEventSchema = z.object({
  type: z.string().min(1).max(50),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuery>;
export type CreateTimelineEventInput = z.infer<typeof createTimelineEventSchema>;
