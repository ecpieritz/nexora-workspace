import { Router } from 'express';

import { WorkspaceRole } from '../../generated/prisma/client.js';
import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../../middleware/authentication.middleware.js';
import { requireWorkspaceRoles } from '../../middleware/authorization.middleware.js';
import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import type { AccessTokenService, AuthenticationContextRepository } from '../auth/index.js';
import {
  createInvoiceBodySchema,
  invoiceFavoriteBodySchema,
  invoiceIdParamsSchema,
  invoiceListQuerySchema,
  invoiceStatusBodySchema,
  updateInvoiceBodySchema,
  type CreateInvoiceInput,
  type InvoiceFavoriteInput,
  type InvoiceIdParams,
  type InvoiceListQuery,
  type InvoiceStatusInput,
  type UpdateInvoiceInput,
} from './invoice.schemas.js';
import type { InvoiceManagementService } from './invoice.service.js';

const canManageInvoices = requireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN);

export function createInvoiceRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  invoiceService: InvoiceManagementService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get('/', validateRequest({ query: invoiceListQuerySchema }), async (request, response) => {
    const { query } = getValidatedRequest<unknown, unknown, InvoiceListQuery>(request);
    const result = await invoiceService.list(getAuthPrincipal(request), query);
    response.status(200).json(result);
  });

  router.get(
    '/:id',
    validateRequest({ params: invoiceIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, InvoiceIdParams>(request);
      const invoice = await invoiceService.get(getAuthPrincipal(request), params.id);
      response.status(200).json({ data: invoice });
    },
  );

  router.post(
    '/',
    canManageInvoices,
    validateRequest({ body: createInvoiceBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<CreateInvoiceInput>(request);
      const invoice = await invoiceService.create(getAuthPrincipal(request), body);
      response.status(201).json({ data: invoice });
    },
  );

  router.patch(
    '/:id',
    canManageInvoices,
    validateRequest({ body: updateInvoiceBodySchema, params: invoiceIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<UpdateInvoiceInput, InvoiceIdParams>(request);
      const invoice = await invoiceService.update(getAuthPrincipal(request), params.id, body);
      response.status(200).json({ data: invoice });
    },
  );

  router.patch(
    '/:id/status',
    canManageInvoices,
    validateRequest({ body: invoiceStatusBodySchema, params: invoiceIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<InvoiceStatusInput, InvoiceIdParams>(request);
      const invoice = await invoiceService.updateStatus(
        getAuthPrincipal(request),
        params.id,
        body.status,
      );
      response.status(200).json({ data: invoice });
    },
  );

  router.patch(
    '/:id/favorite',
    canManageInvoices,
    validateRequest({ body: invoiceFavoriteBodySchema, params: invoiceIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<InvoiceFavoriteInput, InvoiceIdParams>(request);
      const invoice = await invoiceService.updateFavorite(
        getAuthPrincipal(request),
        params.id,
        body.favorite,
      );
      response.status(200).json({ data: invoice });
    },
  );

  router.delete(
    '/:id',
    canManageInvoices,
    validateRequest({ params: invoiceIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, InvoiceIdParams>(request);
      await invoiceService.delete(getAuthPrincipal(request), params.id);
      response.sendStatus(204);
    },
  );

  return router;
}
