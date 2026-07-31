import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardPadding = 'none' | 'small' | 'medium' | 'large';

@Component({
  selector: 'app-card',
  template: '<ng-content />',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-card',
    '[class.ui-card--elevated]': 'elevated()',
    '[class.ui-card--padding-none]': "padding() === 'none'",
    '[class.ui-card--padding-small]': "padding() === 'small'",
    '[class.ui-card--padding-medium]': "padding() === 'medium'",
    '[class.ui-card--padding-large]': "padding() === 'large'",
  },
})
export class CardComponent {
  readonly elevated = input(false, { transform: booleanAttribute });
  readonly padding = input<CardPadding>('medium');
}
