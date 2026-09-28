import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthApiService } from '@features/auth/data-access/auth-api.service';
import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import { SettingsRepository } from '../../data-access/settings.repository';
import { UserSettings } from '../../models/user-settings.model';
import { SettingsComponent } from './settings.component';

const SETTINGS: UserSettings = {
  fullName: 'Jane Doe',
  displayName: 'jane',
  role: 'Designer',
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

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let repository: jasmine.SpyObj<SettingsRepository>;
  let authApi: jasmine.SpyObj<AuthApiService>;
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    repository = jasmine.createSpyObj<SettingsRepository>('SettingsRepository', [
      'get',
      'save',
      'clearDemoData',
    ]);
    repository.get.and.resolveTo(SETTINGS);
    repository.save.and.callFake(async (_id, value) => value);
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['logout']);
    authApi.logout.and.resolveTo();
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: authApi },
        { provide: SettingsRepository, useValue: repository },
      ],
    }).compileComponents();
    TestBed.inject(AuthSessionService).start(
      {
        user: {
          id: 'one',
          fullName: 'Jane Doe',
          displayName: 'Jane',
          username: 'jane',
          email: 'jane@example.com',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        workspace: {
          id: 'workspace-id',
          name: "Jane's Workspace",
          slug: 'jane-workspace',
          role: 'owner',
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          expiresIn: 900,
          refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      },
      false,
    );
    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  it('should render protected identity fields as disabled', () => {
    const disabled = fixture.nativeElement.querySelectorAll('input:disabled');
    expect(disabled.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Email cannot be changed');
  });
  it('should save profile changes and update the session', async () => {
    const name: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[formcontrolname="fullName"]',
    );
    name.value = 'Jane Smith';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.settings__header button').click();
    await fixture.whenStable();
    expect(repository.save).toHaveBeenCalled();
    expect(TestBed.inject(AuthSessionService).currentUser()?.fullName).toBe('Jane Smith');
  });

  it('should lock CPF or CNPJ after its first saved value', async () => {
    const taxId: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[formcontrolname="taxId"]',
    );
    expect(taxId.disabled).toBeFalse();
    taxId.value = '123.456.789-01';
    taxId.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.settings__header button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(taxId.disabled).toBeTrue();
  });
});
