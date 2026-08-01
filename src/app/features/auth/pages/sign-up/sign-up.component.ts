import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonDirective, FormFieldComponent, InputDirective } from '@shared/ui';

import { AuthConflictError, MockAuthRepository } from '../../data-access/mock-auth.repository';

type SignUpField = 'fullName' | 'email' | 'username' | 'password';

@Component({
  selector: 'app-sign-up',
  imports: [ButtonDirective, FormFieldComponent, InputDirective, ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  private readonly authRepository = inject(MockAuthRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(24),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/),
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
      ],
    ],
    acceptTerms: [false, Validators.requiredTrue],
  });

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly success = signal(false);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formValue = this.form.getRawValue();
    const registration = {
      fullName: formValue.fullName,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
    };

    try {
      await this.authRepository.register(registration);
      this.success.set(true);
    } catch (error: unknown) {
      if (error instanceof AuthConflictError) {
        this.form.controls[error.field].setErrors({ conflict: true });
        this.form.controls[error.field].markAsTouched();
        this.errorMessage.set(error.message);
      } else {
        this.errorMessage.set('We could not create your account. Please try again.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected reset(): void {
    this.form.reset();
    this.errorMessage.set(null);
    this.submitted.set(false);
    this.success.set(false);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected fieldHasError(field: SignUpField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(field: SignUpField): string | undefined {
    const control = this.form.controls[field];

    if (!this.fieldHasError(field)) {
      return undefined;
    }

    return this.validationMessage(field, control);
  }

  private validationMessage(field: SignUpField, control: FormControl<string>): string {
    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('conflict')) {
      return `This ${field === 'username' ? 'username' : 'email'} is already in use.`;
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (control.hasError('minlength')) {
      return field === 'password' ? 'Use at least 8 characters.' : 'Use at least 3 characters.';
    }

    if (control.hasError('pattern')) {
      return field === 'password'
        ? 'Include uppercase, lowercase, and a number.'
        : 'Use only letters, numbers, dots, hyphens, or underscores.';
    }

    return 'Check this field and try again.';
  }
}
