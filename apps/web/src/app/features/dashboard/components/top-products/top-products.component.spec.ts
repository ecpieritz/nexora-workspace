import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopProductsComponent } from './top-products.component';

describe('TopProductsComponent', () => {
  let fixture: ComponentFixture<TopProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TopProductsComponent] }).compileComponents();
    fixture = TestBed.createComponent(TopProductsComponent);
    fixture.componentRef.setInput('products', [
      {
        id: 'product-1',
        name: 'Nike Shoes Black Pattern',
        productVisual: 'shoe',
        price: 87,
        quantity: 12,
        orderCount: 4,
        revenue: 1044,
      },
    ]);
    fixture.detectChanges();
  });

  it('should render product sales and revenue', () => {
    expect(fixture.nativeElement.textContent).toContain('Nike Shoes Black Pattern');
    expect(
      fixture.nativeElement.querySelector('.top-products__rating').getAttribute('aria-label'),
    ).toContain('12 units sold across 4 orders');
    expect(fixture.nativeElement.textContent).toContain('$1,044 revenue');
  });
});
