import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';

import { environment } from '@env/environment';

import { ApiErrorService } from './api-error.service';
import { ApiLoadingService } from './api-loading.service';

export const SKIP_GLOBAL_API_LOADING = new HttpContextToken<boolean>(() => false);
export const SKIP_GLOBAL_API_ERROR = new HttpContextToken<boolean>(() => false);

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(ApiLoadingService);
  const errors = inject(ApiErrorService);
  const isApiRequest = request.url.startsWith(environment.apiUrl);
  const tracksLoading = isApiRequest && !request.context.get(SKIP_GLOBAL_API_LOADING);
  const handlesErrors = isApiRequest && !request.context.get(SKIP_GLOBAL_API_ERROR);

  if (tracksLoading) loading.start();

  return next(request).pipe(
    catchError((error: unknown) => {
      if (handlesErrors && error instanceof HttpErrorResponse) errors.handle(error);
      return throwError(() => error);
    }),
    finalize(() => {
      if (tracksLoading) loading.finish();
    }),
  );
};
