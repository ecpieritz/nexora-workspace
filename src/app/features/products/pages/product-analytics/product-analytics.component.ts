import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ProductRepository } from '../../data-access/product.repository';
import { ProductAnalytics } from '../../models/product-analytics.model';

@Component({
  selector: 'app-product-analytics',
  templateUrl: './product-analytics.component.html',
  styleUrl: './product-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAnalyticsComponent implements OnInit {
  private readonly repository = inject(ProductRepository);
  protected readonly analytics = signal<ProductAnalytics | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly maximumMonthlySales = computed(() =>
    Math.max(...(this.analytics()?.monthlySales.map(({ value }) => value) ?? [1])),
  );
  ngOnInit(): void {
    void this.loadAnalytics();
  }
  protected async loadAnalytics(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.analytics.set(await this.repository.getAnalytics());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected currency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
