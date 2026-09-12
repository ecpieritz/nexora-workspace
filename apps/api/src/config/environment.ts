import 'dotenv/config';

const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface ApiEnvironment {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  apiPrefix: string;
  jsonBodyLimit: string;
  corsOrigins: readonly string[];
  databaseUrl: string;
  databaseConnectionTimeoutMs: number;
  isProduction: boolean;
}

function readNodeEnvironment(value: string | undefined): NodeEnvironment {
  const nodeEnv = value ?? 'development';
  if (!NODE_ENVIRONMENTS.some((candidate) => candidate === nodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}.`);
  }
  return nodeEnv as NodeEnvironment;
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function readApiPrefix(value: string | undefined): string {
  const prefix = (value ?? '/api').trim();
  if (!prefix.startsWith('/') || prefix === '/') {
    throw new Error('API_PREFIX must start with a slash and contain a path segment.');
  }
  return prefix.replace(/\/+$/, '');
}

function readCorsOrigins(value: string | undefined): readonly string[] {
  const origins = (value ?? 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin.');
  }

  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(`Invalid origin in CORS_ORIGINS: ${origin}.`);
    }
  }

  return origins;
}

function readString(value: string | undefined, fallback: string): string {
  const parsed = value?.trim();
  return parsed && parsed.length > 0 ? parsed : fallback;
}

function readDatabaseUrl(value: string | undefined): string {
  const databaseUrl = readString(value, 'postgresql://nexora:nexora@localhost:5432/nexora');
  const url = new URL(databaseUrl);

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol.');
  }

  return databaseUrl;
}

function readDatabaseConnectionTimeout(value: string | undefined): number {
  const timeout = Number(value ?? '5000');

  if (!Number.isInteger(timeout) || timeout < 1) {
    throw new Error('DATABASE_CONNECTION_TIMEOUT_MS must be a positive integer.');
  }

  return timeout;
}

const nodeEnv = readNodeEnvironment(process.env['NODE_ENV']);

export const environment: Readonly<ApiEnvironment> = Object.freeze({
  nodeEnv,
  host: readString(process.env['HOST'], '0.0.0.0'),
  port: readPort(process.env['PORT']),
  apiPrefix: readApiPrefix(process.env['API_PREFIX']),
  jsonBodyLimit: readString(process.env['JSON_BODY_LIMIT'], '1mb'),
  corsOrigins: Object.freeze(readCorsOrigins(process.env['CORS_ORIGINS'])),
  databaseUrl: readDatabaseUrl(process.env['DATABASE_URL']),
  databaseConnectionTimeoutMs: readDatabaseConnectionTimeout(
    process.env['DATABASE_CONNECTION_TIMEOUT_MS'],
  ),
  isProduction: nodeEnv === 'production',
});
