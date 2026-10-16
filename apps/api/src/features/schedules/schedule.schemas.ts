import { z } from 'zod';

import { idParamsSchema, paginationQuerySchema } from '../../validation/index.js';

export const scheduleIdParamsSchema = idParamsSchema;

const scheduleKindSchema = z.enum(['event', 'reminder', 'task']);
const dateTimeSchema = z.iso.datetime({ offset: true });
const attendeeIdsSchema = z
  .array(z.uuid())
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, {
    error: 'Attendees cannot contain duplicate members.',
  });
const optionalText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .transform((value) => (value === '' ? null : value));

const scheduleFields = {
  title: z.string().trim().min(2).max(160),
  description: optionalText(1000).optional(),
  location: optionalText(200).optional(),
  kind: scheduleKindSchema.default('event'),
  startsAt: dateTimeSchema,
  endsAt: z.union([dateTimeSchema, z.null()]).optional(),
  attendeeIds: attendeeIdsSchema.default([]),
};

function validateDateOrder(
  value: { startsAt?: string | undefined; endsAt?: string | null | undefined },
  context: z.RefinementCtx,
): void {
  if (!value.startsAt || !value.endsAt) return;
  if (new Date(value.endsAt) <= new Date(value.startsAt)) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End date must be after the start date.',
    });
  }
}

export const createScheduleBodySchema = z
  .strictObject(scheduleFields)
  .superRefine(validateDateOrder);

export const updateScheduleBodySchema = z
  .strictObject({
    title: scheduleFields.title.optional(),
    description: scheduleFields.description,
    location: scheduleFields.location,
    kind: scheduleKindSchema.optional(),
    startsAt: dateTimeSchema.optional(),
    endsAt: scheduleFields.endsAt,
    attendeeIds: attendeeIdsSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one schedule field must be provided.',
  })
  .superRefine(validateDateOrder);

const rangeFields = {
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
};

function validateRange(
  value: { from?: string | undefined; to?: string | undefined },
  context: z.RefinementCtx,
  maximumDays?: number,
): void {
  if (!value.from || !value.to) return;
  const days =
    (new Date(`${value.to}T00:00:00.000Z`).getTime() -
      new Date(`${value.from}T00:00:00.000Z`).getTime()) /
    86_400_000;
  if (days < 0) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'To must be on or after from.' });
  } else if (maximumDays !== undefined && days > maximumDays) {
    context.addIssue({
      code: 'custom',
      path: ['to'],
      message: `Date range cannot exceed ${maximumDays} days.`,
    });
  }
}

export const scheduleListQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().max(100).optional(),
    kind: scheduleKindSchema.optional(),
    attendeeId: z.uuid().optional(),
    ...rangeFields,
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .superRefine((value, context) => validateRange(value, context));

export const calendarEventQuerySchema = z
  .strictObject({
    from: z.iso.date(),
    to: z.iso.date(),
    attendeeId: z.uuid().optional(),
    kind: scheduleKindSchema.optional(),
  })
  .superRefine((value, context) => validateRange(value, context, 366));

export type ScheduleIdParams = z.infer<typeof scheduleIdParamsSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleBodySchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleBodySchema>;
export type ScheduleListQuery = z.infer<typeof scheduleListQuerySchema>;
export type CalendarEventQuery = z.infer<typeof calendarEventQuerySchema>;
