import 'dotenv/config';

import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl = 'postgresql://nexora:nexora@localhost:5432/nexora';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? defaultDatabaseUrl,
  },
});
