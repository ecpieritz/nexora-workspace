import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InvoiceRepository } from '../../data-access/invoice.repository';
import { Invoice } from '../../models/invoice.model';
import { InvoiceListComponent } from './invoice-list.component';

const INVOICES: Invoice[] = [
  {
    id: '100001',
    number: 'INV-100001',
    customerId: null,
    customerName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Main Street',
    issuedAt: '2026-07-12T00:00:00.000Z',
    dueAt: null,
    status: 'complete',
    favorite: true,
    currency: 'USD',
    discount: 0,
    subtotal: 100,
    total: 100,
    items: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
  },
  {
    id: '100002',
    number: 'INV-100002',
    customerId: null,
    customerName: 'John Smith',
    email: 'john@example.com',
    address: '456 Main Street',
    issuedAt: '2026-07-10T00:00:00.000Z',
    dueAt: null,
    status: 'pending',
    favorite: false,
    currency: 'USD',
    discount: 0,
    subtotal: 200,
    total: 200,
    items: [],
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
];

describe('InvoiceListComponent', () => {
  let fixture: ComponentFixture<InvoiceListComponent>;
  let repository: jasmine.SpyObj<InvoiceRepository>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj<InvoiceRepository>('InvoiceRepository', [
      'getAll',
      'updateStatus',
      'updateFavorite',
      'delete',
    ]);
    repository.getAll.and.resolveTo(INVOICES);

    await TestBed.configureTestingModule({
      imports: [InvoiceListComponent],
      providers: [provideRouter([]), { provide: InvoiceRepository, useValue: repository }],
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

  it('should update an invoice status from its actions menu', async () => {
    repository.updateStatus.and.resolveTo({ ...INVOICES[1], status: 'complete' });
    const actions: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Actions for invoice INV-100002"]',
    );
    actions.click();
    fixture.detectChanges();

    const complete: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-status-action="complete"]',
    );
    complete.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repository.updateStatus).toHaveBeenCalledOnceWith('100002', 'complete');
    expect(actions.closest('tr')?.textContent).toContain('complete');
  });

  it('should delete an invoice only after confirmation', async () => {
    repository.delete.and.resolveTo();
    const actions: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Actions for invoice INV-100001"]',
    );
    actions.click();
    fixture.detectChanges();

    const requestDelete: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.invoice-list__delete-action',
    );
    requestDelete.click();
    fixture.detectChanges();
    expect(repository.delete).not.toHaveBeenCalled();

    const confirmDelete: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.confirmation-dialog__confirm',
    );
    confirmDelete.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repository.delete).toHaveBeenCalledOnceWith('100001');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });
});
