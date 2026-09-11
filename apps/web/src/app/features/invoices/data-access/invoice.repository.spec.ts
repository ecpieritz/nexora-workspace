import { TestBed } from '@angular/core/testing';

import { MockApiService } from '@core/mock-api';

import { InvoiceRepository } from './invoice.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}

describe('InvoiceRepository', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('should return isolated invoice records', async () => {
    TestBed.configureTestingModule({
      providers: [InvoiceRepository, { provide: MockApiService, useClass: MockApiStub }],
    });

    const invoices = await TestBed.inject(InvoiceRepository).getAll();
    expect(invoices.length).toBe(10);
    expect(invoices.map((invoice) => invoice.status)).toContain('pending');
  });

  it('should persist status, favorite, and deletion changes', async () => {
    TestBed.configureTestingModule({
      providers: [InvoiceRepository, { provide: MockApiService, useClass: MockApiStub }],
    });

    const repository = TestBed.inject(InvoiceRepository);
    expect((await repository.updateStatus('876123', 'complete')).status).toBe('complete');
    expect((await repository.toggleFavorite('876213')).favorite).toBeTrue();
    await repository.delete('876987');

    const invoices = await repository.getAll();
    expect(invoices.find(({ id }) => id === '876123')?.status).toBe('complete');
    expect(invoices.find(({ id }) => id === '876213')?.favorite).toBeTrue();
    expect(invoices.some(({ id }) => id === '876987')).toBeFalse();
    expect(localStorage.getItem('nexora:invoices')).not.toBeNull();
  });

  it('should create and persist an invoice with its calculated total', async () => {
    TestBed.configureTestingModule({
      providers: [InvoiceRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
    const repository = TestBed.inject(InvoiceRepository);

    const created = await repository.create({
      customerName: 'New Customer',
      email: 'new@example.com',
      address: '123 Main Street',
      issuedAt: '2026-08-04T00:00:00.000Z',
      discount: 10,
      items: [{ description: 'Angular dashboard', rate: 1000, quantity: 2 }],
    });

    expect(created.status).toBe('pending');
    expect(created.total).toBe(1800);
    expect((await repository.getAll())[0].id).toBe(created.id);
  });
});
