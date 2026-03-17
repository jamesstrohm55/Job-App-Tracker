import { z } from 'zod';

export const timelineQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});

export const timeInStageQuery = z.object({
  status: z.enum([
    'SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN',
  ]).optional(),
});

export type TimelineQuery = z.infer<typeof timelineQuery>;
export type TimeInStageQuery = z.infer<typeof timeInStageQuery>;
