import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  protected readonly session = inject(AuthSessionService);
}
