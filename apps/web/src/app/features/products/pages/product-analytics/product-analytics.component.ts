import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataStateComponent, ToastService } from '@shared/ui';
import { ProductRepository } from '../../data-access/product.repository';
import { ProductAnalytics } from '../../models/product-analytics.model';

@Component({
  selector: 'app-product-analytics',
  imports: [DataStateComponent, ReactiveFormsModule],
  templateUrl: './product-analytics.component.html',
  styleUrl: './product-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeEditor()' },
})
export class ProductAnalyticsComponent implements OnInit {
  private readonly repository = inject(ProductRepository);
  private readonly toast = inject(ToastService);
  protected readonly analytics = signal<ProductAnalytics | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  protected readonly productForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    brand: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    negotiable: new FormControl(false, { nonNullable: true }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });
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
  protected openEditor(): void {
    this.productForm.reset({
      name: '',
      brand: '',
      category: '',
      price: null,
      negotiable: false,
      description: '',
    });
    this.saveError.set(false);
    this.editorOpen.set(true);
  }
  protected closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }
  protected async saveProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const value = this.productForm.getRawValue();
    if (value.price === null) return;
    this.saving.set(true);
    this.saveError.set(false);
    try {
      const product = await this.repository.create({ ...value, price: value.price });
      this.analytics.update((data) =>
        data
          ? {
              ...data,
              ranking: [product, ...data.ranking],
              metrics: data.metrics.map((metric) =>
                metric.id === 'products' ? { ...metric, value: metric.value + 1 } : metric,
              ),
            }
          : data,
      );
      this.editorOpen.set(false);
      this.toast.success('Product created.');
    } catch {
      this.saveError.set(true);
      this.toast.error('The product could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
}
