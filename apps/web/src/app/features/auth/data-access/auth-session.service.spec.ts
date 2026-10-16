import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const account = {
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
      role: 'owner' as const,
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer' as const,
      expiresIn: 900,
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should keep a regular session in the current tab', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start(account, false);

    expect(service.currentUser()?.email).toBe(account.user.email);
    expect(service.accessToken()).toBe('access-token');
    expect(service.refreshToken()).toBe('refresh-token');
    expect(sessionStorage.getItem('nexora:tab-session')).not.toBeNull();
    expect(localStorage.getItem('nexora:persistent-session')).toBeNull();
  });

  it('should persist remembered sessions across tabs', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start(account, true);

    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('nexora:persistent-session')).not.toBeNull();
    expect(sessionStorage.getItem('nexora:tab-session')).toBeNull();
  });

  it('should clear the current session', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start(account, true);
    service.clear();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.accessToken()).toBeNull();
    expect(localStorage.getItem('nexora:persistent-session')).toBeNull();
  });

  it('should update and persist the active user profile', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start(account, true);
    service.updateCurrentUser({ fullName: 'Jane Smith' });
    expect(service.currentUser()?.fullName).toBe('Jane Smith');
    expect(localStorage.getItem('nexora:persistent-session')).toContain('Jane Smith');
  });

  it('should discard sessions created by the former mock authentication', () => {
    localStorage.setItem(
      'nexora:persistent-session',
      JSON.stringify({
        token: 'legacy-random-token',
        user: account.user,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        persistent: true,
      }),
    );

    const service = TestBed.inject(AuthSessionService);

    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('nexora:persistent-session')).toBeNull();
  });
});
