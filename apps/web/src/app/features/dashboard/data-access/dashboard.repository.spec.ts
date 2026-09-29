import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DashboardRepository } from './dashboard.repository';

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(DashboardRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load and map dashboard metrics and reports', async () => {
    const result = repository.getDashboard({
      from: '2026-07-01',
      to: '2026-09-28',
      interval: 'month',
      recentLimit: 3,
      productLimit: 2,
    });
    const metricsRequest = httpTesting.expectOne(
      (request) => request.url === '/api/dashboard/metrics',
    );
    expect(metricsRequest.request.method).toBe('GET');
    expect(metricsRequest.request.params.get('from')).toBe('2026-07-01');
    expect(metricsRequest.request.params.get('to')).toBe('2026-09-28');
    expect(metricsRequest.request.params.get('currency')).toBe('USD');
    metricsRequest.flush({
      data: [
        { id: 'products', label: 'Active products', value: 8, currency: null },
        { id: 'stock', label: 'Units in stock', value: 42, currency: null },
        { id: 'revenue', label: 'Revenue', value: 2600, currency: 'USD' },
        { id: 'customers', label: 'Customers', value: 12, currency: null },
      ],
    });

    const reportsRequest = httpTesting.expectOne(
      (request) => request.url === '/api/dashboard/reports',
    );
    expect(reportsRequest.request.method).toBe('GET');
    expect(reportsRequest.request.params.get('interval')).toBe('month');
    expect(reportsRequest.request.params.get('recentLimit')).toBe('3');
    expect(reportsRequest.request.params.get('productLimit')).toBe('2');
    reportsRequest.flush({
      data: {
        sales: { series: [{ period: '2026-09', label: 'Sep 2026', value: 2600 }] },
        transactions: {
          completionRate: 75,
          segments: [
            {
              status: 'complete',
              label: 'Complete',
              count: 3,
              percentage: 75,
              color: '#5b8ff9',
            },
            {
              status: 'pending',
              label: 'Pending',
              count: 1,
              percentage: 25,
              color: '#f6c85f',
            },
          ],
        },
        recentOrders: [
          {
            id: 'item-1',
            trackingNumber: 'INV-001',
            productName: 'iPhone 12',
            price: 1300,
            quantity: 2,
            totalAmount: 2600,
          },
        ],
        topProducts: [
          {
            id: 'product-1',
            name: 'iPhone 12',
            price: 1300,
            quantity: 2,
            orderCount: 1,
            revenue: 2600,
          },
        ],
      },
    });

    const dashboard = await result;
    expect(dashboard.summary[2]).toEqual(
      jasmine.objectContaining({ id: 'revenue', suffix: ' USD', icon: 'sales' }),
    );
    expect(dashboard.salesReport).toEqual([{ label: 'Sep 2026', value: 2600 }]);
    expect(dashboard.transactionAnalytics.headline).toBe(75);
    expect(dashboard.transactionAnalytics.segments[0].id).toBe('complete');
    expect(dashboard.recentOrders[0].productVisual).toBe('phone');
    expect(dashboard.topProducts[0]).toEqual(
      jasmine.objectContaining({ productVisual: 'phone', revenue: 2600 }),
    );
  });

  it('should send the dashboard report defaults', async () => {
    const result = repository.getDashboard();
    httpTesting.expectOne('/api/dashboard/metrics?currency=USD').flush({ data: [] });
    const reportsRequest = httpTesting.expectOne(
      '/api/dashboard/reports?currency=USD&interval=week&recentLimit=4&productLimit=5',
    );
    reportsRequest.flush({
      data: {
        sales: { series: [] },
        transactions: { completionRate: 0, segments: [] },
        recentOrders: [],
        topProducts: [],
      },
    });

    expect((await result).summary).toEqual([]);
  });
});
