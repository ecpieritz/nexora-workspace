import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

import { RegisteredUser } from './mock-auth.repository';

const LOCAL_SESSION_KEY = 'nexora:persistent-session';
const TAB_SESSION_KEY = 'nexora:tab-session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const PERSISTENT_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

export interface AuthSession {
  token: string;
  user: RegisteredUser;
  expiresAt: string;
  persistent: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly document = inject(DOCUMENT);
  private readonly session = signal<AuthSession | null>(this.restore());

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  start(user: RegisteredUser, persistent: boolean): void {
    const duration = persistent ? PERSISTENT_SESSION_DURATION : SESSION_DURATION;
    const session: AuthSession = {
      token: this.crypto.randomUUID(),
      user,
      expiresAt: new Date(Date.now() + duration).toISOString(),
      persistent,
    };

    this.clearStoredSessions();
    this.getStorage(persistent).setItem(this.getStorageKey(persistent), JSON.stringify(session));
    this.session.set(session);
  }

  clear(): void {
    this.clearStoredSessions();
    this.session.set(null);
  }

  private restore(): AuthSession | null {
    const session = this.readSession(this.sessionStorage, TAB_SESSION_KEY);
    const persistentSession = this.readSession(this.localStorage, LOCAL_SESSION_KEY);
    const restoredSession = session ?? persistentSession;

    if (!restoredSession) {
      return null;
    }

    if (new Date(restoredSession.expiresAt).getTime() <= Date.now()) {
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
      return JSON.parse(storedValue) as AuthSession;
    } catch {
      storage.removeItem(key);
      return null;
    }
  }

  private clearStoredSessions(): void {
    this.localStorage.removeItem(LOCAL_SESSION_KEY);
    this.sessionStorage.removeItem(TAB_SESSION_KEY);
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

  private get crypto(): Crypto {
    const crypto = this.document.defaultView?.crypto;

    if (!crypto) {
      throw new Error('Web Crypto is not available.');
    }

    return crypto;
  }
}
