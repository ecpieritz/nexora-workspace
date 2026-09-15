import express, { type Express } from 'express';

import {
  AuthService,
  AuthSessionService,
  createAuthRouter,
  JwtTokenService,
  PrismaAuthRepository,
  type AuthenticationService,
  type AuthRegistrationService,
} from './features/auth/index.js';
import {
  createProfileRouter,
  PrismaUserProfileRepository,
  ProfileService,
  type UserProfileService,
} from './features/profile/index.js';
import { createErrorHandler } from './middleware/error-handler.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { healthRouter } from './routes/health.route.js';

export interface CreateAppOptions {
  apiPrefix: string;
  jsonBodyLimit: string;
  passwordHashRounds: number;
  jwtAccessSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtAccessTtlSeconds: number;
  refreshTokenTtlDays: number;
  authRegistrationService?: AuthRegistrationService;
  authenticationService?: AuthenticationService;
  userProfileService?: UserProfileService;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: options.jsonBodyLimit }));

  const authRepository = new PrismaAuthRepository();
  const accessTokens = new JwtTokenService({
    secret: options.jwtAccessSecret,
    issuer: options.jwtIssuer,
    audience: options.jwtAudience,
    ttlSeconds: options.jwtAccessTtlSeconds,
  });
  const registrationService =
    options.authRegistrationService ?? new AuthService(authRepository, options.passwordHashRounds);
  const authenticationService =
    options.authenticationService ??
    new AuthSessionService(authRepository, accessTokens, {
      accessTokenTtlSeconds: options.jwtAccessTtlSeconds,
      refreshTokenTtlDays: options.refreshTokenTtlDays,
    });
  const profileService =
    options.userProfileService ?? new ProfileService(new PrismaUserProfileRepository());

  app.use(`${options.apiPrefix}/health`, healthRouter);
  app.use(
    `${options.apiPrefix}/auth`,
    createAuthRouter(registrationService, authenticationService),
  );
  app.use(`${options.apiPrefix}/users`, createProfileRouter(accessTokens, profileService));

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
