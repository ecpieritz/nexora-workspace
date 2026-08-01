import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonDirective, FormFieldComponent, InputDirective } from '@shared/ui';

import { AuthSessionService } from '../../data-access/auth-session.service';
import { AuthenticationError, MockAuthRepository } from '../../data-access/mock-auth.repository';

type LoginField = 'email' | 'password';

@Component({
  selector: 'app-login',
  imports: [ButtonDirective, FormFieldComponent, InputDirective, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authRepository = inject(MockAuthRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  protected readonly session = inject(AuthSessionService);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: false,
  });

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();
    this.submitting.set(true);

    try {
      const user = await this.authRepository.authenticate({ email, password });
      this.session.start(user, rememberMe);
      this.form.controls.password.reset();
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof AuthenticationError
          ? error.message
          : 'We could not sign you in. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected signOut(): void {
    this.session.clear();
    this.form.reset();
    this.errorMessage.set(null);
    this.submitted.set(false);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected fieldHasError(field: LoginField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(field: LoginField): string | undefined {
    if (!this.fieldHasError(field)) {
      return undefined;
    }

    const control = this.form.controls[field];

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    return 'Check this field and try again.';
  }
}
