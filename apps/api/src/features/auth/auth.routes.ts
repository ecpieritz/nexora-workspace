import { Router, type Request } from 'express';

import { getValidatedRequest, validateRequest } from '../../validation/index.js';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshTokenBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshTokenInput,
  type RegisterInput,
  type ResetPasswordInput,
} from './auth.schemas.js';
import type { PasswordRecoveryService } from './password-recovery.service.js';
import type { AuthenticationService } from './auth-session.service.js';
import type { AuthRegistrationService } from './auth.service.js';
import type { SessionMetadata } from './auth.types.js';

function createSessionMetadata(request: Request): SessionMetadata {
  const userAgent = request.get('user-agent');
  const ipAddress = request.ip;

  return {
    ...(ipAddress === undefined ? {} : { ipAddress }),
    ...(userAgent === undefined ? {} : { userAgent: userAgent.slice(0, 500) }),
  };
}

export function createAuthRouter(
  registrationService: AuthRegistrationService,
  authenticationService: AuthenticationService,
  passwordRecoveryService: PasswordRecoveryService,
): Router {
  const router = Router();

  router.post(
    '/register',
    validateRequest({ body: registerBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<RegisterInput>(request);
      const account = await registrationService.register(body);

      response.status(201).json({ data: account });
    },
  );

  router.post('/login', validateRequest({ body: loginBodySchema }), async (request, response) => {
    const { body } = getValidatedRequest<LoginInput>(request);
    const session = await authenticationService.login(body, createSessionMetadata(request));

    response.status(200).json({ data: session });
  });

  router.post(
    '/refresh',
    validateRequest({ body: refreshTokenBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<RefreshTokenInput>(request);
      const session = await authenticationService.refresh(body, createSessionMetadata(request));

      response.status(200).json({ data: session });
    },
  );

  router.post(
    '/logout',
    validateRequest({ body: refreshTokenBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<RefreshTokenInput>(request);
      await authenticationService.logout(body);
      response.sendStatus(204);
    },
  );

  router.post(
    '/forgot-password',
    validateRequest({ body: forgotPasswordBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<ForgotPasswordInput>(request);
      await passwordRecoveryService.requestReset(body);
      response.status(202).json({
        data: {
          message: 'If an account exists for this email, password reset instructions were sent.',
        },
      });
    },
  );

  router.post(
    '/reset-password',
    validateRequest({ body: resetPasswordBodySchema }),
    async (request, response) => {
      const { body } = getValidatedRequest<ResetPasswordInput>(request);
      await passwordRecoveryService.resetPassword(body);
      response.sendStatus(204);
    },
  );

  return router;
}
