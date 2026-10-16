import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { testAppOptions } from './test-app-options.js';

interface OpenApiResponse {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: { securitySchemes: Record<string, unknown> };
}

void describe('OpenAPI documentation', () => {
  void it('serves a public OpenAPI 3.1 document for every API area', async () => {
    const app = createApp(testAppOptions);
    const response = await request(app).get('/api/openapi.json');
    const document = response.body as OpenApiResponse;

    assert.equal(response.status, 200);
    assert.equal(document.openapi, '3.1.0');
    assert.equal(document.info.title, 'Nexora Workspace API');
    assert.equal(document.info.version, '1.0.0');
    assert.ok(document.components.securitySchemes['bearerAuth']);
    for (const path of [
      '/health',
      '/openapi.json',
      '/docs',
      '/auth/login',
      '/users/me',
      '/customers',
      '/products',
      '/invoices',
      '/schedules',
      '/calendar/events',
      '/tasks',
      '/dashboard/metrics',
      '/dashboard/reports',
    ]) {
      assert.ok(document.paths[path], `Expected OpenAPI path ${path}.`);
    }

    const operationIds = Object.values(document.paths).flatMap((path) =>
      Object.values(path).flatMap((operation) => {
        if (typeof operation !== 'object' || operation === null || !('operationId' in operation)) {
          return [];
        }
        return [String(operation.operationId)];
      }),
    );
    assert.equal(new Set(operationIds).size, operationIds.length);
  });

  void it('serves Swagger UI configured for the current API prefix', async () => {
    const app = createApp(testAppOptions);
    const response = await request(app).get('/api/docs');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'] ?? '', /^text\/html/);
    assert.match(response.text, /Nexora Workspace API/);
    assert.match(response.text, /\/api\/openapi\.json/);
    assert.match(response.text, /persistAuthorization: true/);
  });
});
