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
  passwordHashRounds: number;
  jwtAccessSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtAccessTtlSeconds: number;
  refreshTokenTtlDays: number;
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

function readPasswordHashRounds(value: string | undefined): number {
  const rounds = Number(value ?? '12');

  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 14) {
    throw new Error('PASSWORD_HASH_ROUNDS must be an integer between 10 and 14.');
  }

  return rounds;
}

function readPositiveInteger(name: string, value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function readJwtSecret(value: string | undefined, nodeEnv: NodeEnvironment): string {
  const suppliedSecret = value?.trim();
  const secret = readString(value, 'nexora-local-jwt-secret-change-before-deployment');

  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 UTF-8 bytes.');
  }

  if (nodeEnv === 'production' && !suppliedSecret) {
    throw new Error('JWT_ACCESS_SECRET is required in production.');
  }

  return secret;
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
  passwordHashRounds: readPasswordHashRounds(process.env['PASSWORD_HASH_ROUNDS']),
  jwtAccessSecret: readJwtSecret(process.env['JWT_ACCESS_SECRET'], nodeEnv),
  jwtIssuer: readString(process.env['JWT_ISSUER'], 'nexora-api'),
  jwtAudience: readString(process.env['JWT_AUDIENCE'], 'nexora-web'),
  jwtAccessTtlSeconds: readPositiveInteger(
    'JWT_ACCESS_TTL_SECONDS',
    process.env['JWT_ACCESS_TTL_SECONDS'],
    900,
  ),
  refreshTokenTtlDays: readPositiveInteger(
    'REFRESH_TOKEN_TTL_DAYS',
    process.env['REFRESH_TOKEN_TTL_DAYS'],
    7,
  ),
  isProduction: nodeEnv === 'production',
});
