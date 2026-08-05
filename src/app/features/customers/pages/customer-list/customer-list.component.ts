import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ButtonDirective, InputDirective } from '@shared/ui';
import { CustomerRepository } from '../../data-access/customer.repository';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-customer-list',
  imports: [ButtonDirective, InputDirective],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerListComponent implements OnInit {
  private readonly repository = inject(CustomerRepository);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
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
}
