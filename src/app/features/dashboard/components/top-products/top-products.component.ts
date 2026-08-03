import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TopProduct } from '../../models/dashboard-widget.model';

@Component({
  selector: 'app-top-products',
  imports: [CurrencyPipe],
  templateUrl: './top-products.component.html',
  styleUrl: './top-products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopProductsComponent {
  readonly products = input.required<readonly TopProduct[]>();
  protected readonly stars = [1, 2, 3, 4, 5];
}
