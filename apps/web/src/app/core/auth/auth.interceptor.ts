import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

import { AuthTokenRefreshService } from './auth-token-refresh.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const tokenRefresh = inject(AuthTokenRefreshService);
  const token = session.accessToken();
  const isApiRequest = request.url.startsWith(environment.apiUrl);
  const isAuthRequest = request.url.startsWith(`${environment.apiUrl}/auth/`);
  const authenticatedRequest =
    isApiRequest && !isAuthRequest && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        isApiRequest &&
        !isAuthRequest &&
        token &&
        session.refreshToken() &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        return tokenRefresh.refreshAccessToken().pipe(
          switchMap((accessToken) =>
            next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })),
          ),
          catchError(() => {
            session.clear();
            return throwError(() => error);
          }),
        );
      }

      if (
        isApiRequest &&
        !isAuthRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        session.clear();
      }

      return throwError(() => error);
    }),
  );
};
