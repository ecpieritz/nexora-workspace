import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionChartComponent } from './transaction-chart.component';

describe('TransactionChartComponent', () => {
  let fixture: ComponentFixture<TransactionChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TransactionChartComponent);
    fixture.componentRef.setInput('analytics', {
      headline: 80,
      label: 'Transactions',
      segments: [
        { id: 'sale', label: 'Sale', value: 60, color: '#5b8ff9' },
        { id: 'return', label: 'Return', value: 40, color: '#ff876c' },
      ],
    });
    fixture.detectChanges();
  });

  it('should render the headline, segments, and textual legend', () => {
    expect(fixture.nativeElement.textContent).toContain('80%');
    expect(fixture.nativeElement.querySelectorAll('.transaction-chart__segment').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.transaction-chart__legend li').length).toBe(2);
  });
});
