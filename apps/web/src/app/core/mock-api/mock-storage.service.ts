import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { MockApiError } from './mock-api.error';

@Injectable({ providedIn: 'root' })
export class MockStorageService {
  private readonly document = inject(DOCUMENT);

  read<T>(key: string, fallback: T): T {
    const storedValue = this.storage.getItem(key);

    if (!storedValue) {
      return structuredClone(fallback);
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      this.storage.removeItem(key);
      return structuredClone(fallback);
    }
  }

  write<T>(key: string, value: T): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error: unknown) {
      throw new MockApiError(507, 'The mock API could not persist its data.', error);
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  private get storage(): Storage {
    const storage = this.document.defaultView?.localStorage;

    if (!storage) {
      throw new MockApiError(503, 'Browser storage is not available.');
    }

    return storage;
  }
}
