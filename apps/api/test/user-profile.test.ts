import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { ApiError } from '../src/errors/api-error.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  ProfileService,
  type UpdateProfileInput,
  type UserProfile,
  type UserProfileChanges,
  type UserProfileRepository,
  type UserProfileService,
} from '../src/features/profile/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const principal: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const profile: UserProfile = {
  id: principal.userId,
  email: 'demo@nexora.app',
  username: 'emilyn',
  fullName: 'Emilyn Pieritz',
  displayName: 'Emilyn',
  phone: null,
  birthDate: null,
  bio: null,
  taxId: null,
  avatarUrl: null,
  preferences: {
    language: 'en',
    timezone: 'America/Fortaleza',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    compactSidebar: false,
    notifications: { tasks: true, invoices: true, events: true, customers: true },
  },
  workspace: {
    id: principal.workspaceId,
    name: 'Nexora Demo Workspace',
    slug: 'nexora-demo',
    role: WorkspaceRole.OWNER,
  },
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

class FakeProfileService implements UserProfileService {
  lastPrincipal: AuthPrincipal | undefined;
  lastUpdate: UpdateProfileInput | undefined;

  get(receivedPrincipal: AuthPrincipal): Promise<UserProfile> {
    this.lastPrincipal = receivedPrincipal;
    return Promise.resolve(profile);
  }

  update(receivedPrincipal: AuthPrincipal, input: UpdateProfileInput): Promise<UserProfile> {
    this.lastPrincipal = receivedPrincipal;
    this.lastUpdate = input;
    return Promise.resolve({ ...profile, fullName: input.fullName ?? profile.fullName });
  }
}

class FakeProfileRepository implements UserProfileRepository {
  current: UserProfile | null = profile;
  lastExpectedTaxId: string | null | undefined;
  lastChanges: UserProfileChanges | undefined;

  findById(): Promise<UserProfile | null> {
    return Promise.resolve(this.current);
  }

  update(
    _userId: string,
    _workspaceId: string,
    expectedTaxId: string | null,
    changes: UserProfileChanges,
  ): Promise<UserProfile | null> {
    this.lastExpectedTaxId = expectedTaxId;
    this.lastChanges = changes;
    return Promise.resolve(this.current);
  }
}

const jwt = new JwtTokenService({
  secret: testAppOptions.jwtAccessSecret,
  issuer: testAppOptions.jwtIssuer,
  audience: testAppOptions.jwtAudience,
  ttlSeconds: testAppOptions.jwtAccessTtlSeconds,
});

async function authorizationHeader(): Promise<string> {
  return `Bearer ${await jwt.sign(principal)}`;
}

void describe('authenticated user profile endpoints', () => {
  void it('requires a valid access token and returns the current public profile', async () => {
    const service = new FakeProfileService();
    const app = createApp({ ...testAppOptions, userProfileService: service });

    const unauthorized = await request(app).get('/api/users/me');
    const authorized = await request(app)
      .get('/api/users/me')
      .set('Authorization', await authorizationHeader());

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
    assert.deepEqual(authorized.body, { data: profile });
    assert.deepEqual(service.lastPrincipal, principal);
    assert.equal(JSON.stringify(authorized.body).includes('passwordHash'), false);
  });

  void it('validates and normalizes allowlisted profile changes', async () => {
    const service = new FakeProfileService();
    const app = createApp({ ...testAppOptions, userProfileService: service });
    const authorization = await authorizationHeader();

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authorization)
      .send({ fullName: '  Emilia Pieritz  ', taxId: '123.456.789-01', currency: 'brl' });
    const forbiddenFields = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authorization)
      .send({ email: 'changed@nexora.app', role: 'ADMIN' });

    assert.equal(response.status, 200);
    assert.deepEqual(service.lastUpdate, {
      fullName: 'Emilia Pieritz',
      taxId: '12345678901',
      currency: 'BRL',
    });
    assert.equal(forbiddenFields.status, 422);
  });

  void it('allows CPF/CNPJ to be assigned when empty', async () => {
    const repository = new FakeProfileRepository();
    await new ProfileService(repository).update(principal, { taxId: '12345678901' });

    assert.equal(repository.lastExpectedTaxId, null);
    assert.deepEqual(repository.lastChanges, { taxId: '12345678901' });
  });

  void it('rejects attempts to change an existing CPF/CNPJ', async () => {
    const repository = new FakeProfileRepository();
    repository.current = { ...profile, taxId: '12345678901' };

    await assert.rejects(
      new ProfileService(repository).update(principal, { taxId: '98765432100' }),
      (error: unknown) =>
        error instanceof ApiError && error.statusCode === 409 && error.code === 'TAX_ID_IMMUTABLE',
    );
    assert.equal(repository.lastChanges, undefined);
  });
});
