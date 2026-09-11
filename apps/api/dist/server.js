import { createApp } from './app.js';
const port = Number.parseInt(process.env['PORT'] ?? '3000', 10);
const app = createApp();
const server = app.listen(port, () => {
    console.info(`Nexora API listening on http://localhost:${port}`);
});
function shutdown(signal) {
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
//# sourceMappingURL=server.js.map