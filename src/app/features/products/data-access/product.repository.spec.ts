import { TestBed } from '@angular/core/testing';
import { MockApiService } from '@core/mock-api';
import { ProductRepository } from './product.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}

describe('ProductRepository', () => {
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
});
