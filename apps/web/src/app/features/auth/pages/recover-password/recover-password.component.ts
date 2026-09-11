import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonDirective, FormFieldComponent, InputDirective } from '@shared/ui';

import { MockAuthRepository } from '../../data-access/mock-auth.repository';

@Component({
  selector: 'app-recover-password',
  imports: [ButtonDirective, FormFieldComponent, InputDirective, ReactiveFormsModule, RouterLink],
  templateUrl: './recover-password.component.html',
  styleUrl: './recover-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoverPasswordComponent {
  private readonly authRepository = inject(MockAuthRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly requested = signal(false);
  protected readonly resetToken = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    try {
      const token = await this.authRepository.requestPasswordReset(this.form.getRawValue().email);
      this.resetToken.set(token);
      this.requested.set(true);
    } catch {
      this.errorMessage.set('We could not process your request. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  protected get emailError(): string | undefined {
    const control = this.form.controls.email;

    if (control.valid || (!control.touched && !this.submitted())) {
      return undefined;
    }

    return control.hasError('required') ? 'Email is required.' : 'Enter a valid email address.';
  }
}
