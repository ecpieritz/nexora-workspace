import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const user = {
    id: 'user-id',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    username: 'janedoe',
    createdAt: new Date().toISOString(),
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
    service.start(user, false);

    expect(service.currentUser()?.email).toBe(user.email);
    expect(sessionStorage.getItem('nexora:tab-session')).not.toBeNull();
    expect(localStorage.getItem('nexora:persistent-session')).toBeNull();
  });

  it('should persist remembered sessions across tabs', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start(user, true);

    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('nexora:persistent-session')).not.toBeNull();
    expect(sessionStorage.getItem('nexora:tab-session')).toBeNull();
  });

  it('should clear the current session', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start(user, true);
    service.clear();

    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('nexora:persistent-session')).toBeNull();
  });
});
