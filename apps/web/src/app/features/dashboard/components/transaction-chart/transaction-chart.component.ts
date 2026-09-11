import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TransactionAnalytics } from '../../models/dashboard-chart.model';

@Component({
  selector: 'app-transaction-chart',
  templateUrl: './transaction-chart.component.html',
  styleUrl: './transaction-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionChartComponent {
  readonly analytics = input.required<TransactionAnalytics>();

  private readonly circumference = 276.46;
  protected readonly segments = computed(() => {
    const segments = this.analytics().segments;
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let offset = 0;

    return segments.map((segment) => {
      const length = total === 0 ? 0 : (segment.value / total) * this.circumference;
      const chartSegment = {
        ...segment,
        dasharray: `${length} ${this.circumference - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return chartSegment;
    });
  });
}
