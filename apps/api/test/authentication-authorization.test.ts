import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import express from 'express';
import request from 'supertest';

import {
  JwtTokenService,
  type AuthenticationContextRepository,
  type AuthPrincipal,
} from '../src/features/auth/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { createAuthenticationMiddleware } from '../src/middleware/authentication.middleware.js';
import {
  requireCurrentWorkspace,
  requireWorkspaceRoles,
} from '../src/middleware/authorization.middleware.js';
import { createErrorHandler } from '../src/middleware/error-handler.middleware.js';

const tokenPrincipal: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.MEMBER,
};

const jwt = new JwtTokenService({
  secret: 'nexora-test-access-secret-at-least-32-bytes',
  issuer: 'nexora-api-test',
  audience: 'nexora-web-test',
  ttlSeconds: 900,
});

class FakeAuthenticationContexts implements AuthenticationContextRepository {
  activePrincipal: AuthPrincipal | null = tokenPrincipal;
  receivedPrincipal: AuthPrincipal | undefined;
  checkedAt: Date | undefined;

  findActivePrincipal(principal: AuthPrincipal, now: Date): Promise<AuthPrincipal | null> {
    this.receivedPrincipal = principal;
    this.checkedAt = now;
    return Promise.resolve(this.activePrincipal);
  }
}

function createProtectedApp(contexts: AuthenticationContextRepository) {
  const app = express();
  app.use(createAuthenticationMiddleware(jwt, contexts));
  app.get(
    '/admin',
    requireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN),
    (_request, response) => response.sendStatus(204),
  );
  app.get('/workspaces/:workspaceId', requireCurrentWorkspace(), (_request, response) =>
    response.sendStatus(204),
  );
  app.use(createErrorHandler());
  return app;
}

async function authorizationHeader(): Promise<string> {
  return `Bearer ${await jwt.sign(tokenPrincipal)}`;
}

void describe('authentication and authorization middleware', () => {
  void it('rejects a cryptographically valid token when its session is inactive', async () => {
    const contexts = new FakeAuthenticationContexts();
    contexts.activePrincipal = null;

    const response = await request(createProtectedApp(contexts))
      .get('/admin')
      .set('Authorization', await authorizationHeader());

    assert.equal(response.status, 401);
    assert.equal((response.body as { error: { code: string } }).error.code, 'SESSION_INACTIVE');
    assert.deepEqual(contexts.receivedPrincipal, tokenPrincipal);
    assert.ok(contexts.checkedAt instanceof Date);
  });

  void it('authorizes with the current database role instead of a stale JWT role', async () => {
    const contexts = new FakeAuthenticationContexts();
    contexts.activePrincipal = { ...tokenPrincipal, role: WorkspaceRole.ADMIN };

    const response = await request(createProtectedApp(contexts))
      .get('/admin')
      .set('Authorization', await authorizationHeader());

    assert.equal(response.status, 204);
  });

  void it('rejects authenticated users whose current role is not allowed', async () => {
    const contexts = new FakeAuthenticationContexts();

    const response = await request(createProtectedApp(contexts))
      .get('/admin')
      .set('Authorization', await authorizationHeader());

    assert.equal(response.status, 403);
    assert.equal((response.body as { error: { code: string } }).error.code, 'FORBIDDEN');
  });

  void it('allows only the workspace carried by the authenticated principal', async () => {
    const app = createProtectedApp(new FakeAuthenticationContexts());
    const authorization = await authorizationHeader();

    const allowed = await request(app)
      .get(`/workspaces/${tokenPrincipal.workspaceId}`)
      .set('Authorization', authorization);
    const denied = await request(app)
      .get('/workspaces/90000000-0000-4000-8000-000000000001')
      .set('Authorization', authorization);

    assert.equal(allowed.status, 204);
    assert.equal(denied.status, 403);
  });
});
