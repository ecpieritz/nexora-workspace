import { TestBed } from '@angular/core/testing';
import { MockApiService } from '@core/mock-api';
import { CustomerRepository } from './customer.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}
describe('CustomerRepository', () => {
  it('should return isolated customer records', async () => {
    TestBed.configureTestingModule({
      providers: [CustomerRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const customers = await TestBed.inject(CustomerRepository).getAll();
    expect(customers.length).toBe(8);
    expect(customers[0].performance.length).toBe(6);
  });
});
