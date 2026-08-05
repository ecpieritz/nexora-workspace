import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductRepository } from '../../data-access/product.repository';
import { ProductAnalyticsComponent } from './product-analytics.component';

class ProductRepositoryStub {
  getAnalytics = jasmine.createSpy().and.resolveTo({
    metrics: [
      {
        id: 'products',
        label: 'Total products',
        value: 10,
        change: '+1',
        trend: [1, 2, 3, 4, 5, 6, 7],
      },
    ],
    ranking: [],
    monthlySales: [{ month: 'Jan', value: 10 }],
    distribution: [],
  });
  create = jasmine.createSpy().and.resolveTo({
    id: 'new',
    name: 'Notebook',
    category: 'Computers',
    price: 1200,
    orders: 0,
    sales: 0,
  });
}

describe('ProductAnalyticsComponent', () => {
  let fixture: ComponentFixture<ProductAnalyticsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductAnalyticsComponent],
      providers: [{ provide: ProductRepository, useClass: ProductRepositoryStub }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductAnalyticsComponent);
  });
  it('should load and render product metrics', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Total products');
  });
  it('should validate and create a product', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      openEditor(): void;
      saveProduct(): Promise<void>;
      productForm: { patchValue(value: object): void };
    };
    component.openEditor();
    component.productForm.patchValue({
      name: 'Notebook',
      brand: 'Nexora',
      category: 'Computers',
      price: 1200,
      negotiable: true,
      description: 'A portfolio test product.',
    });
    await component.saveProduct();
    fixture.detectChanges();
    expect(TestBed.inject(ProductRepository).create).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Notebook');
  });
});
