import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { InvoiceRepository } from '../../data-access/invoice.repository';
import { InvoiceCreateComponent } from './invoice-create.component';

describe('InvoiceCreateComponent', () => {
  let fixture: ComponentFixture<InvoiceCreateComponent>;
  let repository: jasmine.SpyObj<InvoiceRepository>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj<InvoiceRepository>('InvoiceRepository', ['create']);
    repository.create.and.resolveTo({
      id: '900001',
      customerName: 'Jane Doe',
      email: 'jane@example.com',
      issuedAt: '2026-08-04T00:00:00.000Z',
      status: 'pending',
      favorite: false,
    });
    await TestBed.configureTestingModule({
      imports: [InvoiceCreateComponent],
      providers: [provideRouter([]), { provide: InvoiceRepository, useValue: repository }],
    }).compileComponents();
    fixture = TestBed.createComponent(InvoiceCreateComponent);
    fixture.detectChanges();
  });

  it('should update the preview total when item values change', () => {
    const inputs = fixture.nativeElement.querySelectorAll('.invoice-create__item input');
    inputs[0].value = 'Angular dashboard';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = '250';
    inputs[1].dispatchEvent(new Event('input'));
    inputs[2].value = '2';
    inputs[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.invoice-preview__total').textContent).toContain(
      '$500.00',
    );
  });

  it('should persist a valid invoice and return to the list', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue(value: object): void;
        controls: { items: { at(index: number): { patchValue(value: object): void } } };
      };
      submit(): Promise<void>;
    };
    component.form.patchValue({
      customerName: 'Jane Doe',
      email: 'jane@example.com',
      address: '123 Main Street',
    });
    component.form.controls.items
      .at(0)
      .patchValue({ description: 'Dashboard', rate: 500, quantity: 1 });
    await component.submit();
    expect(repository.create).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/invoices');
  });
});
