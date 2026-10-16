import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { Customer, CustomerFormValue } from '../models/customer.model';
import { CustomerRepository } from './customer.repository';

describe('CustomerRepository', () => {
  let repository: CustomerRepository;
  let httpTesting: HttpTestingController;

  const input: CustomerFormValue = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+55 85 99999-0000',
    gender: 'female',
    role: 'Designer',
    address: 'Third Street',
  };
  const customer: Customer = {
    ...input,
    id: '40000000-0000-4000-8000-000000000001',
    performance: [35, 48, 42, 61, 58, 72],
    satisfaction: 72,
    retention: 65,
    color: '#625df5',
    createdAt: '2026-09-28T12:00:00.000Z',
    updatedAt: '2026-09-28T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(CustomerRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load a sorted customer page from the API', async () => {
    const result = repository.getAll();
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === '/api/customers' && candidate.params.get('limit') === '100',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('sort')).toBe('name');
    expect(request.request.params.get('order')).toBe('asc');
    request.flush({
      data: [customer],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });

    await expectAsync(result).toBeResolvedTo([customer]);
  });

  it('should retrieve a customer by id', async () => {
    const result = repository.getById(customer.id);
    httpTesting.expectOne(`/api/customers/${customer.id}`).flush({ data: customer });

    await expectAsync(result).toBeResolvedTo(customer);
  });

  it('should combine every customer page required by the current list view', fakeAsync(() => {
    const secondCustomer = { ...customer, id: '40000000-0000-4000-8000-000000000002' };
    let customers: Customer[] | undefined;
    void repository.getAll().then((result) => (customers = result));

    httpTesting
      .expectOne((candidate) => candidate.params.get('page') === '1')
      .flush({
        data: [customer],
        meta: { page: 1, limit: 100, total: 2, totalPages: 2 },
      });
    tick();
    httpTesting
      .expectOne((candidate) => candidate.params.get('page') === '2')
      .flush({
        data: [secondCustomer],
        meta: { page: 2, limit: 100, total: 2, totalPages: 2 },
      });
    tick();

    expect(customers).toEqual([customer, secondCustomer]);
  }));

  it('should create and update customers through the API', async () => {
    const created = repository.create(input);
    const createRequest = httpTesting.expectOne('/api/customers');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(input);
    createRequest.flush({ data: customer });
    await expectAsync(created).toBeResolvedTo(customer);

    const changes = { ...input, role: 'Design Lead' };
    const updated = repository.update(customer.id, changes);
    const updateRequest = httpTesting.expectOne(`/api/customers/${customer.id}`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual(changes);
    updateRequest.flush({ data: { ...customer, role: 'Design Lead' } });
    expect((await updated).role).toBe('Design Lead');
  });

  it('should delete a customer through the API', async () => {
    const deletion = repository.delete(customer.id);
    const request = httpTesting.expectOne(`/api/customers/${customer.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expectAsync(deletion).toBeResolved();
  });
});
