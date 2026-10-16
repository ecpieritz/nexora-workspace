import { Router } from 'express';

import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../../middleware/authentication.middleware.js';
import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import type { AccessTokenService, AuthenticationContextRepository } from '../auth/index.js';
import {
  createTaskBodySchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  taskStatusBodySchema,
  updateTaskBodySchema,
  type CreateTaskInput,
  type TaskIdParams,
  type TaskListQuery,
  type TaskStatusInput,
  type UpdateTaskInput,
} from './task.schemas.js';
import type { TaskManagementService } from './task.service.js';

export function createTaskRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  taskService: TaskManagementService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get('/people', async (request, response) => {
    const people = await taskService.listPeople(getAuthPrincipal(request));
    response.status(200).json({ data: people });
  });

  router.get('/', validateRequest({ query: taskListQuerySchema }), async (request, response) => {
    const { query } = getValidatedRequest<unknown, unknown, TaskListQuery>(request);
    const result = await taskService.list(getAuthPrincipal(request), query);
    response.status(200).json(result);
  });

  router.get('/:id', validateRequest({ params: taskIdParamsSchema }), async (request, response) => {
    const { params } = getValidatedRequest<unknown, TaskIdParams>(request);
    const task = await taskService.get(getAuthPrincipal(request), params.id);
    response.status(200).json({ data: task });
  });

  router.post('/', validateRequest({ body: createTaskBodySchema }), async (request, response) => {
    const { body } = getValidatedRequest<CreateTaskInput>(request);
    const task = await taskService.create(getAuthPrincipal(request), body);
    response.status(201).json({ data: task });
  });

  router.patch(
    '/:id',
    validateRequest({ body: updateTaskBodySchema, params: taskIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<UpdateTaskInput, TaskIdParams>(request);
      const task = await taskService.update(getAuthPrincipal(request), params.id, body);
      response.status(200).json({ data: task });
    },
  );

  router.patch(
    '/:id/status',
    validateRequest({ body: taskStatusBodySchema, params: taskIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<TaskStatusInput, TaskIdParams>(request);
      const task = await taskService.updateStatus(
        getAuthPrincipal(request),
        params.id,
        body.status,
      );
      response.status(200).json({ data: task });
    },
  );

  router.delete(
    '/:id',
    validateRequest({ params: taskIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, TaskIdParams>(request);
      await taskService.delete(getAuthPrincipal(request), params.id);
      response.sendStatus(204);
    },
  );

  return router;
}
