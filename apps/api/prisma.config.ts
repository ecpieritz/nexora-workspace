import 'dotenv/config';

import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl = 'postgresql://nexora:nexora@localhost:5432/nexora';
const migrationDatabaseUrl =
  process.env['DIRECT_DATABASE_URL']?.trim() ||
  process.env['DATABASE_URL']?.trim() ||
  defaultDatabaseUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
