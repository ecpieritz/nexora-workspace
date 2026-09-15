import type { CreateAppOptions } from '../src/app.js';

export const testAppOptions = {
  apiPrefix: '/api',
  jsonBodyLimit: '1mb',
  passwordHashRounds: 12,
  jwtAccessSecret: 'nexora-test-access-secret-at-least-32-bytes',
  jwtIssuer: 'nexora-api-test',
  jwtAudience: 'nexora-web-test',
  jwtAccessTtlSeconds: 900,
  refreshTokenTtlDays: 7,
} satisfies CreateAppOptions;
