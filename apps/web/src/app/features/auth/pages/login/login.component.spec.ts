import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthApiService, AuthenticationError } from '../../data-access/auth-api.service';
import { AuthenticatedAccount } from '../../data-access/auth.models';
import { AuthSessionService } from '../../data-access/auth-session.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authApi: jasmine.SpyObj<AuthApiService>;
  let session: jasmine.SpyObj<AuthSessionService>;

  const account: AuthenticatedAccount = {
    user: {
      id: 'user-id',
      fullName: 'Jane Doe',
      displayName: 'Jane',
      email: 'jane@example.com',
      username: 'janedoe',
      createdAt: new Date().toISOString(),
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
  };

  beforeEach(async () => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['login', 'logout']);
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['start', 'clear'], {
      currentUser: signal(null),
      isAuthenticated: signal(false),
      refreshToken: signal(null),
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: authApi },
        { provide: AuthSessionService, useValue: session },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('should validate an empty submission', () => {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('should authenticate and start a remembered session', fakeAsync(() => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    authApi.login.and.resolveTo(account);
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: Record<string, string | boolean>): void;
      };
    };
    component.form.setValue({
      email: account.user.email,
      password: 'Nexora123',
      rememberMe: true,
    });

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();

    expect(authApi.login).toHaveBeenCalledWith({
      email: account.user.email,
      password: 'Nexora123',
    });
    expect(session.start).toHaveBeenCalledWith(account, true);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  }));

  it('should show a generic message for invalid credentials', fakeAsync(() => {
    authApi.login.and.rejectWith(new AuthenticationError());
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: Record<string, string | boolean>): void;
      };
    };
    component.form.setValue({
      email: account.user.email,
      password: 'WrongPassword1',
      rememberMe: false,
    });

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'email or password',
    );
  }));
});
