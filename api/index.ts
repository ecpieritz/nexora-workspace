import type { IncomingMessage, ServerResponse } from 'node:http';

import { createApp } from '../apps/api/src/app.js';
import { environment } from '../apps/api/src/config/environment.js';

const forwardedPathParameter = '__nexora_path';
const app = createApp(environment);

function restoreApiRequestUrl(request: IncomingMessage): void {
  const requestUrl = new URL(request.url ?? '/', 'http://nexora.internal');
  const forwardedPath = requestUrl.searchParams.get(forwardedPathParameter);

  if (forwardedPath === null) {
    return;
  }

  requestUrl.searchParams.delete(forwardedPathParameter);
  const normalizedPath = forwardedPath.replace(/^\/+/, '');
  const query = requestUrl.searchParams.toString();
  request.url = `/api/${normalizedPath}${query ? `?${query}` : ''}`;
}

export default function handler(request: IncomingMessage, response: ServerResponse): void {
  restoreApiRequestUrl(request);
  app(request, response);
}
