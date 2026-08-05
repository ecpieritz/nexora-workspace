import { TestBed } from '@angular/core/testing';
import { MockApiService } from '@core/mock-api';
import { ProductRepository } from './product.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
  createId(): string {
    return 'new-product';
  }
}

describe('ProductRepository', () => {
  beforeEach(() => localStorage.clear());
  it('should return isolated analytics data', async () => {
    TestBed.configureTestingModule({
      providers: [ProductRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const repository = TestBed.inject(ProductRepository);
    const first = await repository.getAnalytics();
    const second = await repository.getAnalytics();
    expect(first.metrics.length).toBe(2);
    expect(first.ranking[0].name).toBe('Bluetooth Devices');
    expect(first).not.toBe(second);
  });

  it('should create and persist a product', async () => {
    TestBed.configureTestingModule({
      providers: [ProductRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const repository = TestBed.inject(ProductRepository);
    await repository.create({
      name: 'Notebook',
      brand: 'Nexora',
      category: 'Computers',
      price: 1200,
      negotiable: true,
      description: 'A portfolio test product.',
    });
    const analytics = await repository.getAnalytics();
    expect(analytics.ranking[0].id).toBe('new-product');
    expect(analytics.metrics[0].value).toBe(500875);
  });
});
