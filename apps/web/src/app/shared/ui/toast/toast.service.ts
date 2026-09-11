import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';
export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<readonly ToastMessage[]>([]);

  show(message: string, tone: ToastTone = 'info', duration = 4000): void {
    const toast = { id: ++this.nextId, message, tone };
    this.messages.update((messages) => [...messages, toast]);
    globalThis.setTimeout(() => this.dismiss(toast.id), duration);
  }
  success(message: string): void {
    this.show(message, 'success');
  }
  error(message: string): void {
    this.show(message, 'error', 6000);
  }
  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((item) => item.id !== id));
  }
}
