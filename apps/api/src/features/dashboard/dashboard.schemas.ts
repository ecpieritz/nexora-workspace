import { z } from 'zod';

const dashboardRangeFields = {
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
};

function validateRange(
  range: { from?: string | undefined; to?: string | undefined },
  context: z.RefinementCtx,
): void {
  if (!range.from || !range.to) return;
  const days =
    (new Date(`${range.to}T00:00:00.000Z`).getTime() -
      new Date(`${range.from}T00:00:00.000Z`).getTime()) /
    86_400_000;
  if (days < 0) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'To must be on or after from.' });
  } else if (days > 366) {
    context.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Dashboard range cannot exceed 366 days.',
    });
  }
}

export const dashboardMetricsQuerySchema = z
  .strictObject(dashboardRangeFields)
  .superRefine(validateRange);

export const dashboardReportsQuerySchema = z
  .strictObject({
    ...dashboardRangeFields,
    interval: z.enum(['day', 'week', 'month']).default('week'),
    recentLimit: z.coerce.number().int().min(1).max(20).default(4),
    productLimit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .superRefine(validateRange);

export type DashboardMetricsQuery = z.infer<typeof dashboardMetricsQuerySchema>;
export type DashboardReportsQuery = z.infer<typeof dashboardReportsQuerySchema>;
