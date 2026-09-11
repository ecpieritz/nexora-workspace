import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import {
  ButtonDirective,
  ConfirmationDialogComponent,
  InputDirective,
  ToastService,
} from '@shared/ui';

import { InvoiceRepository } from '../../data-access/invoice.repository';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';

type InvoiceStatusFilter = 'all' | InvoiceStatus;

@Component({
  selector: 'app-invoice-list',
  imports: [ButtonDirective, ConfirmationDialogComponent, DatePipe, InputDirective, RouterLink],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeOverlays()',
  },
})
export class InvoiceListComponent implements OnInit {
  private readonly repository = inject(InvoiceRepository);
  private readonly toast = inject(ToastService);

  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<InvoiceStatusFilter>('all');
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly openActionId = signal<string | null>(null);
  protected readonly pendingDelete = signal<Invoice | null>(null);
  protected readonly mutatingId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
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

  protected toggleActions(id: string): void {
    this.openActionId.update((openId) => (openId === id ? null : id));
    this.actionError.set(null);
  }

  protected async changeStatus(id: string, status: InvoiceStatus): Promise<void> {
    this.mutatingId.set(id);
    this.actionError.set(null);

    try {
      const updated = await this.repository.updateStatus(id, status);
      this.replaceInvoice(updated);
      this.openActionId.set(null);
      this.toast.success(`Invoice ${id} marked as ${status}.`);
    } catch {
      this.actionError.set('We could not update this invoice. Please try again.');
    } finally {
      this.mutatingId.set(null);
    }
  }

  protected async toggleFavorite(id: string): Promise<void> {
    this.mutatingId.set(id);
    this.actionError.set(null);

    try {
      this.replaceInvoice(await this.repository.toggleFavorite(id));
      this.toast.success('Invoice favorites updated.');
    } catch {
      this.actionError.set('We could not update this invoice. Please try again.');
    } finally {
      this.mutatingId.set(null);
    }
  }

  protected requestDelete(invoice: Invoice): void {
    this.pendingDelete.set(invoice);
    this.openActionId.set(null);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected dismissActionError(): void {
    this.actionError.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const invoice = this.pendingDelete();

    if (!invoice) {
      return;
    }

    this.mutatingId.set(invoice.id);
    this.actionError.set(null);

    try {
      await this.repository.delete(invoice.id);
      this.invoices.update((invoices) => invoices.filter((item) => item.id !== invoice.id));
      this.selectedIds.update((selected) => {
        const next = new Set(selected);
        next.delete(invoice.id);
        return next;
      });
      this.pendingDelete.set(null);
      this.toast.success(`Invoice ${invoice.id} deleted.`);
    } catch {
      this.actionError.set('We could not delete this invoice. Please try again.');
      this.toast.error('The invoice could not be deleted.');
    } finally {
      this.mutatingId.set(null);
    }
  }

  protected closeOverlays(): void {
    this.openActionId.set(null);
    this.pendingDelete.set(null);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  private replaceInvoice(updated: Invoice): void {
    this.invoices.update((invoices) =>
      invoices.map((invoice) => (invoice.id === updated.id ? updated : invoice)),
    );
  }
}
