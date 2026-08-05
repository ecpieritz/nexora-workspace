import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type DataStateKind = 'loading' | 'empty' | 'error';

@Component({
  selector: 'app-data-state',
  templateUrl: './data-state.component.html',
  styleUrl: './data-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataStateComponent {
  readonly kind = input.required<DataStateKind>();
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly actionLabel = input<string>('Try again');
  readonly action = output<void>();
}
