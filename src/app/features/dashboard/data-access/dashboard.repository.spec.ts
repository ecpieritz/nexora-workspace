import { TestBed } from '@angular/core/testing';

import { MockApiService } from '@core/mock-api';

import { DashboardRepository } from './dashboard.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}

describe('DashboardRepository', () => {
  it('should return an isolated dashboard summary', async () => {
    TestBed.configureTestingModule({
      providers: [DashboardRepository, { provide: MockApiService, useClass: MockApiStub }],
    });

    const summary = await TestBed.inject(DashboardRepository).getSummary();
    expect(summary.length).toBe(4);
    expect(summary.map((item) => item.id)).toContain('sales-products');
  });

  it('should return sales and transaction chart data', async () => {
    TestBed.configureTestingModule({
      providers: [DashboardRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const repository = TestBed.inject(DashboardRepository);
    const [sales, analytics] = await Promise.all([
      repository.getSalesReport(),
      repository.getTransactionAnalytics(),
    ]);

    expect(sales.length).toBe(10);
    expect(analytics.segments.reduce((total, segment) => total + segment.value, 0)).toBe(100);
  });
});
