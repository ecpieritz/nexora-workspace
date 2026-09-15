import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compare } from 'bcryptjs';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { ApiError } from '../src/errors/api-error.js';
import {
  AuthPasswordRecoveryService,
  type CreatePasswordResetTokenInput,
  type ForgotPasswordInput,
  type PasswordRecoveryRepository,
  type PasswordRecoveryService,
  type PasswordResetAccount,
  type PasswordResetNotification,
  type PasswordResetNotifier,
  type ResetPasswordInput,
} from '../src/features/auth/index.js';
import { testAppOptions } from './test-app-options.js';

class FakePasswordRecoveryRepository implements PasswordRecoveryRepository {
  account: PasswordResetAccount | null = null;
  createdToken: CreatePasswordResetTokenInput | undefined;
  consumed = true;
  consumedTokenHash: string | undefined;
  replacementPasswordHash: string | undefined;

  findPasswordResetAccount(): Promise<PasswordResetAccount | null> {
    return Promise.resolve(this.account);
  }

  createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<void> {
    this.createdToken = input;
    return Promise.resolve();
  }

  consumePasswordResetToken(tokenHash: string, passwordHash: string): Promise<boolean> {
    this.consumedTokenHash = tokenHash;
    this.replacementPasswordHash = passwordHash;
    return Promise.resolve(this.consumed);
  }
}

class FakePasswordResetNotifier implements PasswordResetNotifier {
  notification: PasswordResetNotification | undefined;

  send(notification: PasswordResetNotification): Promise<void> {
    this.notification = notification;
    return Promise.resolve();
  }
}

class FakePasswordRecoveryService implements PasswordRecoveryService {
  requested: ForgotPasswordInput | undefined;
  reset: ResetPasswordInput | undefined;

  requestReset(input: ForgotPasswordInput): Promise<void> {
    this.requested = input;
    return Promise.resolve();
  }

  resetPassword(input: ResetPasswordInput): Promise<void> {
    this.reset = input;
    return Promise.resolve();
  }
}

function createService(
  repository: PasswordRecoveryRepository,
  notifier: PasswordResetNotifier,
): AuthPasswordRecoveryService {
  return new AuthPasswordRecoveryService(repository, notifier, {
    passwordHashRounds: 4,
    resetTokenTtlMinutes: 30,
  });
}

void describe('password recovery and reset', () => {
  void it('creates a hashed expiring token and delivers only its opaque value', async () => {
    const repository = new FakePasswordRecoveryRepository();
    const notifier = new FakePasswordResetNotifier();
    repository.account = { id: '20000000-0000-4000-8000-000000000001', email: 'demo@nexora.app' };

    await createService(repository, notifier).requestReset({ email: 'demo@nexora.app' });

    assert.equal(repository.createdToken?.userId, repository.account.id);
    assert.equal(repository.createdToken?.tokenHash.length, 64);
    assert.equal(notifier.notification?.resetToken.length, 64);
    assert.notEqual(repository.createdToken?.tokenHash, notifier.notification?.resetToken);
    assert.equal(
      repository.createdToken?.expiresAt.toISOString(),
      notifier.notification?.expiresAt,
    );
  });

  void it('silently accepts recovery requests for unknown emails', async () => {
    const repository = new FakePasswordRecoveryRepository();
    const notifier = new FakePasswordResetNotifier();

    await createService(repository, notifier).requestReset({ email: 'missing@nexora.app' });

    assert.equal(repository.createdToken, undefined);
    assert.equal(notifier.notification, undefined);
  });

  void it('hashes the new password before consuming the one-time token', async () => {
    const repository = new FakePasswordRecoveryRepository();
    const password = 'UpdatedPassword123';

    await createService(repository, new FakePasswordResetNotifier()).resetPassword({
      token: 'a'.repeat(64),
      password,
    });

    assert.equal(repository.consumedTokenHash?.length, 64);
    assert.notEqual(repository.replacementPasswordHash, password);
    assert.equal(await compare(password, repository.replacementPasswordHash ?? ''), true);
  });

  void it('rejects an invalid, expired or previously consumed token', async () => {
    const repository = new FakePasswordRecoveryRepository();
    repository.consumed = false;

    await assert.rejects(
      createService(repository, new FakePasswordResetNotifier()).resetPassword({
        token: 'a'.repeat(64),
        password: 'UpdatedPassword123',
      }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.statusCode === 400 &&
        error.code === 'INVALID_PASSWORD_RESET_TOKEN',
    );
  });

  void it('exposes validated recovery endpoints with a neutral accepted response', async () => {
    const service = new FakePasswordRecoveryService();
    const app = createApp({ ...testAppOptions, passwordRecoveryService: service });

    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: '  DEMO@NEXORA.APP  ' });
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'UpdatedPassword123' });
    const invalid = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'short', password: 'weak' });

    assert.equal(forgot.status, 202);
    assert.deepEqual(service.requested, { email: 'demo@nexora.app' });
    assert.equal(reset.status, 204);
    assert.deepEqual(service.reset, {
      token: 'a'.repeat(64),
      password: 'UpdatedPassword123',
    });
    assert.equal(invalid.status, 422);
  });
});
