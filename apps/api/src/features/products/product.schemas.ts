import { z } from 'zod';

import { idParamsSchema, paginationQuerySchema } from '../../validation/index.js';

export const productIdParamsSchema = idParamsSchema;

const skuSchema = z
  .union([z.string().trim().toUpperCase().max(80), z.null()])
  .transform((value) => (value === '' ? null : value));

const productFields = {
  sku: skuSchema.optional(),
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(1000),
  price: z.number().finite().positive().max(9_999_999_999.99),
  negotiable: z.boolean().default(false),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
};

export const createProductBodySchema = z.strictObject(productFields);

export const updateProductBodySchema = z
  .strictObject({
    sku: skuSchema.optional(),
    name: productFields.name.optional(),
    brand: productFields.brand.optional(),
    category: productFields.category.optional(),
    description: z.union([productFields.description, z.null()]).optional(),
    price: productFields.price.optional(),
    negotiable: z.boolean().optional(),
    stock: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one product field must be provided.',
  });

export const productListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  sort: z.enum(['name', 'price', 'stock', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const productAnalyticsQuerySchema = z
  .strictObject({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .superRefine((range, context) => {
    if (!range.from) return;
    const from = new Date(`${range.from}T00:00:00.000Z`);
    const to = range.to ? new Date(`${range.to}T23:59:59.999Z`) : new Date();
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    if (days < 0) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'To must be on or after from.' });
    } else if (days > 366) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Analytics range cannot exceed 366 days.',
      });
    }
  });

export type ProductIdParams = z.infer<typeof productIdParamsSchema>;
export type CreateProductInput = z.infer<typeof createProductBodySchema>;
export type UpdateProductInput = z.infer<typeof updateProductBodySchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ProductAnalyticsQuery = z.infer<typeof productAnalyticsQuerySchema>;
