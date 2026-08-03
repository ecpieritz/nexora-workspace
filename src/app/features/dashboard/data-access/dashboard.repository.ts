import { inject, Injectable } from '@angular/core';

import { MockApiService } from '@core/mock-api';

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

@Injectable({ providedIn: 'root' })
export class DashboardRepository {
  private readonly mockApi = inject(MockApiService);

  getSummary(): Promise<DashboardSummary[]> {
    return this.mockApi.execute(() => DASHBOARD_SUMMARY.map((item) => ({ ...item })));
  }
}
