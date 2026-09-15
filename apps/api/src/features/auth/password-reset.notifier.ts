import type {
  PasswordResetNotification,
  PasswordResetNotifier,
} from './password-recovery.service.js';

interface PasswordResetLogger {
  info(message: string, context: unknown): void;
}

export class ConsolePasswordResetNotifier implements PasswordResetNotifier {
  constructor(
    private readonly resetUrl: string,
    private readonly logger: PasswordResetLogger = console,
  ) {}

  send(notification: PasswordResetNotification): Promise<void> {
    const url = new URL(this.resetUrl);
    url.searchParams.set('token', notification.resetToken);
    this.logger.info('Development password reset link generated.', {
      email: notification.email,
      expiresAt: notification.expiresAt,
      url: url.toString(),
    });
    return Promise.resolve();
  }
}

export class DisabledPasswordResetNotifier implements PasswordResetNotifier {
  send(): Promise<void> {
    return Promise.resolve();
  }
}
