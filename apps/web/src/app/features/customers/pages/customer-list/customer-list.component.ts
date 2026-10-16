import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ButtonDirective,
  ConfirmationDialogComponent,
  InputDirective,
  ToastService,
} from '@shared/ui';
import { CustomerRepository } from '../../data-access/customer.repository';
import { Customer, CustomerGender } from '../../models/customer.model';

@Component({
  selector: 'app-customer-list',
  imports: [ButtonDirective, ConfirmationDialogComponent, InputDirective, ReactiveFormsModule],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeOverlays()' },
})
export class CustomerListComponent implements OnInit {
  private readonly repository = inject(CustomerRepository);
  private readonly toast = inject(ToastService);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  protected readonly pendingDelete = signal<Customer | null>(null);
  protected readonly deleting = signal(false);
  protected readonly customerForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gender: new FormControl<CustomerGender>('male', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    role: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.customers().filter(
      (customer) =>
        !term ||
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term),
    );
  });
  protected readonly selectedCustomer = computed(
    () => this.customers().find(({ id }) => id === this.selectedId()) ?? null,
  );
  protected readonly editingCustomer = computed(
    () => this.customers().find(({ id }) => id === this.editingId()) ?? null,
  );
  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const customers = await this.repository.getAll();
      this.customers.set(customers);
      if (!this.selectedId()) this.selectedId.set(customers[0]?.id ?? null);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
  protected selectCustomer(id: string): void {
    this.selectedId.set(id);
  }
  protected fullName(customer: Customer): string {
    return `${customer.firstName} ${customer.lastName}`;
  }
  protected initials(customer: Customer): string {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();
  }
  protected openCreate(): void {
    this.editingId.set(null);
    this.customerForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'male',
      role: '',
      address: '',
    });
    this.saveError.set(false);
    this.editorOpen.set(true);
  }
  protected openEdit(customer: Customer): void {
    this.editingId.set(customer.id);
    this.customerForm.reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      gender: customer.gender,
      role: customer.role,
      address: customer.address,
    });
    this.saveError.set(false);
    this.editorOpen.set(true);
  }
  protected closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }
  protected closeOverlays(): void {
    if (!this.saving() && !this.deleting()) {
      this.editorOpen.set(false);
      this.pendingDelete.set(null);
    }
  }
  protected async saveCustomer(): Promise<void> {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set(false);
    try {
      const id = this.editingId();
      const saved = id
        ? await this.repository.update(id, this.customerForm.getRawValue())
        : await this.repository.create(this.customerForm.getRawValue());
      this.customers.update((customers) =>
        id
          ? customers.map((customer) => (customer.id === id ? saved : customer))
          : [saved, ...customers],
      );
      this.selectedId.set(saved.id);
      this.editorOpen.set(false);
      this.toast.success(id ? 'Customer updated.' : 'Customer created.');
    } catch {
      this.saveError.set(true);
      this.toast.error('The customer could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected requestDelete(customer: Customer): void {
    this.pendingDelete.set(customer);
  }

  protected cancelDelete(): void {
    if (!this.deleting()) this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const customer = this.pendingDelete();
    if (!customer) return;

    this.deleting.set(true);
    try {
      await this.repository.delete(customer.id);
      const remaining = this.customers().filter(({ id }) => id !== customer.id);
      this.customers.set(remaining);
      if (this.selectedId() === customer.id) {
        this.selectedId.set(remaining[0]?.id ?? null);
      }
      this.pendingDelete.set(null);
      this.editorOpen.set(false);
      this.toast.success('Customer deleted.');
    } catch {
      this.toast.error('The customer could not be deleted.');
    } finally {
      this.deleting.set(false);
    }
  }
}
