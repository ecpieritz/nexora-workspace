import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthenticatedAccount, AuthWorkspace, RegisteredUser } from './auth.models';

const LOCAL_SESSION_KEY = 'nexora:persistent-session';
const TAB_SESSION_KEY = 'nexora:tab-session';

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: RegisteredUser;
  workspace: AuthWorkspace;
  persistent: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly document = inject(DOCUMENT);
  private readonly session = signal<AuthSession | null>(this.restore());

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly currentWorkspace = computed(() => this.session()?.workspace ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.session()?.refreshToken ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  start(account: AuthenticatedAccount, persistent: boolean): void {
    const session: AuthSession = {
      accessToken: account.tokens.accessToken,
      accessTokenExpiresAt: new Date(Date.now() + account.tokens.expiresIn * 1000).toISOString(),
      refreshToken: account.tokens.refreshToken,
      refreshExpiresAt: account.tokens.refreshExpiresAt,
      user: account.user,
      workspace: account.workspace,
      persistent,
    };

    this.persist(session);
  }

  refresh(account: AuthenticatedAccount): void {
    const current = this.session();
    if (!current) return;

    this.persist({
      ...current,
      accessToken: account.tokens.accessToken,
      accessTokenExpiresAt: new Date(Date.now() + account.tokens.expiresIn * 1000).toISOString(),
      refreshToken: account.tokens.refreshToken,
      refreshExpiresAt: account.tokens.refreshExpiresAt,
      user: account.user,
      workspace: account.workspace,
    });
  }

  clear(): void {
    this.clearStoredSessions();
    this.session.set(null);
  }

  updateCurrentUser(changes: Partial<Pick<RegisteredUser, 'fullName' | 'username'>>): void {
    const current = this.session();
    if (!current) return;
    this.persist({ ...current, user: { ...current.user, ...changes } });
  }

  private restore(): AuthSession | null {
    const session = this.readSession(this.sessionStorage, TAB_SESSION_KEY);
    const persistentSession = this.readSession(this.localStorage, LOCAL_SESSION_KEY);
    const restoredSession = session ?? persistentSession;

    if (!restoredSession) {
      return null;
    }

    if (new Date(restoredSession.refreshExpiresAt).getTime() <= Date.now()) {
      this.clearStoredSessions();
      return null;
    }

    return restoredSession;
  }

  private readSession(storage: Storage, key: string): AuthSession | null {
    const storedValue = storage.getItem(key);

    if (!storedValue) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);
      if (this.isAuthSession(parsed)) return parsed;
      storage.removeItem(key);
      return null;
    } catch {
      storage.removeItem(key);
      return null;
    }
  }

  private isAuthSession(value: unknown): value is AuthSession {
    if (!value || typeof value !== 'object') return false;

    const candidate = value as Partial<AuthSession>;
    return (
      typeof candidate.accessToken === 'string' &&
      typeof candidate.accessTokenExpiresAt === 'string' &&
      typeof candidate.refreshToken === 'string' &&
      typeof candidate.refreshExpiresAt === 'string' &&
      typeof candidate.persistent === 'boolean' &&
      !!candidate.user &&
      typeof candidate.user.id === 'string' &&
      !!candidate.workspace &&
      typeof candidate.workspace.id === 'string'
    );
  }

  private clearStoredSessions(): void {
    this.localStorage.removeItem(LOCAL_SESSION_KEY);
    this.sessionStorage.removeItem(TAB_SESSION_KEY);
  }

  private persist(session: AuthSession): void {
    this.clearStoredSessions();
    this.getStorage(session.persistent).setItem(
      this.getStorageKey(session.persistent),
      JSON.stringify(session),
    );
    this.session.set(session);
  }

  private getStorage(persistent: boolean): Storage {
    return persistent ? this.localStorage : this.sessionStorage;
  }

  private getStorageKey(persistent: boolean): string {
    return persistent ? LOCAL_SESSION_KEY : TAB_SESSION_KEY;
  }

  private get localStorage(): Storage {
    const storage = this.document.defaultView?.localStorage;

    if (!storage) {
      throw new Error('Local storage is not available.');
    }

    return storage;
  }

  private get sessionStorage(): Storage {
    const storage = this.document.defaultView?.sessionStorage;

    if (!storage) {
      throw new Error('Session storage is not available.');
    }

    return storage;
  }
}
