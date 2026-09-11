import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonDirective, InputDirective } from '@shared/ui';

import { InvoiceRepository } from '../../data-access/invoice.repository';

type ItemForm = FormGroup<{
  description: FormControl<string>;
  rate: FormControl<number>;
  quantity: FormControl<number>;
}>;

@Component({
  selector: 'app-invoice-create',
  imports: [
    ButtonDirective,
    CurrencyPipe,
    DatePipe,
    InputDirective,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './invoice-create.component.html',
  styleUrl: './invoice-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceCreateComponent {
  private readonly repository = inject(InvoiceRepository);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  protected readonly form = new FormGroup({
    customerName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    issuedAt: new FormControl(new Date().toISOString().slice(0, 10), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    discount: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(100)],
    }),
    items: new FormArray<ItemForm>([this.createItem()]),
  });
  protected readonly formValue = signal(this.form.getRawValue());
  protected readonly subtotal = computed(() =>
    this.formValue().items.reduce((sum, item) => sum + item.rate * item.quantity, 0),
  );
  protected readonly total = computed(
    () => this.subtotal() * (1 - this.formValue().discount / 100),
  );

  constructor() {
    this.form.valueChanges.subscribe(() => this.formValue.set(this.form.getRawValue()));
  }

  protected get items(): FormArray<ItemForm> {
    return this.form.controls.items;
  }

  protected addItem(): void {
    this.items.push(this.createItem());
    this.syncPreview();
  }

  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.syncPreview();
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set(false);
    try {
      const value = this.form.getRawValue();
      await this.repository.create({
        ...value,
        issuedAt: new Date(`${value.issuedAt}T00:00:00`).toISOString(),
      });
      await this.router.navigateByUrl('/invoices');
    } catch {
      this.saveError.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private createItem(): ItemForm {
    return new FormGroup({
      description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      rate: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0.01)],
      }),
      quantity: new FormControl(1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)],
      }),
    });
  }

  private syncPreview(): void {
    this.formValue.set(this.form.getRawValue());
  }
}
