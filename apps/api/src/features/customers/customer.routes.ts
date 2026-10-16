import { Router } from 'express';

import type { AccessTokenService, AuthenticationContextRepository } from '../auth/index.js';
import { WorkspaceRole } from '../../generated/prisma/client.js';
import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../../middleware/authentication.middleware.js';
import { requireWorkspaceRoles } from '../../middleware/authorization.middleware.js';
import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import {
  createCustomerBodySchema,
  customerIdParamsSchema,
  customerListQuerySchema,
  updateCustomerBodySchema,
  type CreateCustomerInput,
  type CustomerIdParams,
  type CustomerListQuery,
  type UpdateCustomerInput,
} from './customer.schemas.js';
import type { CustomerManagementService } from './customer.service.js';

const canManageCustomers = requireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN);

export function createCustomerRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  customerService: CustomerManagementService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get(
    '/',
    validateRequest({ query: customerListQuerySchema }),
    async (request, response) => {
      const { query } = getValidatedRequest<unknown, unknown, CustomerListQuery>(request);
      const result = await customerService.list(getAuthPrincipal(request), query);
      response.status(200).json(result);
    },
  );

  router.get(
    '/:id',
    validateRequest({ params: customerIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, CustomerIdParams>(request);
      const customer = await customerService.get(getAuthPrincipal(request), params.id);
      response.status(200).json({ data: customer });
    },
  );

  router.post(
    '/',
    canManageCustomers,
    validateRequest({ body: createCustomerBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<CreateCustomerInput>(request);
      const customer = await customerService.create(getAuthPrincipal(request), body);
      response.status(201).json({ data: customer });
    },
  );

  router.patch(
    '/:id',
    canManageCustomers,
    validateRequest({ body: updateCustomerBodySchema, params: customerIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<UpdateCustomerInput, CustomerIdParams>(request);
      const customer = await customerService.update(getAuthPrincipal(request), params.id, body);
      response.status(200).json({ data: customer });
    },
  );

  router.delete(
    '/:id',
    canManageCustomers,
    validateRequest({ params: customerIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, CustomerIdParams>(request);
      await customerService.delete(getAuthPrincipal(request), params.id);
      response.sendStatus(204);
    },
  );

  return router;
}
