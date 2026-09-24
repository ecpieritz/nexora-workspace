import { z } from 'zod';

import { idParamsSchema, paginationQuerySchema } from '../../validation/index.js';

export const invoiceIdParamsSchema = idParamsSchema;

const nullableText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .transform((value) => (value === '' ? null : value));

const dateSchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

const invoiceLineSchema = z.strictObject({
  productId: z.union([z.uuid(), z.null()]).optional(),
  description: z.string().trim().min(1).max(300),
  rate: z.number().finite().nonnegative().max(9_999_999_999.99),
  quantity: z.number().int().positive().max(100_000),
});

const invoiceFields = {
  customerId: z.union([z.uuid(), z.null()]).optional(),
  customerName: z.string().trim().min(2).max(160),
  email: z.email().trim().toLowerCase().max(320),
  address: nullableText(300).optional(),
  issuedAt: dateSchema,
  dueAt: z.union([dateSchema, z.null()]).optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
  discount: z.number().finite().min(0).max(100).default(0),
  items: z.array(invoiceLineSchema).min(1).max(100),
};

function validateDates(
  value: { issuedAt?: string | undefined; dueAt?: string | null | undefined },
  context: z.RefinementCtx,
): void {
  if (!value.issuedAt || !value.dueAt) return;
  if (new Date(value.dueAt) < new Date(value.issuedAt)) {
    context.addIssue({
      code: 'custom',
      path: ['dueAt'],
      message: 'Due date must be on or after the issue date.',
    });
  }
}

export const createInvoiceBodySchema = z.strictObject(invoiceFields).superRefine(validateDates);

export const updateInvoiceBodySchema = z
  .strictObject({
    customerId: invoiceFields.customerId,
    customerName: invoiceFields.customerName.optional(),
    email: invoiceFields.email.optional(),
    address: invoiceFields.address,
    issuedAt: invoiceFields.issuedAt.optional(),
    dueAt: invoiceFields.dueAt,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    discount: z.number().finite().min(0).max(100).optional(),
    items: invoiceFields.items.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one invoice field must be provided.',
  })
  .superRefine(validateDates);

export const invoiceStatusBodySchema = z.strictObject({
  status: z.enum(['complete', 'pending', 'cancelled']),
});

export const invoiceFavoriteBodySchema = z.strictObject({ favorite: z.boolean() });

export const invoiceListQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['complete', 'pending', 'cancelled']).optional(),
    favorite: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sort: z.enum(['issuedAt', 'dueAt', 'customerName', 'total', 'createdAt']).default('issuedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .superRefine((range, context) => {
    if (range.from && range.to && range.to < range.from) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'To must be on or after from.' });
    }
  });

export type InvoiceIdParams = z.infer<typeof invoiceIdParamsSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceBodySchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceBodySchema>;
export type InvoiceStatusInput = z.infer<typeof invoiceStatusBodySchema>;
export type InvoiceFavoriteInput = z.infer<typeof invoiceFavoriteBodySchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
