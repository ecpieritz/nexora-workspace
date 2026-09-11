import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesReportChartComponent } from './sales-report-chart.component';

describe('SalesReportChartComponent', () => {
  let fixture: ComponentFixture<SalesReportChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesReportChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SalesReportChartComponent);
    fixture.componentRef.setInput('data', [
      { label: '10am', value: 40 },
      { label: '11am', value: 60 },
      { label: '12pm', value: 50 },
    ]);
    fixture.detectChanges();
  });

  it('should render a path and one accessible point for each value', () => {
    const path: SVGPathElement = fixture.nativeElement.querySelector('.sales-report__line');
    const points: NodeListOf<SVGGElement> =
      fixture.nativeElement.querySelectorAll('.sales-report__point');

    expect(path.getAttribute('d')).toContain('M');
    expect(points.length).toBe(3);
    expect(points[0].getAttribute('aria-label')).toContain('10am: 40 sales');
  });
});
