import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiErrorService } from './api-error.service';
import { ApiLoadingService } from './api-loading.service';
import { apiInterceptor, SKIP_GLOBAL_API_ERROR, SKIP_GLOBAL_API_LOADING } from './api.interceptor';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let loading: ApiLoadingService;
  let errors: jasmine.SpyObj<ApiErrorService>;

  beforeEach(() => {
    errors = jasmine.createSpyObj<ApiErrorService>('ApiErrorService', ['handle']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiErrorService, useValue: errors },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(ApiLoadingService);
  });

  afterEach(() => httpTesting.verify());

  it('should track API requests until they complete', () => {
    http.get('/api/dashboard/metrics').subscribe();
    expect(loading.isLoading()).toBeTrue();

    httpTesting.expectOne('/api/dashboard/metrics').flush({ data: [] });

    expect(loading.isLoading()).toBeFalse();
  });

  it('should report API errors and preserve the original response', () => {
    let receivedError: unknown;
    http.get('/api/tasks').subscribe({ error: (error: unknown) => (receivedError = error) });
    const request = httpTesting.expectOne('/api/tasks');
    request.flush(
      { error: { code: 'FORBIDDEN', message: 'Access denied.' } },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(errors.handle).toHaveBeenCalledOnceWith(receivedError);
    expect(loading.isLoading()).toBeFalse();
  });

  it('should ignore external requests and honor request context overrides', () => {
    http.get('https://example.com/resource').subscribe();
    expect(loading.isLoading()).toBeFalse();
    httpTesting.expectOne('https://example.com/resource').flush({});

    const context = new HttpContext()
      .set(SKIP_GLOBAL_API_LOADING, true)
      .set(SKIP_GLOBAL_API_ERROR, true);
    http.get('/api/optional', { context }).subscribe({ error: () => undefined });
    expect(loading.isLoading()).toBeFalse();
    httpTesting.expectOne('/api/optional').flush(null, { status: 500, statusText: 'Server Error' });

    expect(errors.handle).not.toHaveBeenCalled();
  });
});
