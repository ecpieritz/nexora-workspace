import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  InvoiceService,
  type CreateInvoiceInput,
  type Invoice,
  type InvoiceListQuery,
  type InvoiceListResult,
  type InvoiceManagementService,
  type InvoicePage,
  type InvoiceReferenceInput,
  type InvoiceRepository,
  type InvoiceStatusValue,
  type InvoiceWriteInput,
  type UpdateInvoiceInput,
} from '../src/features/invoices/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const invoiceId = '70000000-0000-4000-8000-000000000001';
const customerId = '40000000-0000-4000-8000-000000000001';
const productId = '50000000-0000-4000-8000-000000000001';
const owner: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const invoice: Invoice = {
  id: invoiceId,
  number: 'INV-2026-ABC12345',
  customerId,
  customerName: 'John Doe',
  email: 'john@example.com',
  address: 'Nexora Avenue, 10',
  issuedAt: '2026-08-10T10:00:00.000Z',
  dueAt: '2026-08-20T10:00:00.000Z',
  status: 'pending',
  favorite: false,
  currency: 'USD',
  discount: 10,
  subtotal: 250,
  total: 225,
  items: [
    {
      id: '80000000-0000-4000-8000-000000000001',
      productId,
      description: 'Workspace subscription',
      rate: 125,
      quantity: 2,
      amount: 250,
    },
  ],
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

class FakeInvoiceService implements InvoiceManagementService {
  listQuery: InvoiceListQuery | undefined;
  created: CreateInvoiceInput | undefined;
  updated: { id: string; input: UpdateInvoiceInput } | undefined;
  status: InvoiceStatusValue | undefined;
  favorite: boolean | undefined;
  deletedId: string | undefined;

  list(_principal: AuthPrincipal, query: InvoiceListQuery): Promise<InvoiceListResult> {
    this.listQuery = query;
    return Promise.resolve({
      data: [invoice],
      meta: { page: query.page, limit: query.limit, total: 1, totalPages: 1 },
    });
  }

  get(): Promise<Invoice> {
    return Promise.resolve(invoice);
  }

  create(_principal: AuthPrincipal, input: CreateInvoiceInput): Promise<Invoice> {
    this.created = input;
    return Promise.resolve(invoice);
  }

  update(_principal: AuthPrincipal, id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    this.updated = { id, input };
    return Promise.resolve(invoice);
  }

  updateStatus(
    _principal: AuthPrincipal,
    _id: string,
    status: InvoiceStatusValue,
  ): Promise<Invoice> {
    this.status = status;
    return Promise.resolve(invoice);
  }

  updateFavorite(_principal: AuthPrincipal, _id: string, favorite: boolean): Promise<Invoice> {
    this.favorite = favorite;
    return Promise.resolve(invoice);
  }

  delete(_principal: AuthPrincipal, id: string): Promise<void> {
    this.deletedId = id;
    return Promise.resolve();
  }
}

class FakeInvoiceRepository implements InvoiceRepository {
  referencesAreValid = true;
  references: InvoiceReferenceInput | undefined;
  writeInput: InvoiceWriteInput | undefined;

  list(): Promise<InvoicePage> {
    return Promise.resolve({ items: [], total: 0 });
  }

  findById(): Promise<Invoice | null> {
    return Promise.resolve(invoice);
  }

  referencesExist(_workspaceId: string, references: InvoiceReferenceInput): Promise<boolean> {
    this.references = references;
    return Promise.resolve(this.referencesAreValid);
  }

  create(_workspaceId: string, _createdById: string, input: InvoiceWriteInput): Promise<Invoice> {
    this.writeInput = input;
    return Promise.resolve(invoice);
  }

  update(): Promise<Invoice | null> {
    return Promise.resolve(invoice);
  }

  updateStatus(): Promise<Invoice | null> {
    return Promise.resolve(invoice);
  }

  updateFavorite(): Promise<Invoice | null> {
    return Promise.resolve(invoice);
  }

  delete(): Promise<boolean> {
    return Promise.resolve(true);
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

const createInput = {
  customerId,
  customerName: 'John Doe',
  email: 'JOHN@EXAMPLE.COM',
  issuedAt: '2026-08-10T10:00:00.000Z',
  discount: 10,
  items: [{ productId, description: 'Workspace subscription', rate: 125, quantity: 2 }],
} as const;

void describe('invoice management API', () => {
  void it('requires authentication and normalizes list filters', async () => {
    const service = new FakeInvoiceService();
    const app = createApp({ ...testAppOptions, invoiceService: service });

    const unauthorized = await request(app).get('/api/invoices');
    const authorized = await request(app)
      .get('/api/invoices')
      .set('Authorization', await authorizationHeader())
      .query({ search: '  John ', status: 'pending', favorite: 'true', sort: 'total' });

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
    assert.deepEqual(service.listQuery, {
      page: 1,
      limit: 20,
      search: 'John',
      status: 'pending',
      favorite: true,
      sort: 'total',
      order: 'desc',
    });
  });

  void it('creates invoices with normalized defaults and blocks member mutations', async () => {
    const service = new FakeInvoiceService();
    const app = createApp({ ...testAppOptions, invoiceService: service });

    const created = await request(app)
      .post('/api/invoices')
      .set('Authorization', await authorizationHeader())
      .send(createInput);
    const denied = await request(app)
      .post('/api/invoices')
      .set('Authorization', await authorizationHeader(WorkspaceRole.MEMBER))
      .send(createInput);

    assert.equal(created.status, 201);
    assert.equal(service.created?.email, 'john@example.com');
    assert.equal(service.created?.currency, 'USD');
    assert.equal(denied.status, 403);
  });

  void it('supports invoice details, editing, status, favorite and deletion', async () => {
    const service = new FakeInvoiceService();
    const app = createApp({ ...testAppOptions, invoiceService: service });
    const authorization = await authorizationHeader();

    const detail = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', authorization);
    const update = await request(app)
      .patch(`/api/invoices/${invoiceId}`)
      .set('Authorization', authorization)
      .send({ customerName: 'Jane Doe' });
    const status = await request(app)
      .patch(`/api/invoices/${invoiceId}/status`)
      .set('Authorization', authorization)
      .send({ status: 'complete' });
    const favorite = await request(app)
      .patch(`/api/invoices/${invoiceId}/favorite`)
      .set('Authorization', authorization)
      .send({ favorite: true });
    const deletion = await request(app)
      .delete(`/api/invoices/${invoiceId}`)
      .set('Authorization', authorization);

    assert.equal(detail.status, 200);
    assert.equal(update.status, 200);
    assert.deepEqual(service.updated, { id: invoiceId, input: { customerName: 'Jane Doe' } });
    assert.equal(status.status, 200);
    assert.equal(service.status, 'complete');
    assert.equal(favorite.status, 200);
    assert.equal(service.favorite, true);
    assert.equal(deletion.status, 204);
    assert.equal(service.deletedId, invoiceId);
  });

  void it('calculates item amounts and discounted totals on the server', async () => {
    const repository = new FakeInvoiceRepository();
    const service = new InvoiceService(repository);

    await service.create(owner, {
      customerId,
      customerName: 'John Doe',
      email: 'john@example.com',
      issuedAt: '2026-08-10T10:00:00.000Z',
      currency: 'USD',
      discount: 10,
      items: [
        { productId, description: 'Consulting', rate: 19.99, quantity: 3 },
        { description: 'Support', rate: 5, quantity: 2 },
      ],
    });

    assert.deepEqual(repository.references, { customerId, productIds: [productId] });
    assert.equal(repository.writeInput?.subtotal, 69.97);
    assert.equal(repository.writeInput?.total, 62.97);
    assert.deepEqual(
      repository.writeInput?.items.map(({ amount }) => amount),
      [59.97, 10],
    );
    assert.match(repository.writeInput?.number ?? '', /^INV-\d{4}-[A-F0-9]{8}$/);
  });
});
