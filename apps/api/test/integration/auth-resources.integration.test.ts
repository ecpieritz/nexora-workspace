import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.js';
import { environment } from '../../src/config/environment.js';
import { disconnectDatabase, prisma } from '../../src/database/prisma.js';
import type { AuthenticatedSession, RegisteredAccount } from '../../src/features/auth/index.js';

interface DataResponse<T> {
  data: T;
}

interface ResourceRecord {
  id: string;
  [key: string]: unknown;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
  };
}

const app = createApp(environment);
const password = 'Nexora123!';
const createdAccounts: RegisteredAccount[] = [];

function uniqueCredentials(prefix: string): {
  fullName: string;
  email: string;
  username: string;
  password: string;
} {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  return {
    fullName: `${prefix} Integration`,
    email: `${prefix.toLowerCase()}.${suffix}@example.com`,
    username: `${prefix.toLowerCase()}.${suffix}`,
    password,
  };
}

async function register(prefix: string): Promise<{
  account: RegisteredAccount;
  credentials: ReturnType<typeof uniqueCredentials>;
}> {
  const credentials = uniqueCredentials(prefix);
  const response = await request(app).post('/api/auth/register').send(credentials);
  const body = response.body as unknown as DataResponse<RegisteredAccount>;

  assert.equal(response.status, 201);
  createdAccounts.push(body.data);
  return { account: body.data, credentials };
}

async function login(email: string): Promise<AuthenticatedSession> {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  const body = response.body as unknown as DataResponse<AuthenticatedSession>;

  assert.equal(response.status, 200);
  assert.equal(body.data.tokens.tokenType, 'Bearer');
  return body.data;
}

function authorization(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

after(async () => {
  for (const account of createdAccounts.reverse()) {
    await prisma.workspace.deleteMany({ where: { id: account.workspace.id } });
    await prisma.user.deleteMany({ where: { id: account.user.id } });
  }
  await disconnectDatabase();
});

void describe('authentication integration', () => {
  void it('registers, authenticates, rotates and revokes a real persisted session', async () => {
    const { account, credentials } = await register('Auth');
    const session = await login(credentials.email);
    const profileResponse = await request(app)
      .get('/api/users/me')
      .set('Authorization', authorization(session.tokens.accessToken));
    const profile = profileResponse.body as unknown as DataResponse<{ email: string }>;

    assert.equal(profileResponse.status, 200);
    assert.equal(profile.data.email, credentials.email);

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.tokens.refreshToken });
    const refreshed = refreshResponse.body as unknown as DataResponse<AuthenticatedSession>;

    assert.equal(refreshResponse.status, 200);
    assert.notEqual(refreshed.data.tokens.refreshToken, session.tokens.refreshToken);
    assert.equal(refreshed.data.user.id, account.user.id);

    const replayResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.tokens.refreshToken });
    assert.equal(replayResponse.status, 401);

    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: refreshed.data.tokens.refreshToken });
    assert.equal(logoutResponse.status, 204);

    const revokedResponse = await request(app)
      .get('/api/users/me')
      .set('Authorization', authorization(refreshed.data.tokens.accessToken));
    assert.equal(revokedResponse.status, 401);
  });
});

