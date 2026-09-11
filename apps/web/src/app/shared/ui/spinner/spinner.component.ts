import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    '[class]': "'spinner spinner--' + size()",
  },
})
export class SpinnerComponent {
  readonly label = input('Loading');
  readonly size = input<SpinnerSize>('medium');
}
