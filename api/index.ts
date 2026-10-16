import type { IncomingMessage, ServerResponse } from 'node:http';

import { createApp } from '../apps/api/src/app.js';
import { environment } from '../apps/api/src/config/environment.js';

const forwardedPathParameters = ['__nexora_path', 'path'] as const;
const app = createApp(environment);

type VercelIncomingMessage = IncomingMessage & {
  query?: Record<string, unknown>;
};

function restoreApiRequestUrl(request: IncomingMessage): void {
  const requestUrl = new URL(request.url ?? '/', 'http://nexora.internal');
  const forwardedPath = forwardedPathParameters
    .map((parameter) => requestUrl.searchParams.get(parameter))
    .find((value): value is string => value !== null);

  if (forwardedPath === undefined) {
    return;
  }

  forwardedPathParameters.forEach((parameter) => requestUrl.searchParams.delete(parameter));
  const normalizedPath = forwardedPath.replace(/^\/+/, '');
  const query = requestUrl.searchParams.toString();
  request.url = `/api/${normalizedPath}${query ? `?${query}` : ''}`;

  const vercelQuery = (request as VercelIncomingMessage).query;
  if (vercelQuery) {
    forwardedPathParameters.forEach((parameter) => delete vercelQuery[parameter]);
  }
}

export default function handler(request: IncomingMessage, response: ServerResponse): void {
  restoreApiRequestUrl(request);
  app(request, response);
}
