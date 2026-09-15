import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compare } from 'bcryptjs';
import request from 'supertest';

import { createApp } from '../src/app.js';
import {
  AuthService,
  type AuthRegistrationRepository,
  type AuthRegistrationService,
  type RegisterInput,
  type RegisteredAccount,
} from '../src/features/auth/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const registeredAccount: RegisteredAccount = {
  user: {
    id: '20000000-0000-4000-8000-000000000010',
    email: 'jane@example.com',
    username: 'jane.doe',
    fullName: 'Jane Doe',
    displayName: 'Jane',
    createdAt: '2026-09-14T12:00:00.000Z',
  },
  workspace: {
    id: '10000000-0000-4000-8000-000000000010',
    name: "Jane's Workspace",
    slug: 'jane-doe-10000000',
    role: WorkspaceRole.OWNER,
  },
};

class FakeRegistrationService implements AuthRegistrationService {
  receivedInput: RegisterInput | undefined;

  register(input: RegisterInput): Promise<RegisteredAccount> {
    this.receivedInput = input;
    return Promise.resolve(registeredAccount);
  }
}

interface RegistrationResponseBody {
  data: RegisteredAccount;
}

interface ErrorResponseBody {
  error: {
    code: string;
    details?: {
      issues?: { path: string }[];
    };
  };
}

void describe('user registration', () => {
  void it('validates, normalizes and registers a new user', async () => {
    const authService = new FakeRegistrationService();
    const app = createApp({
      ...testAppOptions,
      authRegistrationService: authService,
    });

    const response = await request(app).post('/api/auth/register').send({
      fullName: '  Jane Doe  ',
      email: '  JANE@EXAMPLE.COM  ',
      username: '  Jane.Doe  ',
      password: 'Nexora123!',
    });
    const body = response.body as unknown as RegistrationResponseBody;

    assert.equal(response.status, 201);
    assert.deepEqual(authService.receivedInput, {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      username: 'jane.doe',
      password: 'Nexora123!',
    });
    assert.deepEqual(body.data, registeredAccount);
    assert.doesNotMatch(JSON.stringify(body), /password|Nexora123/i);
  });

  void it('rejects weak credentials before calling the service', async () => {
    const authService = new FakeRegistrationService();
    const app = createApp({
      ...testAppOptions,
      authRegistrationService: authService,
    });

    const response = await request(app).post('/api/auth/register').send({
      fullName: 'Jane Doe',
      email: 'invalid',
      username: 'invalid username',
      password: 'weak',
    });
    const body = response.body as unknown as ErrorResponseBody;
    const paths = body.error.details?.issues?.map((issue) => issue.path) ?? [];

    assert.equal(response.status, 422);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(paths.includes('body.email'));
    assert.ok(paths.includes('body.username'));
    assert.ok(paths.includes('body.password'));
    assert.equal(authService.receivedInput, undefined);
  });

  void it('hashes the password before passing account data to persistence', async () => {
    let persistedPasswordHash: string | undefined;
    const repository: AuthRegistrationRepository = {
      createAccount: (input) => {
        persistedPasswordHash = input.passwordHash;
        assert.equal('password' in input, false);
        return Promise.resolve(registeredAccount);
      },
    };
    const service = new AuthService(repository, 4);

    await service.register({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      username: 'jane.doe',
      password: 'Nexora123!',
    });

    assert.ok(persistedPasswordHash);
    assert.notEqual(persistedPasswordHash, 'Nexora123!');
    assert.equal(await compare('Nexora123!', persistedPasswordHash), true);
  });
});
