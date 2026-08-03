import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceRepository } from '../../data-access/invoice.repository';
import { Invoice } from '../../models/invoice.model';
import { InvoiceListComponent } from './invoice-list.component';

const INVOICES: Invoice[] = [
  {
    id: '100001',
    customerName: 'Jane Doe',
    email: 'jane@example.com',
    issuedAt: '2026-07-12T00:00:00.000Z',
    status: 'complete',
    favorite: true,
  },
  {
    id: '100002',
    customerName: 'John Smith',
    email: 'john@example.com',
    issuedAt: '2026-07-10T00:00:00.000Z',
    status: 'pending',
    favorite: false,
  },
];

describe('InvoiceListComponent', () => {
  let fixture: ComponentFixture<InvoiceListComponent>;

  beforeEach(async () => {
    const repository = jasmine.createSpyObj<InvoiceRepository>('InvoiceRepository', ['getAll']);
    repository.getAll.and.resolveTo(INVOICES);

    await TestBed.configureTestingModule({
      imports: [InvoiceListComponent],
      providers: [{ provide: InvoiceRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render invoices returned by the repository', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('should filter invoices by search term and status', () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'John';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('John Smith');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    const status: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    status.value = 'complete';
    status.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });
});
