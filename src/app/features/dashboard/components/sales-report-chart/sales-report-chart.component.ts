import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { SalesReportPoint } from '../../models/dashboard-chart.model';

interface ChartPoint extends SalesReportPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-sales-report-chart',
  templateUrl: './sales-report-chart.component.html',
  styleUrl: './sales-report-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesReportChartComponent {
  readonly data = input.required<readonly SalesReportPoint[]>();

  protected readonly gridValues = [0, 20, 40, 60, 80, 100];
  protected readonly activeIndex = signal<number | null>(null);
  protected readonly points = computed<ChartPoint[]>(() => {
    const data = this.data();
    const step = data.length > 1 ? 640 / (data.length - 1) : 0;
    return data.map((point, index) => ({
      ...point,
      x: 48 + index * step,
      y: this.valueToY(point.value),
    }));
  });
  protected readonly linePath = computed(() =>
    this.points()
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
  );
  protected readonly areaPath = computed(() => `${this.linePath()} L 688 220 L 48 220 Z`);
  protected readonly activePoint = computed(() => {
    const index = this.activeIndex();
    return index === null ? null : this.points()[index];
  });

  protected valueToY(value: number): number {
    return 220 - (value / 100) * 180;
  }
}
