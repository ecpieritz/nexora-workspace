import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, map, Observable, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { AuthenticatedAccount } from '@features/auth/data-access/auth.models';
import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

interface ApiDataResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AuthTokenRefreshService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly session = inject(AuthSessionService);
  private refreshRequest: Observable<string> | null = null;

  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest) return this.refreshRequest;

    const refreshToken = this.session.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('A refresh token is not available.'));
    }

    this.refreshRequest = this.http
      .post<ApiDataResponse<AuthenticatedAccount>>(`${environment.apiUrl}/auth/refresh`, {
        refreshToken,
      })
      .pipe(
        map((response) => response.data),
        tap((account) => this.session.refresh(account)),
        map((account) => account.tokens.accessToken),
        finalize(() => (this.refreshRequest = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshRequest;
  }
}
