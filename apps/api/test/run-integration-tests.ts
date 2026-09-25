import 'dotenv/config';

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultTestDatabaseUrl = 'postgresql://nexora:nexora@localhost:5433/nexora_test';
const configuredTestDatabaseUrl = process.env['TEST_DATABASE_URL']?.trim();
const testDatabaseUrl = configuredTestDatabaseUrl?.length
  ? configuredTestDatabaseUrl
  : defaultTestDatabaseUrl;
const parsedDatabaseUrl = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(
  parsedDatabaseUrl.pathname.replace(/^\//, ''),
).toLowerCase();

if (!databaseName.includes('test')) {
  throw new Error(
    `Refusing to run integration tests against database "${databaseName}". TEST_DATABASE_URL must target a database whose name contains "test".`,
  );
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const apiRoot = fileURLToPath(new URL('../', import.meta.url));
const testEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  JWT_ACCESS_SECRET:
    process.env['JWT_ACCESS_SECRET'] ?? 'nexora-integration-test-secret-at-least-32-bytes',
  JWT_ISSUER: process.env['JWT_ISSUER'] ?? 'nexora-api-integration-test',
  JWT_AUDIENCE: process.env['JWT_AUDIENCE'] ?? 'nexora-web-integration-test',
  PASSWORD_HASH_ROUNDS: process.env['PASSWORD_HASH_ROUNDS'] ?? '10',
};

function runScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ['run', script], {
      cwd: apiRoot,
      env: testEnvironment,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `npm run ${script} was terminated by ${signal}.`
            : `npm run ${script} exited with code ${String(code)}.`,
        ),
      );
    });
  });
}

await runScript('prisma:migrate:deploy');
await runScript('test:integration:execute');
