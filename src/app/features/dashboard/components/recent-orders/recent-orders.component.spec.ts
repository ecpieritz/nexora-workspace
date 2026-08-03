import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentOrdersComponent } from './recent-orders.component';

describe('RecentOrdersComponent', () => {
  let fixture: ComponentFixture<RecentOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecentOrdersComponent] }).compileComponents();
    fixture = TestBed.createComponent(RecentOrdersComponent);
    fixture.componentRef.setInput('orders', [
      {
        id: 'order-1',
        trackingNumber: '#876364',
        productName: 'Camera Lens',
        productVisual: 'camera',
        price: 178,
        quantity: 325,
        totalAmount: 146660,
      },
    ]);
    fixture.detectChanges();
  });

  it('should render recent orders in an accessible table', () => {
    expect(fixture.nativeElement.querySelector('caption').textContent).toContain('recent product');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('#876364');
    expect(fixture.nativeElement.textContent).toContain('Camera Lens');
  });
});
