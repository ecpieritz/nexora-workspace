import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  DashboardService,
  type DashboardMetricsQuery,
  type DashboardMetricsResult,
  type DashboardRange,
  type DashboardReportingService,
  type DashboardReportsQuery,
  type DashboardReportsResult,
  type DashboardRepository,
  type DashboardSource,
} from '../src/features/dashboard/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const owner: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const emptyMetrics: DashboardMetricsResult = {
  data: [],
  meta: { from: '2026-01-01', to: '2026-01-31', currency: 'USD' },
};

const emptyReports: DashboardReportsResult = {
  data: {
    sales: { total: 0, invoiceCount: 0, averageOrderValue: 0, interval: 'week', series: [] },
    transactions: { total: 0, completionRate: 0, segments: [] },
    recentOrders: [],
    topProducts: [],
  },
  meta: { from: '2026-01-01', to: '2026-01-31', currency: 'USD' },
};

class FakeDashboardService implements DashboardReportingService {
  metricsQuery: DashboardMetricsQuery | undefined;
  reportsQuery: DashboardReportsQuery | undefined;

  metrics(
    _principal: AuthPrincipal,
    query: DashboardMetricsQuery,
  ): Promise<DashboardMetricsResult> {
    this.metricsQuery = query;
    return Promise.resolve(emptyMetrics);
  }

  reports(
    _principal: AuthPrincipal,
    query: DashboardReportsQuery,
  ): Promise<DashboardReportsResult> {
    this.reportsQuery = query;
    return Promise.resolve(emptyReports);
  }
}

class FakeDashboardRepository implements DashboardRepository {
  range: DashboardRange | undefined;
  source: DashboardSource = { products: { count: 2, stock: 12 }, customerCount: 4, invoices: [] };

  getSource(_workspaceId: string, range: DashboardRange): Promise<DashboardSource> {
    this.range = range;
    return Promise.resolve(this.source);
  }
}

const jwt = new JwtTokenService({
  secret: testAppOptions.jwtAccessSecret,
  issuer: testAppOptions.jwtIssuer,
  audience: testAppOptions.jwtAudience,
  ttlSeconds: testAppOptions.jwtAccessTtlSeconds,
});

async function authorizationHeader(): Promise<string> {
  return `Bearer ${await jwt.sign(owner)}`;
}

function invoice(
  id: string,
  issuedAt: string,
  status: 'complete' | 'pending' | 'cancelled',
  total: number,
  item: { productId: string; description: string; quantity: number; amount: number },
) {
  return {
    id,
    number: `INV-${id}`,
    customerName: 'Nexora Customer',
    issuedAt: new Date(issuedAt),
    status,
    currency: 'USD',
    total,
    items: [
      {
        id: `item-${id}`,
        productId: item.productId,
        productName: item.description,
        description: item.description,
        unitPrice: item.amount / item.quantity,
        quantity: item.quantity,
        amount: item.amount,
      },
    ],
  };
}

void describe('dashboard metrics and reporting API', () => {
  void it('requires authentication and normalizes metric filters', async () => {
    const service = new FakeDashboardService();
    const app = createApp({ ...testAppOptions, dashboardService: service });

    const unauthorized = await request(app).get('/api/dashboard/metrics');
    const authorized = await request(app)
      .get('/api/dashboard/metrics?from=2026-01-01&to=2026-01-31&currency=brl')
      .set('Authorization', await authorizationHeader());

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
    assert.deepEqual(service.metricsQuery, {
      from: '2026-01-01',
      to: '2026-01-31',
      currency: 'BRL',
    });
  });

  void it('validates and coerces report controls before invoking the service', async () => {
    const service = new FakeDashboardService();
    const app = createApp({ ...testAppOptions, dashboardService: service });
    const authorization = await authorizationHeader();

    const valid = await request(app)
      .get(
        '/api/dashboard/reports?from=2026-01-01&to=2026-12-31&interval=month&recentLimit=8&productLimit=3',
      )
      .set('Authorization', authorization);
    const invalid = await request(app)
      .get('/api/dashboard/reports?from=2026-01-01&to=2027-12-31')
      .set('Authorization', authorization);

    assert.equal(valid.status, 200);
    assert.deepEqual(service.reportsQuery, {
      from: '2026-01-01',
      to: '2026-12-31',
      currency: 'USD',
      interval: 'month',
      recentLimit: 8,
      productLimit: 3,
    });
    assert.equal(invalid.status, 422);
  });

  void it('derives business metrics from completed invoices', async () => {
    const repository = new FakeDashboardRepository();
    repository.source.invoices = [
      invoice('3', '2026-01-10T12:00:00.000Z', 'pending', 50, {
        productId: 'p2',
        description: 'Support',
        quantity: 1,
        amount: 50,
      }),
      invoice('2', '2026-01-09T12:00:00.000Z', 'complete', 60, {
        productId: 'p1',
        description: 'Workspace',
        quantity: 1,
        amount: 60,
      }),
      invoice('1', '2026-01-02T12:00:00.000Z', 'complete', 100, {
        productId: 'p1',
        description: 'Workspace',
        quantity: 2,
        amount: 100,
      }),
    ];
    const result = await new DashboardService(repository).metrics(owner, {
      from: '2026-01-01',
      to: '2026-01-14',
      currency: 'USD',
    });

    assert.deepEqual(
      result.data.map(({ id, value }) => ({ id, value })),
      [
        { id: 'products', value: 2 },
        { id: 'stock', value: 12 },
        { id: 'revenue', value: 160 },
        { id: 'customers', value: 4 },
      ],
    );
    assert.equal(repository.range?.from.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(repository.range?.to.toISOString(), '2026-01-14T23:59:59.999Z');
  });

  void it('builds sales, transaction, recent order and product reports', async () => {
    const repository = new FakeDashboardRepository();
    repository.source.invoices = [
      invoice('4', '2026-01-11T12:00:00.000Z', 'cancelled', 25, {
        productId: 'p2',
        description: 'Support',
        quantity: 1,
        amount: 25,
      }),
      invoice('3', '2026-01-10T12:00:00.000Z', 'pending', 50, {
        productId: 'p2',
        description: 'Support',
        quantity: 1,
        amount: 50,
      }),
      invoice('2', '2026-01-09T12:00:00.000Z', 'complete', 60, {
        productId: 'p1',
        description: 'Workspace',
        quantity: 1,
        amount: 60,
      }),
      invoice('1', '2026-01-02T12:00:00.000Z', 'complete', 100, {
        productId: 'p1',
        description: 'Workspace',
        quantity: 2,
        amount: 100,
      }),
    ];

    const result = await new DashboardService(repository).reports(owner, {
      from: '2026-01-01',
      to: '2026-01-14',
      currency: 'USD',
      interval: 'week',
      recentLimit: 2,
      productLimit: 3,
    });

    assert.deepEqual(
      result.data.sales.series.map(({ value }) => value),
      [100, 60],
    );
    assert.deepEqual(
      result.data.transactions.segments.map(({ count, percentage }) => ({ count, percentage })),
      [
        { count: 2, percentage: 50 },
        { count: 1, percentage: 25 },
        { count: 1, percentage: 25 },
      ],
    );
    assert.deepEqual(
      result.data.recentOrders.map(({ id }) => id),
      ['item-4', 'item-3'],
    );
    assert.deepEqual(result.data.topProducts[0], {
      id: 'p1',
      name: 'Workspace',
      price: 60,
      quantity: 3,
      orderCount: 2,
      revenue: 160,
    });
  });
});
