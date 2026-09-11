import express from 'express';
import { healthRouter } from './routes/health.route.js';
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/health', healthRouter);
    return app;
}
//# sourceMappingURL=app.js.map