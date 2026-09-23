import { Router } from 'express';

import type { AccessTokenService, AuthenticationContextRepository } from '../auth/index.js';
import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../../middleware/authentication.middleware.js';
import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import { updateProfileBodySchema, type UpdateProfileInput } from './profile.schemas.js';
import type { UserProfileService } from './profile.service.js';

export function createProfileRouter(
  accessTokens: AccessTokenService,
  authenticationContexts: AuthenticationContextRepository,
  profileService: UserProfileService,
): Router {
  const router = Router();
  router.use(createAuthenticationMiddleware(accessTokens, authenticationContexts));

  router.get('/me', async (request, response) => {
    const profile = await profileService.get(getAuthPrincipal(request));
    response.status(200).json({ data: profile });
  });

  router.patch(
    '/me',
    validateRequest({ body: updateProfileBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<UpdateProfileInput>(request);
      const profile = await profileService.update(getAuthPrincipal(request), body);
      response.status(200).json({ data: profile });
    },
  );

  return router;
}
