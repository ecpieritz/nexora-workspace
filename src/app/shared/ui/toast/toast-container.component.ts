import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toasts.messages(); track toast.id) {
        <div class="toast" [attr.data-tone]="toast.tone" role="status">
          <span aria-hidden="true">{{
            toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'
          }}</span>
          <p>{{ toast.message }}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            (click)="toasts.dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}
