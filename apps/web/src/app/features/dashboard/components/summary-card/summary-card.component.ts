import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DashboardSummaryIcon, DashboardSummaryTone } from '../../models/dashboard-summary.model';

@Component({
  selector: 'app-summary-card',
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "'summary-card summary-card--' + tone()",
  },
})
export class SummaryCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly suffix = input('');
  readonly icon = input.required<DashboardSummaryIcon>();
  readonly tone = input.required<DashboardSummaryTone>();
}
