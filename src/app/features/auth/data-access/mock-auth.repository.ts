import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';

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

  async register(input: RegistrationInput): Promise<RegisteredUser> {
    await this.simulateLatency();

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
      id: this.crypto.randomUUID(),
      fullName: input.fullName.trim(),
      email,
      username,
      passwordHash: await this.hashPassword(input.password, passwordSalt),
      passwordSalt,
      createdAt: new Date().toISOString(),
    };

    this.storage.setItem(USERS_STORAGE_KEY, JSON.stringify([...users, storedUser]));

    return this.toRegisteredUser(storedUser);
  }

  async authenticate(credentials: LoginCredentials): Promise<RegisteredUser> {
    await this.simulateLatency();

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
  }

  async requestPasswordReset(emailInput: string): Promise<string | null> {
    await this.simulateLatency();

    const email = emailInput.trim().toLowerCase();
    const user = this.readUsers().find((candidate) => candidate.email === email);

    if (!user) {
      return null;
    }

    const resetToken: PasswordResetToken = {
      token: this.crypto.randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION).toISOString(),
    };
    const activeTokens = this.readResetTokens().filter((token) => token.userId !== user.id);
    this.storage.setItem(RESET_TOKENS_STORAGE_KEY, JSON.stringify([...activeTokens, resetToken]));

    return resetToken.token;
  }

  async resetPassword(tokenValue: string, password: string): Promise<void> {
    await this.simulateLatency();

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

    this.storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    this.removeResetToken(tokenValue, tokens);
  }

  private get storage(): Storage {
    const storage = this.document.defaultView?.localStorage;

    if (!storage) {
      throw new Error('Browser storage is not available.');
    }

    return storage;
  }

  private get crypto(): Crypto {
    const crypto = this.document.defaultView?.crypto;

    if (!crypto) {
      throw new Error('Web Crypto is not available.');
    }

    return crypto;
  }

  private readUsers(): StoredUser[] {
    const storedValue = this.storage.getItem(USERS_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    try {
      const users: unknown = JSON.parse(storedValue);
      return Array.isArray(users) ? (users as StoredUser[]) : [];
    } catch {
      return [];
    }
  }

  private readResetTokens(): PasswordResetToken[] {
    const storedValue = this.storage.getItem(RESET_TOKENS_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    try {
      const tokens: unknown = JSON.parse(storedValue);
      return Array.isArray(tokens) ? (tokens as PasswordResetToken[]) : [];
    } catch {
      return [];
    }
  }

  private removeResetToken(tokenValue: string, tokens: PasswordResetToken[]): void {
    const remainingTokens = tokens.filter((token) => token.token !== tokenValue);
    this.storage.setItem(RESET_TOKENS_STORAGE_KEY, JSON.stringify(remainingTokens));
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

  private async simulateLatency(): Promise<void> {
    if (!environment.mockApi.enabled) {
      return;
    }

    const delay: number = environment.mockApi.delay;

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
