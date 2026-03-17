import { z } from 'zod';

export const emailCallbackQuery = z.object({
  code: z.string().min(1),
});

export type EmailCallbackQuery = z.infer<typeof emailCallbackQuery>;
