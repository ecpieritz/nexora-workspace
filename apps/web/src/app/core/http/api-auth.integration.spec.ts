import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from '@core/auth';
import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import { AuthenticatedAccount } from '@features/auth/data-access/auth.models';
import { ToastService } from '@shared/ui';

import { ApiLoadingService } from './api-loading.service';
import { apiInterceptor } from './api.interceptor';

describe('API and authentication interceptor integration', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let loading: ApiLoadingService;
  let session: jasmine.SpyObj<AuthSessionService>;
  let accessToken: WritableSignal<string | null>;
  let refreshToken: WritableSignal<string | null>;
  let toast: jasmine.SpyObj<ToastService>;

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
    accessToken = signal<string | null>('expired-access-token');
    refreshToken = signal<string | null>('current-refresh-token');
    session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['clear', 'refresh'], {
      accessToken,
      refreshToken,
    });
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(ApiLoadingService);
  });

  afterEach(() => httpTesting.verify());

  it('should attach authentication and track the complete API request', () => {
    http.get('/api/customers').subscribe();
    expect(loading.isLoading()).toBeTrue();

    const request = httpTesting.expectOne('/api/customers');
    expect(request.request.headers.get('Authorization')).toBe('Bearer expired-access-token');
    request.flush({ data: [] });

    expect(loading.isLoading()).toBeFalse();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should keep loading active while a token is refreshed and the request is retried', () => {
    http.get('/api/dashboard/metrics').subscribe();
    httpTesting
      .expectOne('/api/dashboard/metrics')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(loading.isLoading()).toBeTrue();
    expect(toast.error).not.toHaveBeenCalled();

    const refreshRequest = httpTesting.expectOne('/api/auth/refresh');
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'current-refresh-token' });
    refreshRequest.flush({ data: refreshedAccount });

    const retry = httpTesting.expectOne('/api/dashboard/metrics');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer refreshed-access-token');
    retry.flush({ data: [] });

    expect(session.refresh).toHaveBeenCalledOnceWith(refreshedAccount);
    expect(loading.isLoading()).toBeFalse();
  });

  it('should show the API message and release loading after a terminal failure', () => {
    http.patch('/api/tasks/task-1/status', { status: 'doing' }).subscribe({
      error: () => undefined,
    });
    httpTesting
      .expectOne('/api/tasks/task-1/status')
      .flush(
        { error: { code: 'FORBIDDEN', message: 'You cannot move this task.' } },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(toast.error).toHaveBeenCalledOnceWith('You cannot move this task.');
    expect(loading.isLoading()).toBeFalse();
  });
});
