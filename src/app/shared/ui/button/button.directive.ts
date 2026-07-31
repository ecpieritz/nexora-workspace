import { booleanAttribute, Directive, input } from '@angular/core';

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Directive({
  selector: 'button[appButton]',
  host: {
    class: 'ui-button',
    '[class.ui-button--block]': 'fullWidth()',
    '[class.ui-button--loading]': 'loading()',
    '[class.ui-button--small]': "size() === 'small'",
    '[class.ui-button--medium]': "size() === 'medium'",
    '[class.ui-button--large]': "size() === 'large'",
    '[class.ui-button--primary]': "variant() === 'primary'",
    '[class.ui-button--secondary]': "variant() === 'secondary'",
    '[class.ui-button--ghost]': "variant() === 'ghost'",
    '[class.ui-button--danger]': "variant() === 'danger'",
    '[disabled]': 'disabled() || loading()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
    '[attr.aria-label]': 'loading() ? loadingLabel() : null',
  },
})
export class ButtonDirective {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Loading');
  readonly size = input<ButtonSize>('medium');
  readonly variant = input<ButtonVariant>('primary');
}
