import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hash } from 'bcryptjs';
import express from 'express';
import request from 'supertest';

import { ApiError } from '../src/errors/api-error.js';
import {
  AuthSessionService,
  JwtTokenService,
  type AuthenticationContextRepository,
  type AuthSessionRepository,
  type CreateSessionInput,
  type LoginAccount,
  type RegisteredAccount,
  type ReplacementSessionInput,
} from '../src/features/auth/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import {
  createAuthenticationMiddleware,
  getAuthPrincipal,
} from '../src/middleware/authentication.middleware.js';
import { createErrorHandler } from '../src/middleware/error-handler.middleware.js';

const account: RegisteredAccount = {
  user: {
    id: '20000000-0000-4000-8000-000000000001',
    email: 'demo@nexora.app',
    username: 'emilyn',
    fullName: 'Emilyn Pieritz',
    displayName: 'Emilyn',
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  workspace: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Nexora Demo Workspace',
    slug: 'nexora-demo',
    role: WorkspaceRole.OWNER,
  },
};

class FakeSessionRepository implements AuthSessionRepository {
  loginAccount: LoginAccount | null = null;
  rotatedAccount: RegisteredAccount | null = null;
  createdSession: CreateSessionInput | undefined;
  replacementSession: ReplacementSessionInput | undefined;
  rotatedTokenHash: string | undefined;
  revokedTokenHash: string | undefined;

  findLoginAccount(): Promise<LoginAccount | null> {
    return Promise.resolve(this.loginAccount);
  }

  createSession(input: CreateSessionInput): Promise<void> {
    this.createdSession = input;
    return Promise.resolve();
  }

  rotateSession(
    currentTokenHash: string,
    replacement: ReplacementSessionInput,
  ): Promise<RegisteredAccount | null> {
    this.rotatedTokenHash = currentTokenHash;
    this.replacementSession = replacement;
    return Promise.resolve(this.rotatedAccount);
  }

  revokeSession(tokenHash: string): Promise<void> {
    this.revokedTokenHash = tokenHash;
    return Promise.resolve();
  }
}

const jwt = new JwtTokenService({
  secret: 'nexora-test-access-secret-at-least-32-bytes',
  issuer: 'nexora-api-test',
  audience: 'nexora-web-test',
  ttlSeconds: 900,
});
const activeAuthenticationContexts: AuthenticationContextRepository = {
  findActivePrincipal: (principal) => Promise.resolve(principal),
};

function createService(repository: AuthSessionRepository): AuthSessionService {
  return new AuthSessionService(repository, jwt, {
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 7,
  });
}

void describe('JWT authentication and refresh sessions', () => {
  void it('authenticates credentials and persists only a hash of the refresh token', async () => {
    const repository = new FakeSessionRepository();
    repository.loginAccount = {
      account,
      passwordHash: await hash('Nexora123!', 4),
    };

    const session = await createService(repository).login(
      { email: account.user.email, password: 'Nexora123!' },
      { ipAddress: '127.0.0.1', userAgent: 'Nexora test' },
    );
    const principal = await jwt.verify(session.tokens.accessToken);

    assert.equal(session.tokens.tokenType, 'Bearer');
    assert.equal(session.tokens.expiresIn, 900);
    assert.ok(session.tokens.refreshToken.length >= 64);
    assert.notEqual(repository.createdSession?.tokenHash, session.tokens.refreshToken);
    assert.equal(repository.createdSession?.tokenHash.length, 64);
    assert.deepEqual(principal, {
      userId: account.user.id,
      sessionId: repository.createdSession?.id,
      workspaceId: account.workspace.id,
      role: WorkspaceRole.OWNER,
    });
  });

  void it('returns the same safe error for an unknown account or invalid password', async () => {
    const repository = new FakeSessionRepository();
    const service = createService(repository);

    await assert.rejects(
      service.login({ email: 'missing@nexora.app', password: 'WrongPassword1' }, {}),
      (error: unknown) =>
        error instanceof ApiError &&
        error.statusCode === 401 &&
        error.code === 'INVALID_CREDENTIALS',
    );
    assert.equal(repository.createdSession, undefined);
  });

  void it('rotates refresh tokens and signs a new access token', async () => {
    const repository = new FakeSessionRepository();
    repository.rotatedAccount = account;
    const service = createService(repository);

    const session = await service.refresh(
      { refreshToken: 'existing-refresh-token-with-enough-entropy-for-testing' },
      { userAgent: 'Nexora test' },
    );
    const principal = await jwt.verify(session.tokens.accessToken);

    assert.ok(repository.rotatedTokenHash);
    assert.equal(repository.rotatedTokenHash.length, 64);
    assert.notEqual(repository.replacementSession?.tokenHash, session.tokens.refreshToken);
    assert.equal(principal.sessionId, repository.replacementSession?.id);
  });

  void it('revokes the refresh session during logout', async () => {
    const repository = new FakeSessionRepository();
    const service = createService(repository);

    await service.logout({ refreshToken: 'refresh-token-that-will-be-revoked-securely' });

    assert.ok(repository.revokedTokenHash);
    assert.equal(repository.revokedTokenHash.length, 64);
  });

  void it('accepts valid Bearer tokens and rejects invalid ones', async () => {
    const app = express();
    app.get(
      '/protected',
      createAuthenticationMiddleware(jwt, activeAuthenticationContexts),
      (request, response) => {
        response.status(200).json(getAuthPrincipal(request));
      },
    );
    app.use(createErrorHandler());
    const accessToken = await jwt.sign({
      userId: account.user.id,
      sessionId: '30000000-0000-4000-8000-000000000001',
      workspaceId: account.workspace.id,
      role: WorkspaceRole.OWNER,
    });

    const validResponse = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);
    const invalidResponse = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    assert.equal(validResponse.status, 200);
    assert.equal(invalidResponse.status, 401);
    assert.equal(
      (invalidResponse.body as { error: { code: string } }).error.code,
      'INVALID_ACCESS_TOKEN',
    );
  });
});
