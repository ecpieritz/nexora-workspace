import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Product, ProductAnalytics, ProductCreateInput } from '../models/product-analytics.model';
import { ProductRepository } from './product.repository';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let httpTesting: HttpTestingController;

  const product: Product = {
    id: '40000000-0000-4000-8000-000000000001',
    sku: null,
    name: 'Notebook',
    brand: 'Nexora',
    category: 'Computers',
    description: 'A portfolio test product.',
    price: 1200,
    negotiable: true,
    stock: 0,
    active: true,
    createdAt: '2026-09-28T12:00:00.000Z',
    updatedAt: '2026-09-28T12:00:00.000Z',
  };
  const analytics: ProductAnalytics = {
    range: { from: '2026-03-01', to: '2026-09-28' },
    metrics: [
      {
        id: 'products',
        label: 'Total products',
        value: 1,
        change: '+1 new',
        trend: [0, 0, 0, 0, 0, 0, 1],
      },
    ],
    ranking: [],
    monthlySales: [{ month: 'Sep', value: 0 }],
    distribution: [],
  };
  const input: ProductCreateInput = {
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description!,
    price: product.price,
    negotiable: product.negotiable,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(ProductRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load analytics for the selected date range', async () => {
    const result = repository.getAnalytics({ from: '2026-03-01', to: '2026-09-28' });
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === '/api/products/analytics',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-03-01');
    expect(request.request.params.get('to')).toBe('2026-09-28');
    request.flush({ data: analytics });

    await expectAsync(result).toBeResolvedTo(analytics);
  });

  it('should list and retrieve products through the API', async () => {
    const listed = repository.list({
      search: 'note',
      active: true,
      sort: 'createdAt',
      order: 'desc',
    });
    const listRequest = httpTesting.expectOne((candidate) => candidate.url === '/api/products');
    expect(listRequest.request.params.get('search')).toBe('note');
    expect(listRequest.request.params.get('active')).toBe('true');
    expect(listRequest.request.params.get('sort')).toBe('createdAt');
    expect(listRequest.request.params.get('order')).toBe('desc');
    listRequest.flush({
      data: [product],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect((await listed).data).toEqual([product]);

    const retrieved = repository.getById(product.id);
    httpTesting.expectOne(`/api/products/${product.id}`).flush({ data: product });
    await expectAsync(retrieved).toBeResolvedTo(product);
  });

  it('should create products with API defaults', async () => {
    const created = repository.create(input);
    const request = httpTesting.expectOne('/api/products');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...input, stock: 0, active: true });
    request.flush({ data: product });

    await expectAsync(created).toBeResolvedTo(product);
  });

  it('should update and delete products through the API', async () => {
    const updated = repository.update(product.id, { price: 1300 });
    const updateRequest = httpTesting.expectOne(`/api/products/${product.id}`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual({ price: 1300 });
    updateRequest.flush({ data: { ...product, price: 1300 } });
    expect((await updated).price).toBe(1300);

    const deletion = repository.delete(product.id);
    const deleteRequest = httpTesting.expectOne(`/api/products/${product.id}`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null, { status: 204, statusText: 'No Content' });
    await expectAsync(deletion).toBeResolved();
  });
});
