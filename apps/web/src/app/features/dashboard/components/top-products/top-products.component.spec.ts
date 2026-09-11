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
        rating: 4,
        reviews: 128,
      },
    ]);
    fixture.detectChanges();
  });

  it('should render product details and the correct rating', () => {
    expect(fixture.nativeElement.textContent).toContain('Nike Shoes Black Pattern');
    expect(fixture.nativeElement.querySelectorAll('.top-products__star--filled').length).toBe(4);
    expect(
      fixture.nativeElement.querySelector('.top-products__rating').getAttribute('aria-label'),
    ).toContain('128 reviews');
  });
});
