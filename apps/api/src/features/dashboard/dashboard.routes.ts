import { Router } from 'express';

import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../../middleware/authentication.middleware.js';
import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import type { AccessTokenService, AuthenticationContextRepository } from '../auth/index.js';
import {
  dashboardMetricsQuerySchema,
  dashboardReportsQuerySchema,
  type DashboardMetricsQuery,
  type DashboardReportsQuery,
} from './dashboard.schemas.js';
import type { DashboardReportingService } from './dashboard.service.js';

export function createDashboardRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  dashboardService: DashboardReportingService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get(
    '/metrics',
    validateRequest({ query: dashboardMetricsQuerySchema }),
    async (request, response) => {
      const { query } = getValidatedRequest<unknown, unknown, DashboardMetricsQuery>(request);
      const result = await dashboardService.metrics(getAuthPrincipal(request), query);
      response.status(200).json(result);
    },
  );

  router.get(
    '/reports',
    validateRequest({ query: dashboardReportsQuerySchema }),
    async (request, response) => {
      const { query } = getValidatedRequest<unknown, unknown, DashboardReportsQuery>(request);
      const result = await dashboardService.reports(getAuthPrincipal(request), query);
      response.status(200).json(result);
    },
  );

  return router;
}
