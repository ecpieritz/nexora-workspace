import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  AuthApiService,
  AuthConflictError,
  AuthenticationError,
  PasswordResetTokenError,
} from './auth-api.service';
import { AuthenticatedAccount, RegisteredAccount } from './auth.models';

describe('AuthApiService', () => {
  let api: AuthApiService;
  let httpTesting: HttpTestingController;

  const account: RegisteredAccount = {
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
  };

  const authenticatedAccount: AuthenticatedAccount = {
    ...account,
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token-with-enough-entropy-for-testing',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshExpiresAt: '2026-01-08T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should register an account through the API', async () => {
    const registration = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      username: 'janedoe',
      password: 'Nexora123',
    };
    const result = api.register(registration);

    const request = httpTesting.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(registration);
    request.flush({ data: account });

    await expectAsync(result).toBeResolvedTo(account);
  });

  it('should translate registration conflicts', async () => {
    const result = api.register({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      username: 'janedoe',
      password: 'Nexora123',
    });

    httpTesting
      .expectOne('/api/auth/register')
      .flush(
        { error: { code: 'RESOURCE_CONFLICT', message: 'Account already exists.' } },
        { status: 409, statusText: 'Conflict' },
      );

    await expectAsync(result).toBeRejectedWith(jasmine.any(AuthConflictError));
  });

  it('should authenticate and return server-issued tokens', async () => {
    const result = api.login({ email: 'jane@example.com', password: 'Nexora123' });
    httpTesting.expectOne('/api/auth/login').flush({ data: authenticatedAccount });

    await expectAsync(result).toBeResolvedTo(authenticatedAccount);
  });

  it('should translate invalid credentials without exposing account details', async () => {
    const result = api.login({ email: 'jane@example.com', password: 'wrong-password' });
    httpTesting
      .expectOne('/api/auth/login')
      .flush(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    await expectAsync(result).toBeRejectedWith(jasmine.any(AuthenticationError));
  });

  it('should request and complete password recovery through the API', async () => {
    const recovery = api.requestPasswordReset('jane@example.com');
    httpTesting.expectOne('/api/auth/forgot-password').flush({ data: { message: 'Accepted.' } });
    await expectAsync(recovery).toBeResolved();

    const reset = api.resetPassword('a'.repeat(64), 'UpdatedPassword1');
    httpTesting.expectOne('/api/auth/reset-password').flush(
      {
        error: {
          code: 'INVALID_PASSWORD_RESET_TOKEN',
          message: 'Password reset token is invalid or expired.',
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await expectAsync(reset).toBeRejectedWith(jasmine.any(PasswordResetTokenError));
  });
});
