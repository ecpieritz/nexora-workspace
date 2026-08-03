import { inject, Injectable } from '@angular/core';

import { MockApiService } from '@core/mock-api';

import { SalesReportPoint, TransactionAnalytics } from '../models/dashboard-chart.model';
import { DashboardSummary } from '../models/dashboard-summary.model';

const DASHBOARD_SUMMARY: readonly DashboardSummary[] = [
  {
    id: 'saved-products',
    label: 'Saved products',
    value: 178,
    suffix: '+',
    icon: 'saved',
    tone: 'blue',
  },
  {
    id: 'stock-products',
    label: 'Stock products',
    value: 20,
    suffix: '+',
    icon: 'stock',
    tone: 'yellow',
  },
  {
    id: 'sales-products',
    label: 'Sales products',
    value: 190,
    suffix: '+',
    icon: 'sales',
    tone: 'coral',
  },
  {
    id: 'job-applications',
    label: 'Job applications',
    value: 12,
    suffix: '+',
    icon: 'applications',
    tone: 'purple',
  },
];

const SALES_REPORT: readonly SalesReportPoint[] = [
  { label: '10am', value: 52 },
  { label: '11am', value: 31 },
  { label: '12pm', value: 57 },
  { label: '01pm', value: 35 },
  { label: '02pm', value: 48 },
  { label: '03pm', value: 18 },
  { label: '04pm', value: 39 },
  { label: '05pm', value: 34 },
  { label: '06pm', value: 67 },
  { label: '07pm', value: 73 },
];

const TRANSACTION_ANALYTICS: TransactionAnalytics = {
  headline: 80,
  label: 'Transactions',
  segments: [
    { id: 'sale', label: 'Sale', value: 45, color: '#5b8ff9' },
    { id: 'distribution', label: 'Distribution', value: 30, color: '#f6c85f' },
    { id: 'return', label: 'Return', value: 25, color: '#ff876c' },
  ],
};

@Injectable({ providedIn: 'root' })
export class DashboardRepository {
  private readonly mockApi = inject(MockApiService);

  getSummary(): Promise<DashboardSummary[]> {
    return this.mockApi.execute(() => DASHBOARD_SUMMARY.map((item) => ({ ...item })));
  }

  getSalesReport(): Promise<SalesReportPoint[]> {
    return this.mockApi.execute(() => SALES_REPORT.map((point) => ({ ...point })));
  }

  getTransactionAnalytics(): Promise<TransactionAnalytics> {
    return this.mockApi.execute(() => ({
      ...TRANSACTION_ANALYTICS,
      segments: TRANSACTION_ANALYTICS.segments.map((segment) => ({ ...segment })),
    }));
  }
}
