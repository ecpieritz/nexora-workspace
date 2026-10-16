import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  ProductService,
  type CreateProductInput,
  type Product,
  type ProductAnalytics,
  type ProductAnalyticsQuery,
  type ProductAnalyticsRange,
  type ProductAnalyticsSource,
  type ProductListQuery,
  type ProductListResult,
  type ProductManagementService,
  type ProductPage,
  type ProductRepository,
  type UpdateProductInput,
} from '../src/features/products/index.js';
import { InvoiceStatus, WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const productId = '50000000-0000-4000-8000-000000000001';
const owner: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const product: Product = {
  id: productId,
  sku: 'NXR-AUD-001',
  name: 'Bluetooth Devices',
  brand: 'Nexora Audio',
  category: 'Audio',
  description: 'Wireless audio product for daily use.',
  price: 10,
  negotiable: false,
  stock: 180,
  active: true,
  createdAt: '2026-01-10T12:00:00.000Z',
  updatedAt: '2026-01-10T12:00:00.000Z',
};

const emptyAnalytics: ProductAnalytics = {
  range: { from: '2026-01-01', to: '2026-03-31' },
  metrics: [],
  ranking: [],
  monthlySales: [],
  distribution: [],
};

class FakeProductService implements ProductManagementService {
  lastPrincipal: AuthPrincipal | undefined;
  listQuery: ProductListQuery | undefined;
  analyticsQuery: ProductAnalyticsQuery | undefined;
  created: CreateProductInput | undefined;
  updated: { id: string; input: UpdateProductInput } | undefined;
  deletedId: string | undefined;

  list(principal: AuthPrincipal, query: ProductListQuery): Promise<ProductListResult> {
    this.lastPrincipal = principal;
    this.listQuery = query;
    return Promise.resolve({
      data: [product],
      meta: { page: query.page, limit: query.limit, total: 1, totalPages: 1 },
    });
  }

  get(principal: AuthPrincipal): Promise<Product> {
    this.lastPrincipal = principal;
    return Promise.resolve(product);
  }

  create(principal: AuthPrincipal, input: CreateProductInput): Promise<Product> {
    this.lastPrincipal = principal;
    this.created = input;
    return Promise.resolve(product);
  }

  update(principal: AuthPrincipal, id: string, input: UpdateProductInput): Promise<Product> {
    this.lastPrincipal = principal;
    this.updated = { id, input };
    return Promise.resolve(product);
  }

  delete(principal: AuthPrincipal, id: string): Promise<void> {
    this.lastPrincipal = principal;
    this.deletedId = id;
    return Promise.resolve();
  }

  analytics(principal: AuthPrincipal, query: ProductAnalyticsQuery): Promise<ProductAnalytics> {
    this.lastPrincipal = principal;
    this.analyticsQuery = query;
    return Promise.resolve(emptyAnalytics);
  }
}

class FakeProductRepository implements ProductRepository {
  analyticsSource: ProductAnalyticsSource = { products: [], invoiceStatuses: [] };
  analyticsRange: ProductAnalyticsRange | undefined;

  list(): Promise<ProductPage> {
    return Promise.resolve({ items: [], total: 0 });
  }

  findById(): Promise<Product | null> {
    return Promise.resolve(null);
  }

  create(): Promise<Product> {
    return Promise.resolve(product);
  }

  update(): Promise<Product | null> {
    return Promise.resolve(null);
  }

  delete(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getAnalyticsSource(
    _workspaceId: string,
    range: ProductAnalyticsRange,
  ): Promise<ProductAnalyticsSource> {
    this.analyticsRange = range;
    return Promise.resolve(this.analyticsSource);
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
  name: 'MacBook Pro 14',
  brand: 'Apple',
  category: 'Computers',
  description: 'Portable computer for professional creative work.',
  price: 1200,
  negotiable: true,
} as const;

void describe('product management and analytics API', () => {
  void it('requires authentication and normalizes product list filters', async () => {
    const service = new FakeProductService();
    const app = createApp({ ...testAppOptions, productService: service });

    const unauthorized = await request(app).get('/api/products');
    const authorized = await request(app)
      .get('/api/products')
      .set('Authorization', await authorizationHeader())
      .query({ search: '  audio ', category: ' Audio ', active: 'true', sort: 'price' });

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
    assert.deepEqual(service.listQuery, {
      page: 1,
      limit: 20,
      search: 'audio',
      category: 'Audio',
      active: true,
      sort: 'price',
      order: 'asc',
    });
  });

  void it('creates products with defaults and blocks member mutations', async () => {
    const service = new FakeProductService();
    const app = createApp({ ...testAppOptions, productService: service });

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', await authorizationHeader())
      .send({ ...createInput, sku: ' nxr-pro-001 ' });
    const denied = await request(app)
      .post('/api/products')
      .set('Authorization', await authorizationHeader(WorkspaceRole.MEMBER))
      .send(createInput);

    assert.equal(created.status, 201);
    assert.deepEqual(service.created, {
      ...createInput,
      sku: 'NXR-PRO-001',
      stock: 0,
      active: true,
    });
    assert.equal(denied.status, 403);
  });

  void it('supports product detail, partial update and deletion', async () => {
    const service = new FakeProductService();
    const app = createApp({ ...testAppOptions, productService: service });
    const authorization = await authorizationHeader();

    const detail = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', authorization);
    const update = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', authorization)
      .send({ stock: 25, active: false });
    const deletion = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', authorization);

    assert.equal(detail.status, 200);
    assert.equal(update.status, 200);
    assert.deepEqual(service.updated, { id: productId, input: { stock: 25, active: false } });
    assert.equal(deletion.status, 204);
    assert.equal(service.deletedId, productId);
  });

  void it('validates bounded analytics date ranges before invoking the service', async () => {
    const service = new FakeProductService();
    const app = createApp({ ...testAppOptions, productService: service });
    const authorization = await authorizationHeader();

    const valid = await request(app)
      .get('/api/products/analytics?from=2026-01-01&to=2026-03-31')
      .set('Authorization', authorization);
    const invalid = await request(app)
      .get('/api/products/analytics?from=2026-04-01&to=2026-03-31')
      .set('Authorization', authorization);

    assert.equal(valid.status, 200);
    assert.deepEqual(service.analyticsQuery, { from: '2026-01-01', to: '2026-03-31' });
    assert.equal(invalid.status, 422);
  });

  void it('derives ranking, monthly totals, metrics and order distribution', async () => {
    const repository = new FakeProductRepository();
    repository.analyticsSource = {
      products: [
        {
          id: productId,
          name: 'Bluetooth Devices',
          category: 'Audio',
          price: 10,
          createdAt: new Date('2026-01-10T12:00:00.000Z'),
          sales: [
            { quantity: 2, amount: 100, issuedAt: new Date('2026-01-20T12:00:00.000Z') },
            { quantity: 3, amount: 300, issuedAt: new Date('2026-03-20T12:00:00.000Z') },
          ],
        },
        {
          id: '50000000-0000-4000-8000-000000000002',
          name: 'AirPods',
          category: 'Audio',
          price: 15,
          createdAt: new Date('2025-12-10T12:00:00.000Z'),
          sales: [],
        },
      ],
      invoiceStatuses: [
        { status: InvoiceStatus.COMPLETE, count: 3 },
        { status: InvoiceStatus.PENDING, count: 1 },
        { status: InvoiceStatus.CANCELLED, count: 1 },
      ],
    };

    const analytics = await new ProductService(repository).analytics(owner, {
      from: '2026-01-01',
      to: '2026-03-31',
    });

    assert.deepEqual(analytics.metrics, [
      {
        id: 'products',
        label: 'Total products',
        value: 2,
        change: '+1 new',
        trend: [1, 0, 0],
      },
      {
        id: 'sales',
        label: 'Total sales',
        value: 400,
        change: '5 orders',
        trend: [100, 0, 300],
      },
    ]);
    assert.deepEqual(analytics.ranking[0], {
      id: productId,
      name: 'Bluetooth Devices',
      category: 'Audio',
      price: 10,
      orders: 5,
      sales: 400,
    });
    assert.deepEqual(
      analytics.distribution.map(({ value }) => value),
      [60, 20, 20],
    );
    assert.equal(repository.analyticsRange?.from.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(repository.analyticsRange?.to.toISOString(), '2026-03-31T23:59:59.999Z');
  });
});
