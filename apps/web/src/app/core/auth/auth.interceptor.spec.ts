import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpTesting: HttpTestingController;
  let session: jasmine.SpyObj<AuthSessionService>;

  beforeEach(() => {
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['clear'], {
      accessToken: signal<string | null>('session-token'),
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
});
