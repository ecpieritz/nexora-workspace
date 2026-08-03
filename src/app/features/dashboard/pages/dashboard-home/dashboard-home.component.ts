import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';
import { DashboardRepository } from '../../data-access/dashboard.repository';
import { DashboardSummary } from '../../models/dashboard-summary.model';

@Component({
  selector: 'app-dashboard-home',
  imports: [SummaryCardComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private readonly dashboardRepository = inject(DashboardRepository);
  protected readonly session = inject(AuthSessionService);
  protected readonly summary = signal<DashboardSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  ngOnInit(): void {
    void this.loadSummary();
  }

  protected async loadSummary(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      this.summary.set(await this.dashboardRepository.getSummary());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
