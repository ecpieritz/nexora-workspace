import { AppEnvironment } from './environment.model';

export const environment = {
  production: true,
  apiUrl: '/api',
  mockApi: {
    enabled: true,
    delay: 0,
  },
} as const satisfies AppEnvironment;
