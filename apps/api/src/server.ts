import { createApp } from './app.js';
import { environment } from './config/environment.js';

const app = createApp(environment);
const server = app.listen(environment.port, environment.host, () => {
  console.info(
    `Nexora API (${environment.nodeEnv}) listening on http://${environment.host}:${environment.port}${environment.apiPrefix}`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`${signal} received. Closing the HTTP server.`);
  server.close((error) => {
    if (error) {
      console.error('Failed to close the HTTP server.', error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
