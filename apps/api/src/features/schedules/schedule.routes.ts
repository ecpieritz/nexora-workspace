import { Router } from 'express';

import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../../middleware/authentication.middleware.js';
import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import type { AccessTokenService, AuthenticationContextRepository } from '../auth/index.js';
import {
  calendarEventQuerySchema,
  createScheduleBodySchema,
  scheduleIdParamsSchema,
  scheduleListQuerySchema,
  updateScheduleBodySchema,
  type CalendarEventQuery,
  type CreateScheduleInput,
  type ScheduleIdParams,
  type ScheduleListQuery,
  type UpdateScheduleInput,
} from './schedule.schemas.js';
import type { ScheduleManagementService } from './schedule.service.js';

export function createScheduleRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  scheduleService: ScheduleManagementService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get('/people', async (request, response) => {
    const people = await scheduleService.listPeople(getAuthPrincipal(request));
    response.status(200).json({ data: people });
  });

  router.get(
    '/',
    validateRequest({ query: scheduleListQuerySchema }),
    async (request, response) => {
      const { query } = getValidatedRequest<unknown, unknown, ScheduleListQuery>(request);
      const result = await scheduleService.list(getAuthPrincipal(request), query);
      response.status(200).json(result);
    },
  );

  router.get(
    '/:id',
    validateRequest({ params: scheduleIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, ScheduleIdParams>(request);
      const schedule = await scheduleService.get(getAuthPrincipal(request), params.id);
      response.status(200).json({ data: schedule });
    },
  );

  router.post(
    '/',
    validateRequest({ body: createScheduleBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<CreateScheduleInput>(request);
      const schedule = await scheduleService.create(getAuthPrincipal(request), body);
      response.status(201).json({ data: schedule });
    },
  );

  router.patch(
    '/:id',
    validateRequest({ body: updateScheduleBodySchema, params: scheduleIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<UpdateScheduleInput, ScheduleIdParams>(request);
      const schedule = await scheduleService.update(getAuthPrincipal(request), params.id, body);
      response.status(200).json({ data: schedule });
    },
  );

  router.delete(
    '/:id',
    validateRequest({ params: scheduleIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, ScheduleIdParams>(request);
      await scheduleService.delete(getAuthPrincipal(request), params.id);
      response.sendStatus(204);
    },
  );

  return router;
}

export function createCalendarRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  scheduleService: ScheduleManagementService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get(
    '/events',
    validateRequest({ query: calendarEventQuerySchema }),
    async (request, response) => {
      const { query } = getValidatedRequest<unknown, unknown, CalendarEventQuery>(request);
      const events = await scheduleService.listCalendarEvents(getAuthPrincipal(request), query);
      response.status(200).json({
        data: events,
        meta: { from: query.from, to: query.to, count: events.length },
      });
    },
  );

  return router;
}
