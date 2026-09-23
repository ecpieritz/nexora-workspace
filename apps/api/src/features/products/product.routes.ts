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
  createProductBodySchema,
  productAnalyticsQuerySchema,
  productIdParamsSchema,
  productListQuerySchema,
  updateProductBodySchema,
  type CreateProductInput,
  type ProductAnalyticsQuery,
  type ProductIdParams,
  type ProductListQuery,
  type UpdateProductInput,
} from './product.schemas.js';
import type { ProductManagementService } from './product.service.js';

const canManageProducts = requireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN);

export function createProductRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  productService: ProductManagementService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get(
    '/analytics',
    validateRequest({ query: productAnalyticsQuerySchema }),
    async (request, response) => {
      const { query } = getValidatedRequest<unknown, unknown, ProductAnalyticsQuery>(request);
      const analytics = await productService.analytics(getAuthPrincipal(request), query);
      response.status(200).json({ data: analytics });
    },
  );

  router.get('/', validateRequest({ query: productListQuerySchema }), async (request, response) => {
    const { query } = getValidatedRequest<unknown, unknown, ProductListQuery>(request);
    const result = await productService.list(getAuthPrincipal(request), query);
    response.status(200).json(result);
  });

  router.get(
    '/:id',
    validateRequest({ params: productIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, ProductIdParams>(request);
      const product = await productService.get(getAuthPrincipal(request), params.id);
      response.status(200).json({ data: product });
    },
  );

  router.post(
    '/',
    canManageProducts,
    validateRequest({ body: createProductBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<CreateProductInput>(request);
      const product = await productService.create(getAuthPrincipal(request), body);
      response.status(201).json({ data: product });
    },
  );

  router.patch(
    '/:id',
    canManageProducts,
    validateRequest({ body: updateProductBodySchema, params: productIdParamsSchema }),
    async (request, response) => {
      const { body, params } = getValidatedRequest<UpdateProductInput, ProductIdParams>(request);
      const product = await productService.update(getAuthPrincipal(request), params.id, body);
      response.status(200).json({ data: product });
    },
  );

  router.delete(
    '/:id',
    canManageProducts,
    validateRequest({ params: productIdParamsSchema }),
    async (request, response) => {
      const { params } = getValidatedRequest<unknown, ProductIdParams>(request);
      await productService.delete(getAuthPrincipal(request), params.id);
      response.sendStatus(204);
    },
  );

  return router;
}
