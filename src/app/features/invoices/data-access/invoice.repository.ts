import { inject, Injectable } from '@angular/core';

import { MockApiService } from '@core/mock-api';

import { Invoice } from '../models/invoice.model';

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

  getAll(): Promise<Invoice[]> {
    return this.mockApi.execute(() => INVOICES.map((invoice) => ({ ...invoice })));
  }
}
