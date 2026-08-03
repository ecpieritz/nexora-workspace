import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

import { DashboardShellComponent } from './dashboard-shell.component';

describe('DashboardShellComponent', () => {
  let fixture: ComponentFixture<DashboardShellComponent>;
  let session: jasmine.SpyObj<AuthSessionService>;

  beforeEach(async () => {
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['clear'], {
      currentUser: signal({
        id: 'user-id',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        username: 'janedoe',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    });

    await TestBed.configureTestingModule({
      imports: [DashboardShellComponent],
      providers: [provideRouter([]), { provide: AuthSessionService, useValue: session }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardShellComponent);
    fixture.detectChanges();
  });

  it('should render the primary navigation and current user', () => {
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('should clear the session when signing out', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    const signOutButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('[title="Sign out"]');
    signOutButton.click();
    await fixture.whenStable();

    expect(session.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
