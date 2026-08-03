import { TestBed } from '@angular/core/testing';

import { MockApiService } from '@core/mock-api';

import { InvoiceRepository } from './invoice.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}

describe('InvoiceRepository', () => {
  it('should return isolated invoice records', async () => {
    TestBed.configureTestingModule({
      providers: [InvoiceRepository, { provide: MockApiService, useClass: MockApiStub }],
    });

    const invoices = await TestBed.inject(InvoiceRepository).getAll();
    expect(invoices.length).toBe(10);
    expect(invoices.map((invoice) => invoice.status)).toContain('pending');
  });
});
