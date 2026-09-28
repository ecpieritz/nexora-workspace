import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import {
  AuthenticatedAccount,
  LoginCredentials,
  RegisteredAccount,
  RegistrationInput,
} from './auth.models';

interface ApiDataResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export class AuthConflictError extends Error {
  constructor(readonly field: 'email' | 'username' | null = null) {
    super(
      field
        ? `An account with this ${field} already exists.`
        : 'An account with this email or username already exists.',
    );
    this.name = 'AuthConflictError';
  }
}

export class AuthenticationError extends Error {
  constructor() {
    super('The email or password you entered is incorrect.');
    this.name = 'AuthenticationError';
  }
}

export class PasswordResetTokenError extends Error {
  constructor() {
    super('This password reset link is invalid or has expired.');
    this.name = 'PasswordResetTokenError';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  async register(input: RegistrationInput): Promise<RegisteredAccount> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiDataResponse<RegisteredAccount>>(`${this.authUrl}/register`, input),
      );
      return response.data;
    } catch (error: unknown) {
      if (this.isApiError(error, 409)) {
        throw new AuthConflictError();
      }
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthenticatedAccount> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiDataResponse<AuthenticatedAccount>>(`${this.authUrl}/login`, credentials),
      );
      return response.data;
    } catch (error: unknown) {
      if (this.isApiError(error, 401, 'INVALID_CREDENTIALS')) {
        throw new AuthenticationError();
      }
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.authUrl}/forgot-password`, { email }));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.authUrl}/reset-password`, { token, password }));
    } catch (error: unknown) {
      if (this.isApiError(error, 400, 'INVALID_PASSWORD_RESET_TOKEN')) {
        throw new PasswordResetTokenError();
      }
      throw error;
    }
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) return;
    await firstValueFrom(this.http.post(`${this.authUrl}/logout`, { refreshToken }));
  }

  private isApiError(error: unknown, status: number, code?: string): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== status) return false;
    if (!code) return true;
    return (error.error as ApiErrorResponse | null)?.error?.code === code;
  }
}
