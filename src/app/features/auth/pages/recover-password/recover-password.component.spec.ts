import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MockAuthRepository } from '../../data-access/mock-auth.repository';
import { RecoverPasswordComponent } from './recover-password.component';

describe('RecoverPasswordComponent', () => {
  let fixture: ComponentFixture<RecoverPasswordComponent>;
  let repository: jasmine.SpyObj<MockAuthRepository>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj<MockAuthRepository>('MockAuthRepository', [
      'requestPasswordReset',
    ]);
    repository.requestPasswordReset.and.resolveTo('reset-token');

    await TestBed.configureTestingModule({
      imports: [RecoverPasswordComponent],
      providers: [provideRouter([]), { provide: MockAuthRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecoverPasswordComponent);
    fixture.detectChanges();
  });

  it('should validate an empty email', () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(repository.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('should display the demo recovery link', fakeAsync(() => {
    const email: HTMLInputElement = fixture.nativeElement.querySelector('input');
    email.value = 'jane@example.com';
    email.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();

    expect(repository.requestPasswordReset).toHaveBeenCalledWith('jane@example.com');
    expect(fixture.nativeElement.textContent).toContain('Continue password reset');
  }));
});
