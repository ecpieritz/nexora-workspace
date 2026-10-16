import { z } from 'zod';

import { idParamsSchema, paginationQuerySchema } from '../../validation/index.js';

export const taskIdParamsSchema = idParamsSchema;

const taskStatusSchema = z.enum(['todo', 'doing', 'done']);
const taskCategorySchema = z.enum(['design', 'development', 'research']);
const dateTimeSchema = z.iso.datetime({ offset: true });
const assigneeIdsSchema = z
  .array(z.uuid())
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, {
    error: 'Assignees cannot contain duplicate members.',
  });
const descriptionSchema = z
  .union([z.string().trim().max(1000), z.null()])
  .transform((value) => (value === '' ? null : value));

const taskFields = {
  name: z.string().trim().min(2).max(160),
  description: descriptionSchema.optional(),
  category: taskCategorySchema,
  startsAt: dateTimeSchema,
  dueAt: dateTimeSchema,
  status: taskStatusSchema.default('todo'),
  assigneeIds: assigneeIdsSchema.default([]),
};

function validateTaskDates(
  value: { startsAt?: string | undefined; dueAt?: string | undefined },
  context: z.RefinementCtx,
): void {
  if (!value.startsAt || !value.dueAt) return;
  if (new Date(value.dueAt) < new Date(value.startsAt)) {
    context.addIssue({
      code: 'custom',
      path: ['dueAt'],
      message: 'Due date must be on or after the start date.',
    });
  }
}

export const createTaskBodySchema = z.strictObject(taskFields).superRefine(validateTaskDates);

export const updateTaskBodySchema = z
  .strictObject({
    name: taskFields.name.optional(),
    description: taskFields.description,
    category: taskCategorySchema.optional(),
    startsAt: dateTimeSchema.optional(),
    dueAt: dateTimeSchema.optional(),
    assigneeIds: assigneeIdsSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one task field must be provided.',
  })
  .superRefine(validateTaskDates);

export const taskStatusBodySchema = z.strictObject({ status: taskStatusSchema });

export const taskListQuerySchema = paginationQuerySchema
  .extend({
    search: z.string().trim().max(100).optional(),
    status: taskStatusSchema.optional(),
    category: taskCategorySchema.optional(),
    assigneeId: z.uuid().optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sort: z.enum(['name', 'startsAt', 'dueAt', 'createdAt']).default('dueAt'),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .superRefine((range, context) => {
    if (range.from && range.to && range.to < range.from) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'To must be on or after from.' });
    }
  });

export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;
export type CreateTaskInput = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskBodySchema>;
export type TaskStatusInput = z.infer<typeof taskStatusBodySchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
