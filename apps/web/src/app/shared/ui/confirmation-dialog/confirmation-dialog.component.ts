import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonDirective } from '../button/button.directive';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [ButtonDirective],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
