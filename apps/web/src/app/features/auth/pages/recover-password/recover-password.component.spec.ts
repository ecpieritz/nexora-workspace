import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthApiService } from '../../data-access/auth-api.service';
import { RecoverPasswordComponent } from './recover-password.component';

describe('RecoverPasswordComponent', () => {
  let fixture: ComponentFixture<RecoverPasswordComponent>;
  let authApi: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['requestPasswordReset']);
    authApi.requestPasswordReset.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [RecoverPasswordComponent],
      providers: [provideRouter([]), { provide: AuthApiService, useValue: authApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecoverPasswordComponent);
    fixture.detectChanges();
  });

  it('should validate an empty email', () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(authApi.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('should display the neutral recovery confirmation', fakeAsync(() => {
    const email: HTMLInputElement = fixture.nativeElement.querySelector('input');
    email.value = 'jane@example.com';
    email.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();

    expect(authApi.requestPasswordReset).toHaveBeenCalledWith('jane@example.com');
    expect(fixture.nativeElement.textContent).toContain('recovery instructions have been sent');
  }));
});
