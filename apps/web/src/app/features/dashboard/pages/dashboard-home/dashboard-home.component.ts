import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import { DataStateComponent } from '@shared/ui';

import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';
import { SalesReportChartComponent } from '../../components/sales-report-chart/sales-report-chart.component';
import { TransactionChartComponent } from '../../components/transaction-chart/transaction-chart.component';
import { RecentOrdersComponent } from '../../components/recent-orders/recent-orders.component';
import { TopProductsComponent } from '../../components/top-products/top-products.component';
import { DashboardRepository } from '../../data-access/dashboard.repository';
import { SalesReportPoint, TransactionAnalytics } from '../../models/dashboard-chart.model';
import { DashboardSummary } from '../../models/dashboard-summary.model';
import { RecentOrder, TopProduct } from '../../models/dashboard-widget.model';

@Component({
  selector: 'app-dashboard-home',
  imports: [
    DataStateComponent,
    RecentOrdersComponent,
    SalesReportChartComponent,
    SummaryCardComponent,
    TopProductsComponent,
    TransactionChartComponent,
  ],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private readonly dashboardRepository = inject(DashboardRepository);
  protected readonly session = inject(AuthSessionService);
  protected readonly summary = signal<DashboardSummary[]>([]);
  protected readonly salesReport = signal<SalesReportPoint[]>([]);
  protected readonly transactionAnalytics = signal<TransactionAnalytics | null>(null);
  protected readonly recentOrders = signal<RecentOrder[]>([]);
  protected readonly topProducts = signal<TopProduct[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  ngOnInit(): void {
    void this.loadDashboard();
  }

  protected async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const [summary, salesReport, transactionAnalytics, recentOrders, topProducts] =
        await Promise.all([
          this.dashboardRepository.getSummary(),
          this.dashboardRepository.getSalesReport(),
          this.dashboardRepository.getTransactionAnalytics(),
          this.dashboardRepository.getRecentOrders(),
          this.dashboardRepository.getTopProducts(),
        ]);
      this.summary.set(summary);
      this.salesReport.set(salesReport);
      this.transactionAnalytics.set(transactionAnalytics);
      this.recentOrders.set(recentOrders);
      this.topProducts.set(topProducts);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
