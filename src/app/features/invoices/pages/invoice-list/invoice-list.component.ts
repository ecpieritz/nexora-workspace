import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { ButtonDirective, InputDirective } from '@shared/ui';

import { InvoiceRepository } from '../../data-access/invoice.repository';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';

type InvoiceStatusFilter = 'all' | InvoiceStatus;

@Component({
  selector: 'app-invoice-list',
  imports: [ButtonDirective, DatePipe, InputDirective],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceListComponent implements OnInit {
  private readonly repository = inject(InvoiceRepository);

  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<InvoiceStatusFilter>('all');
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly filteredInvoices = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.invoices().filter((invoice) => {
      const matchesStatus = status === 'all' || invoice.status === status;
      const matchesTerm =
        !term ||
        invoice.id.includes(term) ||
        invoice.customerName.toLowerCase().includes(term) ||
        invoice.email.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });
  protected readonly allFilteredSelected = computed(() => {
    const filtered = this.filteredInvoices();
    const selected = this.selectedIds();
    return filtered.length > 0 && filtered.every((invoice) => selected.has(invoice.id));
  });

  ngOnInit(): void {
    void this.loadInvoices();
  }

  protected async loadInvoices(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      this.invoices.set(await this.repository.getAll());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as InvoiceStatusFilter);
  }

  protected toggleSelection(id: string): void {
    this.selectedIds.update((selected) => {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected toggleAllFiltered(): void {
    const ids = this.filteredInvoices().map((invoice) => invoice.id);
    this.selectedIds.update((selected) => {
      const next = new Set(selected);
      const shouldSelect = !ids.every((id) => next.has(id));
      ids.forEach((id) => {
        if (shouldSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }

  protected toggleFavorite(id: string): void {
    this.invoices.update((invoices) =>
      invoices.map((invoice) =>
        invoice.id === id ? { ...invoice, favorite: !invoice.favorite } : invoice,
      ),
    );
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
