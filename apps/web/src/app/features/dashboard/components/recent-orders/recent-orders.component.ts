import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RecentOrder } from '../../models/dashboard-widget.model';

@Component({
  selector: 'app-recent-orders',
  imports: [CurrencyPipe],
  templateUrl: './recent-orders.component.html',
  styleUrl: './recent-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentOrdersComponent {
  readonly orders = input.required<readonly RecentOrder[]>();
}
