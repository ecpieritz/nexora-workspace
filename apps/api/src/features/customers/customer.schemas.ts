import { z } from 'zod';

import { idParamsSchema, paginationQuerySchema } from '../../validation/index.js';

export const customerIdParamsSchema = idParamsSchema;

const customerGenderSchema = z.enum(['male', 'female', 'non-binary']);

const customerFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Email must be valid.' })),
  phone: z.string().trim().min(3).max(30),
  gender: customerGenderSchema,
  role: z.string().trim().min(1).max(100),
  address: z.string().trim().min(3).max(300),
};

export const createCustomerBodySchema = z.strictObject(customerFields);

export const updateCustomerBodySchema = z
  .strictObject({
    firstName: customerFields.firstName.optional(),
    lastName: customerFields.lastName.optional(),
    email: customerFields.email.optional(),
    phone: customerFields.phone.optional(),
    gender: customerFields.gender.optional(),
    role: customerFields.role.optional(),
    address: customerFields.address.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one customer field must be provided.',
  });

export const customerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  gender: customerGenderSchema.optional(),
  sort: z.enum(['name', 'email', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CustomerIdParams = z.infer<typeof customerIdParamsSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerBodySchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerBodySchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
