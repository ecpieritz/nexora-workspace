import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  type CreateCustomerInput,
  type Customer,
  type CustomerListQuery,
  type CustomerListResult,
  type CustomerManagementService,
  type UpdateCustomerInput,
} from '../src/features/customers/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const customerId = '40000000-0000-4000-8000-000000000001';
const owner: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const customer: Customer = {
  id: customerId,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+55 85 99999-0000',
  gender: 'male',
  role: 'Product Designer',
  address: '123 Nexora Avenue',
  performance: [35, 48, 42, 61, 58, 72],
  satisfaction: 72,
  retention: 65,
  color: '#625df5',
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

class FakeCustomerService implements CustomerManagementService {
  lastPrincipal: AuthPrincipal | undefined;
  listQuery: CustomerListQuery | undefined;
  created: CreateCustomerInput | undefined;
  updated: { id: string; input: UpdateCustomerInput } | undefined;
  deletedId: string | undefined;

  list(principal: AuthPrincipal, query: CustomerListQuery): Promise<CustomerListResult> {
    this.lastPrincipal = principal;
    this.listQuery = query;
    return Promise.resolve({
      data: [customer],
      meta: { page: query.page, limit: query.limit, total: 1, totalPages: 1 },
    });
  }

  get(principal: AuthPrincipal): Promise<Customer> {
    this.lastPrincipal = principal;
    return Promise.resolve(customer);
  }

  create(principal: AuthPrincipal, input: CreateCustomerInput): Promise<Customer> {
    this.lastPrincipal = principal;
    this.created = input;
    return Promise.resolve(customer);
  }

  update(principal: AuthPrincipal, id: string, input: UpdateCustomerInput): Promise<Customer> {
    this.lastPrincipal = principal;
    this.updated = { id, input };
    return Promise.resolve(customer);
  }

  delete(principal: AuthPrincipal, id: string): Promise<void> {
    this.lastPrincipal = principal;
    this.deletedId = id;
    return Promise.resolve();
  }
}

const jwt = new JwtTokenService({
  secret: testAppOptions.jwtAccessSecret,
  issuer: testAppOptions.jwtIssuer,
  audience: testAppOptions.jwtAudience,
  ttlSeconds: testAppOptions.jwtAccessTtlSeconds,
});

async function authorizationHeader(role: WorkspaceRole = WorkspaceRole.OWNER): Promise<string> {
  return `Bearer ${await jwt.sign({ ...owner, role })}`;
}

const customerInput = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+55 85 99999-0000',
  gender: 'male',
  role: 'Product Designer',
  address: '123 Nexora Avenue',
} as const;

void describe('customer management API', () => {
  void it('requires authentication for customer data', async () => {
    const response = await request(
      createApp({ ...testAppOptions, customerService: new FakeCustomerService() }),
    ).get('/api/customers');

    assert.equal(response.status, 401);
  });

  void it('lists customers with normalized pagination, search and filters', async () => {
    const service = new FakeCustomerService();
    const response = await request(createApp({ ...testAppOptions, customerService: service }))
      .get('/api/customers')
      .set('Authorization', await authorizationHeader())
      .query({
        page: '2',
        limit: '5',
        search: '  john  ',
        gender: 'male',
        sort: 'email',
        order: 'desc',
      });

    assert.equal(response.status, 200);
    assert.deepEqual(service.listQuery, {
      page: 2,
      limit: 5,
      search: 'john',
      gender: 'male',
      sort: 'email',
      order: 'desc',
    });
    assert.equal(service.lastPrincipal?.workspaceId, owner.workspaceId);
  });

  void it('creates customers with allowlisted and normalized input for owners', async () => {
    const service = new FakeCustomerService();
    const response = await request(createApp({ ...testAppOptions, customerService: service }))
      .post('/api/customers')
      .set('Authorization', await authorizationHeader())
      .send({ ...customerInput, firstName: '  John ', email: ' JOHN@EXAMPLE.COM ' });

    assert.equal(response.status, 201);
    assert.deepEqual(service.created, customerInput);
  });

  void it('supports customer detail, partial update and deletion', async () => {
    const service = new FakeCustomerService();
    const app = createApp({ ...testAppOptions, customerService: service });
    const authorization = await authorizationHeader();

    const detail = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', authorization);
    const update = await request(app)
      .patch(`/api/customers/${customerId}`)
      .set('Authorization', authorization)
      .send({ role: '  Design Lead  ' });
    const deletion = await request(app)
      .delete(`/api/customers/${customerId}`)
      .set('Authorization', authorization);

    assert.equal(detail.status, 200);
    assert.equal(update.status, 200);
    assert.deepEqual(service.updated, { id: customerId, input: { role: 'Design Lead' } });
    assert.equal(deletion.status, 204);
    assert.equal(service.deletedId, customerId);
  });

  void it('blocks members from mutations and rejects backend-controlled fields', async () => {
    const service = new FakeCustomerService();
    const app = createApp({ ...testAppOptions, customerService: service });

    const memberResponse = await request(app)
      .post('/api/customers')
      .set('Authorization', await authorizationHeader(WorkspaceRole.MEMBER))
      .send(customerInput);
    const controlledFieldResponse = await request(app)
      .post('/api/customers')
      .set('Authorization', await authorizationHeader())
      .send({ ...customerInput, satisfaction: 100 });

    assert.equal(memberResponse.status, 403);
    assert.equal(controlledFieldResponse.status, 422);
  });
});
