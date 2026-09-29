import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ToastService } from '@shared/ui';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  private readonly toast = inject(ToastService);

  handle(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toast.error('An unexpected error occurred. Please try again.');
      return;
    }

    if (error.status === 401) return;
    this.toast.error(this.messageFor(error));
  }

  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'We could not reach the server. Check your connection and try again.';
    }

    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (error.status >= 500) {
      return 'The server could not complete your request. Please try again shortly.';
    }

    return this.apiMessage(error) ?? 'We could not complete your request. Please try again.';
  }

  private apiMessage(error: HttpErrorResponse): string | null {
    const body = error.error as ApiErrorBody | null;
    const message = body?.error?.message;
    return typeof message === 'string' && message.trim() ? message : null;
  }
}