void describe('workspace resource integration', () => {
  void it('persists and scopes customer, product, invoice, task and schedule workflows', async () => {
    const { credentials } = await register('Resources');
    const session = await login(credentials.email);
    const auth = authorization(session.tokens.accessToken);

    const customerResponse = await request(app)
      .post('/api/customers')
      .set('Authorization', auth)
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: `ada.${randomUUID()}@example.com`,
        phone: '+55 85 99999-0001',
        gender: 'female',
        role: 'Engineering Lead',
        address: '1 Analytical Engine Avenue',
      });
    const customer = customerResponse.body as unknown as DataResponse<ResourceRecord>;
    assert.equal(customerResponse.status, 201);

    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({
        sku: `NXR-${randomUUID().slice(0, 8)}`,
        name: 'Nexora Integration Suite',
        brand: 'Nexora',
        category: 'Software',
        description: 'Product persisted by the API integration test suite.',
        price: 49.9,
        stock: 10,
      });
    const product = productResponse.body as unknown as DataResponse<ResourceRecord>;
    assert.equal(productResponse.status, 201);

    const issuedAt = '2026-09-20T12:00:00.000Z';
    const invoiceResponse = await request(app)
      .post('/api/invoices')
      .set('Authorization', auth)
      .send({
        customerId: customer.data.id,
        customerName: 'Ada Lovelace',
        email: 'ada.lovelace@example.com',
        address: '1 Analytical Engine Avenue',
        issuedAt,
        dueAt: '2026-09-30T12:00:00.000Z',
        currency: 'USD',
        discount: 10,
        items: [
          {
            productId: product.data.id,
            description: 'Nexora Integration Suite license',
            rate: 49.9,
            quantity: 2,
          },
        ],
      });
    const invoice = invoiceResponse.body as unknown as DataResponse<ResourceRecord>;
    assert.equal(invoiceResponse.status, 201);
    assert.equal(invoice.data['total'], 89.82);

    const completedInvoiceResponse = await request(app)
      .patch(`/api/invoices/${invoice.data.id}/status`)
      .set('Authorization', auth)
      .send({ status: 'complete' });
    assert.equal(completedInvoiceResponse.status, 200);

    const taskResponse = await request(app).post('/api/tasks').set('Authorization', auth).send({
      name: 'Verify integration release',
      description: 'Exercise the persisted resource workflow.',
      category: 'development',
      startsAt: '2026-09-21T09:00:00.000Z',
      dueAt: '2026-09-22T18:00:00.000Z',
      assigneeIds: [],
    });
    const task = taskResponse.body as unknown as DataResponse<ResourceRecord>;
    assert.equal(taskResponse.status, 201);

    const taskStatusResponse = await request(app)
      .patch(`/api/tasks/${task.data.id}/status`)
      .set('Authorization', auth)
      .send({ status: 'doing' });
    assert.equal(taskStatusResponse.status, 200);

    const scheduleResponse = await request(app)
      .post('/api/schedules')
      .set('Authorization', auth)
      .send({
        title: 'Integration review',
        description: 'Validate the API and database boundary.',
        location: 'Nexora workspace',
        kind: 'event',
        startsAt: '2026-09-22T14:00:00.000Z',
        endsAt: '2026-09-22T15:00:00.000Z',
        attendeeIds: [],
      });
    const schedule = scheduleResponse.body as unknown as DataResponse<ResourceRecord>;
    assert.equal(scheduleResponse.status, 201);

    const { credentials: observerCredentials } = await register('Observer');
    const observerSession = await login(observerCredentials.email);
    const crossWorkspaceResponse = await request(app)
      .get(`/api/customers/${customer.data.id}`)
      .set('Authorization', authorization(observerSession.tokens.accessToken));
    assert.equal(crossWorkspaceResponse.status, 404);

    const [customers, products, invoices, tasks, calendar] = await Promise.all([
      request(app).get('/api/customers?search=Ada').set('Authorization', auth),
      request(app).get('/api/products?search=Integration').set('Authorization', auth),
      request(app).get('/api/invoices?status=complete').set('Authorization', auth),
      request(app).get('/api/tasks?status=doing').set('Authorization', auth),
      request(app)
        .get('/api/calendar/events?from=2026-09-01&to=2026-09-30')
        .set('Authorization', auth),
    ]);

    for (const response of [customers, products, invoices, tasks, calendar]) {
      assert.equal(response.status, 200);
      const body = response.body as unknown as PaginatedResponse<ResourceRecord>;
      assert.equal(body.data.length, 1);
    }

    const metricsResponse = await request(app)
      .get('/api/dashboard/metrics?from=2026-09-01&to=2026-09-30&currency=USD')
      .set('Authorization', auth);
    assert.equal(metricsResponse.status, 200);

    for (const [path, id] of [
      ['/api/schedules', schedule.data.id],
      ['/api/tasks', task.data.id],
      ['/api/invoices', invoice.data.id],
      ['/api/products', product.data.id],
      ['/api/customers', customer.data.id],
    ]) {
      const deletion = await request(app).delete(`${path}/${id}`).set('Authorization', auth);
      assert.equal(deletion.status, 204);
    }
  });
});
