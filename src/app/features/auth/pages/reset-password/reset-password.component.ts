import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonDirective, FormFieldComponent, InputDirective } from '@shared/ui';

import {
  MockAuthRepository,
  PasswordResetTokenError,
} from '../../data-access/mock-auth.repository';

type PasswordField = 'password' | 'confirmPassword';

@Component({
  selector: 'app-reset-password',
  imports: [ButtonDirective, FormFieldComponent, InputDirective, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly authRepository = inject(MockAuthRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly form = this.formBuilder.group({
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
      ],
    ],
    confirmPassword: ['', Validators.required],
  });
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly success = signal(false);
  protected readonly tokenAvailable = this.token !== null;

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid || !this.passwordsMatch || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    try {
      await this.authRepository.resetPassword(this.token, this.form.getRawValue().password);
      this.success.set(true);
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof PasswordResetTokenError
          ? error.message
          : 'We could not reset your password. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected fieldError(field: PasswordField): string | undefined {
    const control = this.form.controls[field];

    if (control.valid && (field !== 'confirmPassword' || this.passwordsMatch)) {
      return undefined;
    }

    if (!control.touched && !this.submitted()) {
      return undefined;
    }

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (field === 'confirmPassword' && !this.passwordsMatch) {
      return 'Passwords do not match.';
    }

    if (control.hasError('minlength')) {
      return 'Use at least 8 characters.';
    }

    return 'Include uppercase, lowercase, and a number.';
  }

  protected fieldHasError(field: PasswordField): boolean {
    return this.fieldError(field) !== undefined;
  }

  private get passwordsMatch(): boolean {
    const { password, confirmPassword } = this.form.getRawValue();
    return password === confirmPassword;
  }
}
