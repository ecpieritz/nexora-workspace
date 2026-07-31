import { AppEnvironment } from './environment.model';

export const environment = {
  production: false,
  apiUrl: '/api',
  mockApi: {
    enabled: true,
    delay: 400,
  },
} as const satisfies AppEnvironment;
