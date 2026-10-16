import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import { AuthenticatedAccount } from '@features/auth/data-access/auth.models';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpTesting: HttpTestingController;
  let session: jasmine.SpyObj<AuthSessionService>;
  let refreshToken: WritableSignal<string | null>;

  const refreshedAccount: AuthenticatedAccount = {
    user: {
      id: 'user-id',
      fullName: 'Jane Doe',
      displayName: 'Jane',
      email: 'jane@example.com',
      username: 'janedoe',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    workspace: {
      id: 'workspace-id',
      name: "Jane's Workspace",
      slug: 'jane-workspace',
      role: 'owner',
    },
    tokens: {
      accessToken: 'refreshed-access-token',
      refreshToken: 'rotated-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshExpiresAt: '2026-01-08T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    refreshToken = signal<string | null>(null);
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['clear', 'refresh'], {
      accessToken: signal<string | null>('session-token'),
      refreshToken,
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: session },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should attach the session token to API requests', () => {
    const http = TestBed.inject(HttpClient);

    http.get('/api/customers').subscribe();

    const request = httpTesting.expectOne('/api/customers');
    expect(request.request.headers.get('Authorization')).toBe('Bearer session-token');
    request.flush([]);
  });

  it('should not expose the token to external requests', () => {
    const http = TestBed.inject(HttpClient);

    http.get('https://example.com/resource').subscribe();

    const request = httpTesting.expectOne('https://example.com/resource');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('should clear the session after an unauthorized API response', () => {
    const http = TestBed.inject(HttpClient);

    http.get('/api/customers').subscribe({ error: () => undefined });
    httpTesting
      .expectOne('/api/customers')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(session.clear).toHaveBeenCalled();
  });

  it('should rotate tokens and retry an unauthorized API request once', () => {
    refreshToken.set('current-refresh-token');
    const http = TestBed.inject(HttpClient);

    http.get('/api/customers').subscribe();
    httpTesting
      .expectOne('/api/customers')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpTesting.expectOne('/api/auth/refresh');
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'current-refresh-token' });
    refreshRequest.flush({ data: refreshedAccount });

    const retry = httpTesting.expectOne('/api/customers');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer refreshed-access-token');
    retry.flush([]);

    expect(session.refresh).toHaveBeenCalledWith(refreshedAccount);
    expect(session.clear).not.toHaveBeenCalled();
  });
});
