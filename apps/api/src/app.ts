import express, { type Express } from 'express';

import {
  AuthService,
  createAuthRouter,
  PrismaAuthRepository,
  type AuthRegistrationService,
} from './features/auth/index.js';
import { createErrorHandler } from './middleware/error-handler.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { healthRouter } from './routes/health.route.js';

export interface CreateAppOptions {
  apiPrefix: string;
  jsonBodyLimit: string;
  passwordHashRounds: number;
  authRegistrationService?: AuthRegistrationService;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: options.jsonBodyLimit }));

  const authService =
    options.authRegistrationService ??
    new AuthService(new PrismaAuthRepository(), options.passwordHashRounds);

  app.use(`${options.apiPrefix}/health`, healthRouter);
  app.use(`${options.apiPrefix}/auth`, createAuthRouter(authService));

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
