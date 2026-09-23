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
  type AuthenticationContextRepository,
  type AuthRegistrationService,
  type PasswordRecoveryService,
  type PasswordResetNotifier,
} from './features/auth/index.js';
import {
  createCustomerRouter,
  CustomerService,
  PrismaCustomerRepository,
  type CustomerManagementService,
} from './features/customers/index.js';
import {
  createProfileRouter,
  PrismaUserProfileRepository,
  ProfileService,
  type UserProfileService,
} from './features/profile/index.js';
import {
  createProductRouter,
  PrismaProductRepository,
  ProductService,
  type ProductManagementService,
} from './features/products/index.js';
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
  authenticationContextRepository?: AuthenticationContextRepository;
  passwordRecoveryService?: PasswordRecoveryService;
  passwordResetNotifier?: PasswordResetNotifier;
  userProfileService?: UserProfileService;
  customerService?: CustomerManagementService;
  productService?: ProductManagementService;
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
  const authenticationContexts = options.authenticationContextRepository ?? authRepository;
  const customerService =
    options.customerService ?? new CustomerService(new PrismaCustomerRepository());
  const productService =
    options.productService ?? new ProductService(new PrismaProductRepository());

  app.use(`${options.apiPrefix}/health`, healthRouter);
  app.use(
    `${options.apiPrefix}/auth`,
    createAuthRouter(registrationService, authenticationService, passwordRecoveryService),
  );
  app.use(
    `${options.apiPrefix}/customers`,
    createCustomerRouter(accessTokens, authenticationContexts, customerService),
  );
  app.use(
    `${options.apiPrefix}/products`,
    createProductRouter(accessTokens, authenticationContexts, productService),
  );
  app.use(
    `${options.apiPrefix}/users`,
    createProfileRouter(accessTokens, authenticationContexts, profileService),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
