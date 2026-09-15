import { z } from 'zod';

const nullableTrimmedString = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .transform((value) => (value === '' ? null : value));

const taxIdSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 11 || value.length === 14, {
    error: 'CPF/CNPJ must contain 11 or 14 digits.',
  });

export const updateProfileBodySchema = z
  .strictObject({
    fullName: z.string().trim().min(2).max(120).optional(),
    displayName: nullableTrimmedString(80).optional(),
    phone: nullableTrimmedString(30).optional(),
    birthDate: z.union([z.iso.date(), z.null()]).optional(),
    bio: nullableTrimmedString(500).optional(),
    taxId: taxIdSchema.optional(),
    avatarUrl: z.union([z.url().max(2048), z.null()]).optional(),
    language: z.string().trim().min(2).max(10).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    dateFormat: z.string().trim().min(1).max(30).optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    compactSidebar: z.boolean().optional(),
    taskNotifications: z.boolean().optional(),
    invoiceNotifications: z.boolean().optional(),
    eventNotifications: z.boolean().optional(),
    customerNotifications: z.boolean().optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one profile field must be provided.',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileBodySchema>;
