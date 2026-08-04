import { inject, Injectable } from '@angular/core';

import { MockApiError, MockApiService, MockStorageService } from '@core/mock-api';

import { Invoice, InvoiceStatus } from '../models/invoice.model';

const INVOICES_STORAGE_KEY = 'nexora:invoices';

const INVOICES: readonly Invoice[] = [
  {
    id: '876364',
    customerName: 'Aurora Gaur',
    email: 'auroragaur@gmail.com',
    issuedAt: '2026-07-12T00:00:00.000Z',
    status: 'complete',
    favorite: true,
  },
  {
    id: '876123',
    customerName: 'James Mullican',
    email: 'jamesmullican@gmail.com',
    issuedAt: '2026-07-10T00:00:00.000Z',
    status: 'pending',
    favorite: true,
  },
  {
    id: '876213',
    customerName: 'Robert Bacins',
    email: 'robertbacins@gmail.com',
    issuedAt: '2026-07-09T00:00:00.000Z',
    status: 'complete',
    favorite: false,
  },
  {
    id: '876987',
    customerName: 'Bethany Jackson',
    email: 'bethanyjackson@gmail.com',
    issuedAt: '2026-07-09T00:00:00.000Z',
    status: 'cancelled',
    favorite: false,
  },
  {
    id: '871345',
    customerName: 'Anne Jacob',
    email: 'annejacob@gmail.com',
    issuedAt: '2026-07-08T00:00:00.000Z',
    status: 'complete',
    favorite: false,
  },
  {
    id: '872345',
    customerName: 'Bethany Jackson',
    email: 'bethany.jackson@gmail.com',
    issuedAt: '2026-07-06T00:00:00.000Z',
    status: 'pending',
    favorite: true,
  },
  {
    id: '872346',
    customerName: 'James Mullican',
    email: 'james.m@example.com',
    issuedAt: '2026-07-05T00:00:00.000Z',
    status: 'complete',
    favorite: false,
  },
  {
    id: '873245',
    customerName: 'Jhon Deo',
    email: 'jhondeo32@gmail.com',
    issuedAt: '2026-07-04T00:00:00.000Z',
    status: 'complete',
    favorite: true,
  },
  {
    id: '876354',
    customerName: 'Bethany Jackson',
    email: 'bethany@example.com',
    issuedAt: '2026-07-02T00:00:00.000Z',
    status: 'cancelled',
    favorite: true,
  },
  {
    id: '878769',
    customerName: 'James Mullican',
    email: 'james.work@example.com',
    issuedAt: '2026-07-01T00:00:00.000Z',
    status: 'pending',
    favorite: false,
  },
];

@Injectable({ providedIn: 'root' })
export class InvoiceRepository {
  private readonly mockApi = inject(MockApiService);
  private readonly storage = inject(MockStorageService);

  getAll(): Promise<Invoice[]> {
    return this.mockApi.execute(() => this.readInvoices());
  }

  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    return this.update(id, (invoice) => ({ ...invoice, status }));
  }

  toggleFavorite(id: string): Promise<Invoice> {
    return this.update(id, (invoice) => ({ ...invoice, favorite: !invoice.favorite }));
  }

  delete(id: string): Promise<void> {
    return this.mockApi.execute(() => {
      const invoices = this.readInvoices();

      if (!invoices.some((invoice) => invoice.id === id)) {
        throw new MockApiError(404, 'Invoice not found.');
      }

      this.storage.write(
        INVOICES_STORAGE_KEY,
        invoices.filter((invoice) => invoice.id !== id),
      );
    });
  }

  private update(id: string, updater: (invoice: Invoice) => Invoice): Promise<Invoice> {
    return this.mockApi.execute(() => {
      const invoices = this.readInvoices();
      const index = invoices.findIndex((invoice) => invoice.id === id);

      if (index < 0) {
        throw new MockApiError(404, 'Invoice not found.');
      }

      const updated = updater(invoices[index]);
      invoices[index] = updated;
      this.storage.write(INVOICES_STORAGE_KEY, invoices);
      return { ...updated };
    });
  }

  private readInvoices(): Invoice[] {
    return this.storage.read<Invoice[]>(
      INVOICES_STORAGE_KEY,
      INVOICES.map((invoice) => ({ ...invoice })),
    );
  }
}
