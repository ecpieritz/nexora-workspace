import type { CreateAppOptions } from '../src/app.js';
import type { AuthenticationContextRepository } from '../src/features/auth/index.js';

const activeAuthenticationContexts: AuthenticationContextRepository = {
  findActivePrincipal: (principal) => Promise.resolve(principal),
};

export const testAppOptions = {
  apiPrefix: '/api',
  jsonBodyLimit: '1mb',
  passwordHashRounds: 12,
  jwtAccessSecret: 'nexora-test-access-secret-at-least-32-bytes',
  jwtIssuer: 'nexora-api-test',
  jwtAudience: 'nexora-web-test',
  jwtAccessTtlSeconds: 900,
  refreshTokenTtlDays: 7,
  passwordResetTtlMinutes: 30,
  passwordResetUrl: 'http://localhost:4200/auth/reset-password',
  isProduction: false,
  authenticationContextRepository: activeAuthenticationContexts,
} satisfies CreateAppOptions;
