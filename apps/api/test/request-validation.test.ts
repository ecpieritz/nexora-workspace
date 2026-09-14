import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import express from 'express';
import request from 'supertest';
import { z } from 'zod';

import { createErrorHandler } from '../src/middleware/error-handler.middleware.js';
import {
  getValidatedRequest,
  idParamsSchema,
  paginationQuerySchema,
  validateRequest,
  type IdParams,
  type PaginationQuery,
} from '../src/validation/index.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details: {
      issues: { code: string; message: string; path: string }[];
    };
  };
}

interface CreateCustomerBody {
  email: string;
  fullName: string;
}

const createCustomerBodySchema = z.strictObject({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'Email must be valid.' })),
  fullName: z.string().trim().min(3).max(120),
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/customers/:id',
    validateRequest({
      body: createCustomerBodySchema,
      params: idParamsSchema,
      query: paginationQuerySchema,
    }),
    (request, response) => {
      const validated = getValidatedRequest<CreateCustomerBody, IdParams, PaginationQuery>(request);
      response.status(200).json(validated);
    },
  );
  app.use(createErrorHandler());
  return app;
}

void describe('request validation', () => {
  void it('provides parsed values, query coercion and defaults to the route handler', async () => {
    const response = await request(createTestApp())
      .post('/customers/40000000-0000-4000-8000-000000000001?page=2')
      .send({ email: '  USER@EXAMPLE.COM  ', fullName: '  John Doe  ' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      body: { email: 'USER@EXAMPLE.COM', fullName: 'John Doe' },
      params: { id: '40000000-0000-4000-8000-000000000001' },
      query: { page: 2, limit: 20 },
    });
  });

  void it('returns all body, parameter and query issues in the standard error response', async () => {
    const response = await request(createTestApp())
      .post('/customers/not-a-uuid?page=0&unknown=true')
      .send({ email: 'invalid-email', fullName: 'A', unexpected: true });
    const body = response.body as unknown as ErrorResponseBody;
    const paths = body.error.details.issues.map((issue) => issue.path);

    assert.equal(response.status, 422);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.message, 'The request contains invalid data.');
    assert.ok(paths.includes('body.email'));
    assert.ok(paths.includes('body.fullName'));
    assert.ok(paths.includes('body'));
    assert.ok(paths.includes('params.id'));
    assert.ok(paths.includes('query.page'));
    assert.ok(paths.includes('query'));
  });

  void it('supports asynchronous schema refinements', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/accounts',
      validateRequest({
        body: z.object({
          username: z.string().refine((username) => Promise.resolve(username !== 'reserved'), {
            error: 'Username is already reserved.',
          }),
        }),
      }),
      (_request, response) => response.sendStatus(204),
    );
    app.use(createErrorHandler());

    const response = await request(app).post('/accounts').send({ username: 'reserved' });
    const body = response.body as unknown as ErrorResponseBody;

    assert.equal(response.status, 422);
    assert.deepEqual(body.error.details.issues, [
      {
        code: 'custom',
        message: 'Username is already reserved.',
        path: 'body.username',
      },
    ]);
  });
});
