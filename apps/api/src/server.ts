import { createApp } from './app.js';
import { environment } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  console.info('PostgreSQL connection established.');

  const app = createApp(environment);
  const server = app.listen(environment.port, environment.host, () => {
    console.info(
      `Nexora API (${environment.nodeEnv}) listening on http://${environment.host}:${environment.port}${environment.apiPrefix}`,
    );
  });

  async function closeResources(serverError: Error | undefined): Promise<void> {
    try {
      await disconnectDatabase();
    } catch (error) {
      console.error('Failed to disconnect from PostgreSQL.', error);
      process.exitCode = 1;
    }

    if (serverError) {
      console.error('Failed to close the HTTP server.', serverError);
      process.exitCode = 1;
    }
  }

  function shutdown(signal: NodeJS.Signals): void {
    console.info(`${signal} received. Closing the HTTP server.`);

    server.close((error) => {
      void closeResources(error);
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

try {
  await bootstrap();
} catch (error) {
  console.error('Failed to start the Nexora API.', error);

  try {
    await disconnectDatabase();
  } catch (disconnectError) {
    console.error('Failed to disconnect from PostgreSQL.', disconnectError);
  }

  process.exitCode = 1;
}
