import { PrismaPg } from '@prisma/adapter-pg';

import { environment } from '../config/environment.js';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: environment.databaseUrl,
  connectionTimeoutMillis: environment.databaseConnectionTimeoutMs,
});

export const prisma = new PrismaClient({
  adapter,
  log: environment.isProduction ? ['error'] : ['warn', 'error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
