import { TestBed } from '@angular/core/testing';
import { MockApiService } from '@core/mock-api';
import { CustomerRepository } from './customer.repository';

class MockApiStub {
  createId(): string {
    return 'customer-created';
  }
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}
describe('CustomerRepository', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('should return isolated customer records', async () => {
    TestBed.configureTestingModule({
      providers: [CustomerRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const customers = await TestBed.inject(CustomerRepository).getAll();
    expect(customers.length).toBe(8);
    expect(customers[0].performance.length).toBe(6);
  });
  it('should create and update persisted customers', async () => {
    TestBed.configureTestingModule({
      providers: [CustomerRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const repository = TestBed.inject(CustomerRepository);
    const input = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+789',
      gender: 'female' as const,
      role: 'Designer',
      address: 'Third Street',
    };
    const created = await repository.create(input);
    expect(created.id).toBe('customer-created');
    const updated = await repository.update(created.id, { ...input, role: 'Design Lead' });
    expect(updated.role).toBe('Design Lead');
    expect((await repository.getAll())[0].role).toBe('Design Lead');
  });
});
