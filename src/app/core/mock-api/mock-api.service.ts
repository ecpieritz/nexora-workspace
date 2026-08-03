import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';

import { MockApiPage, MockApiPageQuery, MockApiRequestOptions } from './mock-api.models';

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly document = inject(DOCUMENT);

  async execute<T>(
    operation: () => T | Promise<T>,
    options: MockApiRequestOptions = {},
  ): Promise<T> {
    await this.wait(options.delay);
    return operation();
  }

  paginate<T>(items: readonly T[], query: MockApiPageQuery = {}): MockApiPage<T> {
    const page = this.toPositiveInteger(query.page, 1);
    const pageSize = this.toPositiveInteger(query.pageSize, 10);
    const start = (page - 1) * pageSize;
    const total = items.length;

    return {
      data: items.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  createId(): string {
    const crypto = this.document.defaultView?.crypto;

    if (!crypto) {
      throw new Error('Web Crypto is not available.');
    }

    return crypto.randomUUID();
  }

  private async wait(customDelay?: number): Promise<void> {
    if (!environment.mockApi.enabled) {
      return;
    }

    const delay = Math.max(0, customDelay ?? environment.mockApi.delay);

    if (delay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  private toPositiveInteger(value: number | undefined, fallback: number): number {
    return value && Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
