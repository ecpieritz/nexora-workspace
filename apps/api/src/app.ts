import express, { type Express } from 'express';

import {
  AuthService,
  AuthSessionService,
  AuthPasswordRecoveryService,
  ConsolePasswordResetNotifier,
  createAuthRouter,
  JwtTokenService,
  DisabledPasswordResetNotifier,
  PrismaAuthRepository,
  type AuthenticationService,
  type AuthRegistrationService,
  type PasswordRecoveryService,
  type PasswordResetNotifier,
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
  passwordResetTtlMinutes: number;
  passwordResetUrl: string;
  isProduction: boolean;
  authRegistrationService?: AuthRegistrationService;
  authenticationService?: AuthenticationService;
  passwordRecoveryService?: PasswordRecoveryService;
  passwordResetNotifier?: PasswordResetNotifier;
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
  const passwordResetNotifier =
    options.passwordResetNotifier ??
    (options.isProduction
      ? new DisabledPasswordResetNotifier()
      : new ConsolePasswordResetNotifier(options.passwordResetUrl));
  const passwordRecoveryService =
    options.passwordRecoveryService ??
    new AuthPasswordRecoveryService(authRepository, passwordResetNotifier, {
      passwordHashRounds: options.passwordHashRounds,
      resetTokenTtlMinutes: options.passwordResetTtlMinutes,
    });
  const profileService =
    options.userProfileService ?? new ProfileService(new PrismaUserProfileRepository());

  app.use(`${options.apiPrefix}/health`, healthRouter);
  app.use(
    `${options.apiPrefix}/auth`,
    createAuthRouter(registrationService, authenticationService, passwordRecoveryService),
  );
  app.use(`${options.apiPrefix}/users`, createProfileRouter(accessTokens, profileService));

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
