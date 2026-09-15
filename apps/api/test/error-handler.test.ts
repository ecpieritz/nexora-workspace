import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import express from 'express';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { ApiError } from '../src/errors/api-error.js';
import { createErrorHandler } from '../src/middleware/error-handler.middleware.js';
import { testAppOptions } from './test-app-options.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path: string;
  timestamp: string;
}

void describe('centralized API error handling', () => {
  void it('returns the standard response for unknown routes', async () => {
    const response = await request(createApp(testAppOptions)).get('/api/unknown');
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
    assert.equal(body.path, '/api/unknown');
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  void it('handles malformed JSON without exposing parser details', async () => {
    const response = await request(createApp(testAppOptions))
      .post('/api/unknown')
      .set('Content-Type', 'application/json')
      .send('{"invalid":');
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 400);
    assert.deepEqual(body.error, {
      code: 'INVALID_JSON',
      message: 'The request body contains invalid JSON.',
    });
  });

  void it('handles request bodies that exceed the configured limit', async () => {
    const response = await request(createApp({ ...testAppOptions, jsonBodyLimit: '16b' }))
      .post('/api/unknown')
      .send({ content: 'This request body is intentionally too large.' });
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 413);
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  void it('preserves operational error details', async () => {
    const app = express();
    app.get('/customers', () => {
      throw ApiError.conflict('Customer already exists.', { field: 'email' });
    });
    app.use(createErrorHandler());

    const response = await request(app).get('/customers');
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 409);
    assert.deepEqual(body.error, {
      code: 'CONFLICT',
      message: 'Customer already exists.',
      details: { field: 'email' },
    });
  });

  void it('maps known Prisma conflicts without exposing database metadata', async () => {
    const app = express();
    app.get('/users', () => {
      throw Object.assign(new Error('Unique constraint failed on users_email_key.'), {
        code: 'P2002',
      });
    });
    app.use(createErrorHandler());

    const response = await request(app).get('/users');
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 409);
    assert.deepEqual(body.error, {
      code: 'RESOURCE_CONFLICT',
      message: 'A resource with the provided unique data already exists.',
    });
    assert.doesNotMatch(JSON.stringify(body), /users_email_key/);
  });

  void it('logs unexpected errors and returns a safe fallback response', async () => {
    const logEntries: unknown[] = [];
    const app = express();
    app.get('/failure', () => {
      throw new Error('Database password must not reach the response.');
    });
    app.use(
      createErrorHandler({
        logger: {
          error: (_message, context) => logEntries.push(context),
        },
      }),
    );

    const response = await request(app).get('/failure');
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 500);
    assert.deepEqual(body.error, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    });
    assert.doesNotMatch(JSON.stringify(body), /Database password/);
    assert.equal(logEntries.length, 1);
  });
});
