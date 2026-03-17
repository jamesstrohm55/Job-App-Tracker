import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  role: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactParams = z.object({
  id: z.string().min(1),
  contactId: z.string().min(1),
});

export const applicationIdParam = z.object({
  id: z.string().min(1),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
