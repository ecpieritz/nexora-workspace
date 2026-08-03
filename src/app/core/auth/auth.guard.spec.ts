import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const state = { url: '/dashboard' } as RouterStateSnapshot;

  it('should allow an authenticated user', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: { isAuthenticated: () => true } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, state));
    expect(result).toBeTrue();
  });

  it('should redirect a guest to login and preserve the requested URL', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: { isAuthenticated: () => false } },
      ],
    });

    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, state)) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/auth/login?returnUrl=%2Fdashboard');
  });
});
