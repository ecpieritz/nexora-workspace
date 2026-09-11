import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly controlId = input.required<string>();
  readonly error = input<string>();
  readonly hint = input<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
}
