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
});
