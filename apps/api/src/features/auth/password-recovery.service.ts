import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';

import { ApiError } from '../../errors/api-error.js';
import type { ForgotPasswordInput, ResetPasswordInput } from './auth.schemas.js';
import { createPasswordResetToken, hashPasswordResetToken } from './password-reset-token.js';
import type { PasswordRecoveryRepository } from './auth.types.js';

export interface PasswordResetNotification {
  email: string;
  expiresAt: string;
  resetToken: string;
}

export interface PasswordResetNotifier {
  send(notification: PasswordResetNotification): Promise<void>;
}

export interface PasswordRecoveryService {
  requestReset(input: ForgotPasswordInput): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
}

export interface PasswordRecoveryServiceOptions {
  passwordHashRounds: number;
  resetTokenTtlMinutes: number;
}

export class AuthPasswordRecoveryService implements PasswordRecoveryService {
  constructor(
    private readonly repository: PasswordRecoveryRepository,
    private readonly notifier: PasswordResetNotifier,
    private readonly options: PasswordRecoveryServiceOptions,
  ) {}

  async requestReset(input: ForgotPasswordInput): Promise<void> {
    const account = await this.repository.findPasswordResetAccount(input.email);
    if (!account) return;

    const resetToken = createPasswordResetToken();
    const expiresAt = new Date(Date.now() + this.options.resetTokenTtlMinutes * 60_000);
    await this.repository.createPasswordResetToken({
      id: randomUUID(),
      userId: account.id,
      tokenHash: hashPasswordResetToken(resetToken),
      expiresAt,
    });
    await this.notifier.send({
      email: account.email,
      resetToken,
      expiresAt: expiresAt.toISOString(),
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const passwordHash = await hash(input.password, this.options.passwordHashRounds);
    const consumed = await this.repository.consumePasswordResetToken(
      hashPasswordResetToken(input.token),
      passwordHash,
      new Date(),
    );

    if (!consumed) {
      throw new ApiError(
        400,
        'INVALID_PASSWORD_RESET_TOKEN',
        'Password reset token is invalid or expired.',
      );
    }
  }
}
