import { createApp } from '../apps/api/src/app.js';
import { environment } from '../apps/api/src/config/environment.js';

const app = createApp(environment);

export default app;
