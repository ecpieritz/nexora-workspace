import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { MockAuthRepository } from '../../data-access/mock-auth.repository';
import { SignUpComponent } from './sign-up.component';

describe('SignUpComponent', () => {
  let fixture: ComponentFixture<SignUpComponent>;
  let repository: jasmine.SpyObj<MockAuthRepository>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj<MockAuthRepository>('MockAuthRepository', ['register']);
    repository.register.and.resolveTo({
      id: 'user-id',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      username: 'janedoe',
      createdAt: new Date().toISOString(),
    });

    await TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [provideRouter([]), { provide: MockAuthRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpComponent);
    fixture.detectChanges();
  });

  it('should show validation feedback after an empty submission', () => {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);
    expect(repository.register).not.toHaveBeenCalled();
  });

  it('should register a valid demo account', fakeAsync(() => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: Record<string, string | boolean>): void;
      };
    };

    component.form.setValue({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      username: 'janedoe',
      password: 'Nexora123',
      acceptTerms: true,
    });

    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    tick();
    fixture.detectChanges();

    expect(repository.register).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/auth/account-created']);
  }));
});
