import express, { type Express } from 'express';

import { createErrorHandler } from './middleware/error-handler.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { healthRouter } from './routes/health.route.js';

export interface CreateAppOptions {
  apiPrefix: string;
  jsonBodyLimit: string;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: options.jsonBodyLimit }));

  app.use(`${options.apiPrefix}/health`, healthRouter);

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
