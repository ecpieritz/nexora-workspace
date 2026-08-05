import { inject, Injectable } from '@angular/core';
import { MockApiService, MockStorageService } from '@core/mock-api';
import { UserSettings } from '../models/user-settings.model';

const STORAGE_KEY = 'nexora:user-settings';

@Injectable({ providedIn: 'root' })
export class SettingsRepository {
  private readonly api = inject(MockApiService);
  private readonly storage = inject(MockStorageService);

  get(userId: string, fullName: string, username: string): Promise<UserSettings> {
    return this.api.execute(() => {
      const settings = this.storage.read<Record<string, UserSettings>>(STORAGE_KEY, {});
      return structuredClone(settings[userId] ?? this.defaults(fullName, username));
    });
  }

  save(userId: string, value: UserSettings): Promise<UserSettings> {
    return this.api.execute(() => {
      const settings = this.storage.read<Record<string, UserSettings>>(STORAGE_KEY, {});
      settings[userId] = structuredClone(value);
      this.storage.write(STORAGE_KEY, settings);
      this.storage.write('nexora:compact-sidebar', value.compactSidebar);
      return structuredClone(value);
    });
  }

  clearDemoData(): Promise<void> {
    return this.api.execute(() => localStorage.clear());
  }

  private defaults(fullName: string, username: string): UserSettings {
    return {
      fullName,
      displayName: username,
      role: 'Workspace member',
      phone: '',
      birthDate: '',
      bio: '',
      taxId: '',
      language: 'en',
      timezone: 'America/Fortaleza',
      dateFormat: 'DD/MM/YYYY',
      currency: 'BRL',
      compactSidebar: false,
      taskNotifications: true,
      invoiceNotifications: true,
      eventNotifications: true,
      customerNotifications: false,
    };
  }
}
