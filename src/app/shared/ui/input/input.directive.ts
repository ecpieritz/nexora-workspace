import { booleanAttribute, Directive, input } from '@angular/core';

@Directive({
  selector: 'input[appInput], textarea[appInput], select[appInput]',
  host: {
    class: 'ui-input',
    '[attr.aria-invalid]': "invalid() ? 'true' : null",
  },
})
export class InputDirective {
  readonly invalid = input(false, { transform: booleanAttribute });
}
