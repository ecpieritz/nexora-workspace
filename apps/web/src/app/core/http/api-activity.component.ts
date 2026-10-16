import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ApiLoadingService } from './api-loading.service';

@Component({
  selector: 'app-api-activity',
  template: `
    @if (loading.isLoading()) {
      <div class="api-activity" role="status" aria-live="polite">
        <span class="api-activity__bar" aria-hidden="true"></span>
        <span class="api-activity__label">Loading workspace data</span>
      </div>
    }
  `,
  styleUrl: './api-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiActivityComponent {
  protected readonly loading = inject(ApiLoadingService);
}
