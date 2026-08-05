import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import {
  ButtonDirective,
  ConfirmationDialogComponent,
  DataStateComponent,
  ToastService,
} from '@shared/ui';
import { SettingsRepository } from '../../data-access/settings.repository';
import { UserSettings } from '../../models/user-settings.model';

function taxIdValidator(control: AbstractControl<string>): ValidationErrors | null {
  const digits = control.value.replace(/\D/g, '');
  return digits.length === 0 || digits.length === 11 || digits.length === 14
    ? null
    : { taxId: true };
}

@Component({
  selector: 'app-settings',
  imports: [
    ButtonDirective,
    ConfirmationDialogComponent,
    DataStateComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancelClearData()' },
})
export class SettingsComponent implements OnInit {
  private readonly repository = inject(SettingsRepository);
  private readonly session = inject(AuthSessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly user = this.session.currentUser;
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmClearData = signal(false);
  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    role: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    birthDate: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(240)] }),
    taxId: new FormControl('', {
      nonNullable: true,
      validators: [taxIdValidator],
    }),
    language: new FormControl('en', { nonNullable: true }),
    timezone: new FormControl('America/Fortaleza', { nonNullable: true }),
    dateFormat: new FormControl('DD/MM/YYYY', { nonNullable: true }),
    currency: new FormControl('BRL', { nonNullable: true }),
    compactSidebar: new FormControl(false, { nonNullable: true }),
    taskNotifications: new FormControl(true, { nonNullable: true }),
    invoiceNotifications: new FormControl(true, { nonNullable: true }),
    eventNotifications: new FormControl(true, { nonNullable: true }),
    customerNotifications: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    const user = this.user();
    if (!user) return;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const settings = await this.repository.get(user.id, user.fullName, user.username);
      this.form.reset(settings);
      if (settings.taxId) this.form.controls.taxId.disable();
      else this.form.controls.taxId.enable();
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected async save(): Promise<void> {
    const user = this.user();
    if (!user || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const saved = await this.repository.save(user.id, this.form.getRawValue() as UserSettings);
      this.session.updateCurrentUser({ fullName: saved.fullName, username: saved.displayName });
      if (saved.taxId) this.form.controls.taxId.disable();
      this.form.markAsPristine();
      this.toast.success('Settings saved.');
    } catch {
      this.toast.error('Your settings could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
  protected initials(): string {
    return (this.form.controls.fullName.value || 'Nexora User')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  protected requestClearData(): void {
    this.confirmClearData.set(true);
  }
  protected cancelClearData(): void {
    this.confirmClearData.set(false);
  }
  protected async clearData(): Promise<void> {
    await this.repository.clearDemoData();
    this.session.clear();
    await this.router.navigate(['/auth/login']);
  }
}
