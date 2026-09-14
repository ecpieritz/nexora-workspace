import { z } from 'zod';

export const idParamsSchema = z.strictObject({
  id: z.uuid({ error: 'ID must be a valid UUID.' }),
});

export const paginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type IdParams = z.infer<typeof idParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
