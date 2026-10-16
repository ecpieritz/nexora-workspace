import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '@shared/ui';

import { ApiErrorService } from './api-error.service';

describe('ApiErrorService', () => {
  let service: ApiErrorService;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: toast }] });
    service = TestBed.inject(ApiErrorService);
  });

  it('should expose safe connectivity and server messages', () => {
    service.handle(new HttpErrorResponse({ status: 0 }));
    expect(toast.error).toHaveBeenCalledWith(
      'We could not reach the server. Check your connection and try again.',
    );

    toast.error.calls.reset();
    service.handle(new HttpErrorResponse({ status: 500 }));
    expect(toast.error).toHaveBeenCalledWith(
      'The server could not complete your request. Please try again shortly.',
    );
  });

  it('should use API messages for expected request errors', () => {
    service.handle(
      new HttpErrorResponse({
        status: 403,
        error: { error: { code: 'FORBIDDEN', message: 'You cannot edit this task.' } },
      }),
    );

    expect(toast.error).toHaveBeenCalledOnceWith('You cannot edit this task.');
  });

  it('should leave unauthorized errors to the authentication flow', () => {
    service.handle(new HttpErrorResponse({ status: 401 }));

    expect(toast.error).not.toHaveBeenCalled();
  });
});
