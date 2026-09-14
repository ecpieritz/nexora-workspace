import { Router } from 'express';

import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import { registerBodySchema, type RegisterInput } from './auth.schemas.js';
import type { AuthRegistrationService } from './auth.service.js';

export function createAuthRouter(authService: AuthRegistrationService): Router {
  const router = Router();

  router.post(
    '/register',
    validateRequest({ body: registerBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<RegisterInput>(request);
      const account = await authService.register(body);

      response.status(201).json({ data: account });
    },
  );

  return router;
}
