import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { MockApiService, MockStorageService } from '@core/mock-api';

const USERS_STORAGE_KEY = 'nexora:mock-users';
const RESET_TOKENS_STORAGE_KEY = 'nexora:password-reset-tokens';
const RESET_TOKEN_DURATION = 15 * 60 * 1000;

export interface RegistrationInput {
  fullName: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  username: string;
  createdAt: string;
}

interface StoredUser extends RegisteredUser {
  passwordHash: string;
  passwordSalt: string;
}

interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: string;
}

export class AuthConflictError extends Error {
  constructor(readonly field: 'email' | 'username') {
    super(`An account with this ${field} already exists.`);
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
export class MockAuthRepository {
  private readonly document = inject(DOCUMENT);
  private readonly mockApi = inject(MockApiService);
  private readonly mockStorage = inject(MockStorageService);

  async register(input: RegistrationInput): Promise<RegisteredUser> {
    return this.mockApi.execute(async () => {
      const users = this.readUsers();
      const email = input.email.trim().toLowerCase();
      const username = input.username.trim().toLowerCase();

      if (users.some((user) => user.email === email)) {
        throw new AuthConflictError('email');
      }

      if (users.some((user) => user.username === username)) {
        throw new AuthConflictError('username');
      }

      const passwordSalt = this.createSalt();
      const storedUser: StoredUser = {
        id: this.mockApi.createId(),
        fullName: input.fullName.trim(),
        email,
        username,
        passwordHash: await this.hashPassword(input.password, passwordSalt),
        passwordSalt,
        createdAt: new Date().toISOString(),
      };

      this.mockStorage.write(USERS_STORAGE_KEY, [...users, storedUser]);
      return this.toRegisteredUser(storedUser);
    });
  }

  async authenticate(credentials: LoginCredentials): Promise<RegisteredUser> {
    return this.mockApi.execute(async () => {
      const email = credentials.email.trim().toLowerCase();
      const user = this.readUsers().find((candidate) => candidate.email === email);

      if (!user) {
        throw new AuthenticationError();
      }

      const passwordHash = await this.hashPassword(credentials.password, user.passwordSalt);

      if (passwordHash !== user.passwordHash) {
        throw new AuthenticationError();
      }

      return this.toRegisteredUser(user);
    });
  }

  async requestPasswordReset(emailInput: string): Promise<string | null> {
    return this.mockApi.execute(() => {
      const email = emailInput.trim().toLowerCase();
      const user = this.readUsers().find((candidate) => candidate.email === email);

      if (!user) {
        return null;
      }

      const resetToken: PasswordResetToken = {
        token: this.mockApi.createId(),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION).toISOString(),
      };
      const activeTokens = this.readResetTokens().filter((token) => token.userId !== user.id);
      this.mockStorage.write(RESET_TOKENS_STORAGE_KEY, [...activeTokens, resetToken]);

      return resetToken.token;
    });
  }

  async resetPassword(tokenValue: string, password: string): Promise<void> {
    return this.mockApi.execute(async () => {
      const tokens = this.readResetTokens();
      const resetToken = tokens.find((candidate) => candidate.token === tokenValue);

      if (!resetToken || new Date(resetToken.expiresAt).getTime() <= Date.now()) {
        this.removeResetToken(tokenValue, tokens);
        throw new PasswordResetTokenError();
      }

      const users = this.readUsers();
      const userIndex = users.findIndex((user) => user.id === resetToken.userId);

      if (userIndex < 0) {
        this.removeResetToken(tokenValue, tokens);
        throw new PasswordResetTokenError();
      }

      const passwordSalt = this.createSalt();
      users[userIndex] = {
        ...users[userIndex],
        passwordHash: await this.hashPassword(password, passwordSalt),
        passwordSalt,
      };

      this.mockStorage.write(USERS_STORAGE_KEY, users);
      this.removeResetToken(tokenValue, tokens);
    });
  }

  private get crypto(): Crypto {
    const crypto = this.document.defaultView?.crypto;

    if (!crypto) {
      throw new Error('Web Crypto is not available.');
    }

    return crypto;
  }

  private readUsers(): StoredUser[] {
    const users = this.mockStorage.read<unknown>(USERS_STORAGE_KEY, []);
    return Array.isArray(users) ? (users as StoredUser[]) : [];
  }

  private readResetTokens(): PasswordResetToken[] {
    const tokens = this.mockStorage.read<unknown>(RESET_TOKENS_STORAGE_KEY, []);
    return Array.isArray(tokens) ? (tokens as PasswordResetToken[]) : [];
  }

  private removeResetToken(tokenValue: string, tokens: PasswordResetToken[]): void {
    const remainingTokens = tokens.filter((token) => token.token !== tokenValue);
    this.mockStorage.write(RESET_TOKENS_STORAGE_KEY, remainingTokens);
  }

  private createSalt(): string {
    const salt = this.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(salt, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const content = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await this.crypto.subtle.digest('SHA-256', content);

    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  private toRegisteredUser(user: StoredUser): RegisteredUser {
    const { id, fullName, email, username, createdAt } = user;
    return { id, fullName, email, username, createdAt };
  }
}
