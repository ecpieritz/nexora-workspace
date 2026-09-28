import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { CreateInvoiceInput, Invoice } from '../models/invoice.model';
import { InvoiceRepository } from './invoice.repository';

describe('InvoiceRepository', () => {
  let repository: InvoiceRepository;
  let httpTesting: HttpTestingController;

  const input: CreateInvoiceInput = {
    customerName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Main Street',
    issuedAt: '2026-08-04',
    discount: 10,
    items: [{ description: 'Angular dashboard', rate: 1000, quantity: 2 }],
  };
  const invoice: Invoice = {
    id: '40000000-0000-4000-8000-000000000001',
    number: 'INV-2026-0001',
    customerId: null,
    customerName: input.customerName,
    email: input.email,
    address: input.address!,
    issuedAt: '2026-08-04T00:00:00.000Z',
    dueAt: null,
    status: 'pending',
    favorite: false,
    currency: 'USD',
    discount: input.discount,
    subtotal: 2000,
    total: 1800,
    items: [
      {
        id: '50000000-0000-4000-8000-000000000001',
        productId: null,
        description: 'Angular dashboard',
        rate: 1000,
        quantity: 2,
        amount: 2000,
      },
    ],
    createdAt: '2026-08-04T00:00:00.000Z',
    updatedAt: '2026-08-04T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(InvoiceRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load a sorted invoice page with API filters', async () => {
    const result = repository.list({
      search: 'Jane',
      status: 'pending',
      favorite: false,
      from: '2026-08-01',
      to: '2026-08-31',
    });
    const request = httpTesting.expectOne((candidate) => candidate.url === '/api/invoices');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('search')).toBe('Jane');
    expect(request.request.params.get('status')).toBe('pending');
    expect(request.request.params.get('favorite')).toBe('false');
    expect(request.request.params.get('from')).toBe('2026-08-01');
    expect(request.request.params.get('to')).toBe('2026-08-31');
    expect(request.request.params.get('sort')).toBe('issuedAt');
    expect(request.request.params.get('order')).toBe('desc');
    request.flush({ data: [invoice], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });

    expect((await result).data).toEqual([invoice]);
  });

  it('should combine every page required by the invoice list', fakeAsync(() => {
    const secondInvoice = {
      ...invoice,
      id: '40000000-0000-4000-8000-000000000002',
      number: 'INV-2026-0002',
    };
    let invoices: Invoice[] | undefined;
    void repository.getAll().then((result) => (invoices = result));

    httpTesting
      .expectOne((candidate) => candidate.params.get('page') === '1')
      .flush({ data: [invoice], meta: { page: 1, limit: 100, total: 2, totalPages: 2 } });
    tick();
    httpTesting
      .expectOne((candidate) => candidate.params.get('page') === '2')
      .flush({ data: [secondInvoice], meta: { page: 2, limit: 100, total: 2, totalPages: 2 } });
    tick();

    expect(invoices).toEqual([invoice, secondInvoice]);
  }));

  it('should retrieve, create, and update invoices through the API', async () => {
    const retrieved = repository.getById(invoice.id);
    httpTesting.expectOne(`/api/invoices/${invoice.id}`).flush({ data: invoice });
    await expectAsync(retrieved).toBeResolvedTo(invoice);

    const created = repository.create(input);
    const createRequest = httpTesting.expectOne('/api/invoices');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(input);
    createRequest.flush({ data: invoice });
    await expectAsync(created).toBeResolvedTo(invoice);

    const updated = repository.update(invoice.id, { discount: 5 });
    const updateRequest = httpTesting.expectOne(`/api/invoices/${invoice.id}`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual({ discount: 5 });
    updateRequest.flush({ data: { ...invoice, discount: 5, total: 1900 } });
    expect((await updated).discount).toBe(5);
  });

  it('should update invoice status and favorite through dedicated endpoints', async () => {
    const statusUpdate = repository.updateStatus(invoice.id, 'complete');
    const statusRequest = httpTesting.expectOne(`/api/invoices/${invoice.id}/status`);
    expect(statusRequest.request.method).toBe('PATCH');
    expect(statusRequest.request.body).toEqual({ status: 'complete' });
    statusRequest.flush({ data: { ...invoice, status: 'complete' } });
    expect((await statusUpdate).status).toBe('complete');

    const favoriteUpdate = repository.updateFavorite(invoice.id, true);
    const favoriteRequest = httpTesting.expectOne(`/api/invoices/${invoice.id}/favorite`);
    expect(favoriteRequest.request.method).toBe('PATCH');
    expect(favoriteRequest.request.body).toEqual({ favorite: true });
    favoriteRequest.flush({ data: { ...invoice, favorite: true } });
    expect((await favoriteUpdate).favorite).toBeTrue();
  });

  it('should delete invoices through the API', async () => {
    const deletion = repository.delete(invoice.id);
    const request = httpTesting.expectOne(`/api/invoices/${invoice.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expectAsync(deletion).toBeResolved();
  });
});
