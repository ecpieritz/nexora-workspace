import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSessionService } from '../../data-access/auth-session.service';
import { AuthenticationError, MockAuthRepository } from '../../data-access/mock-auth.repository';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let repository: jasmine.SpyObj<MockAuthRepository>;
  let session: jasmine.SpyObj<AuthSessionService>;

  const user = {
    id: 'user-id',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    username: 'janedoe',
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    repository = jasmine.createSpyObj<MockAuthRepository>('MockAuthRepository', ['authenticate']);
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['start', 'clear'], {
      currentUser: signal(null),
      isAuthenticated: signal(false),
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: MockAuthRepository, useValue: repository },
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
    expect(repository.authenticate).not.toHaveBeenCalled();
  });

  it('should authenticate and start a remembered session', fakeAsync(() => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    repository.authenticate.and.resolveTo(user);
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: Record<string, string | boolean>): void;
      };
    };
    component.form.setValue({
      email: user.email,
      password: 'Nexora123',
      rememberMe: true,
    });

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();

    expect(repository.authenticate).toHaveBeenCalledWith({
      email: user.email,
      password: 'Nexora123',
    });
    expect(session.start).toHaveBeenCalledWith(user, true);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  }));

  it('should show a generic message for invalid credentials', fakeAsync(() => {
    repository.authenticate.and.rejectWith(new AuthenticationError());
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: Record<string, string | boolean>): void;
      };
    };
    component.form.setValue({
      email: user.email,
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
