import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import { SalesReportPoint, TransactionAnalytics } from '../models/dashboard-chart.model';
import { DashboardSummary } from '../models/dashboard-summary.model';
import { ProductVisual, RecentOrder, TopProduct } from '../models/dashboard-widget.model';

export interface DashboardData {
  summary: DashboardSummary[];
  salesReport: SalesReportPoint[];
  transactionAnalytics: TransactionAnalytics;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
}

export interface DashboardOptions {
  from?: string;
  to?: string;
  currency?: string;
  interval?: 'day' | 'week' | 'month';
  recentLimit?: number;
  productLimit?: number;
}

interface DashboardMetric {
  id: 'products' | 'stock' | 'revenue' | 'customers';
  label: string;
  value: number;
  currency: string | null;
}

interface DashboardReports {
  sales: { series: { period: string; label: string; value: number }[] };
  transactions: {
    completionRate: number;
    segments: { status: string; label: string; percentage: number; color: string }[];
  };
  recentOrders: {
    id: string;
    trackingNumber: string;
    productName: string;
    price: number;
    quantity: number;
    totalAmount: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    orderCount: number;
    revenue: number;
  }[];
}

interface ApiDataResponse<T> {
  data: T;
}

const SUMMARY_PRESENTATION = {
  products: { icon: 'saved', tone: 'blue' },
  stock: { icon: 'stock', tone: 'yellow' },
  revenue: { icon: 'sales', tone: 'coral' },
  customers: { icon: 'applications', tone: 'purple' },
} as const;

@Injectable({ providedIn: 'root' })
export class DashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly dashboardUrl = `${environment.apiUrl}/dashboard`;

  async getDashboard(options: DashboardOptions = {}): Promise<DashboardData> {
    const commonParams = this.commonParams(options);
    const reportParams = commonParams
      .set('interval', options.interval ?? 'week')
      .set('recentLimit', options.recentLimit ?? 4)
      .set('productLimit', options.productLimit ?? 5);
    const [metricsResponse, reportsResponse] = await Promise.all([
      firstValueFrom(
        this.http.get<ApiDataResponse<DashboardMetric[]>>(`${this.dashboardUrl}/metrics`, {
          params: commonParams,
        }),
      ),
      firstValueFrom(
        this.http.get<ApiDataResponse<DashboardReports>>(`${this.dashboardUrl}/reports`, {
          params: reportParams,
        }),
      ),
    ]);
    return this.toDashboardData(metricsResponse.data, reportsResponse.data);
  }

  private commonParams(options: DashboardOptions): HttpParams {
    let params = new HttpParams().set('currency', options.currency ?? 'USD');
    if (options.from) params = params.set('from', options.from);
    if (options.to) params = params.set('to', options.to);
    return params;
  }

  private toDashboardData(metrics: DashboardMetric[], reports: DashboardReports): DashboardData {
    return {
      summary: metrics.map((metric) => ({
        id: metric.id,
        label: metric.label,
        value: metric.value,
        suffix: metric.currency ? ` ${metric.currency}` : '',
        ...SUMMARY_PRESENTATION[metric.id],
      })),
      salesReport: reports.sales.series.map(({ label, value }) => ({ label, value })),
      transactionAnalytics: {
        headline: reports.transactions.completionRate,
        label: 'Transactions',
        segments: reports.transactions.segments.map((segment) => ({
          id: segment.status,
          label: segment.label,
          value: segment.percentage,
          color: segment.color,
        })),
      },
      recentOrders: reports.recentOrders.map((order) => ({
        ...order,
        productVisual: this.productVisual(order.productName),
      })),
      topProducts: reports.topProducts.map((product) => ({
        ...product,
        productVisual: this.productVisual(product.name),
      })),
    };
  }

  private productVisual(name: string): ProductVisual {
    const normalized = name.toLowerCase();
    if (normalized.includes('camera')) return 'camera';
    if (normalized.includes('dress') || normalized.includes('shirt')) return 'dress';
    if (normalized.includes('oil') || normalized.includes('bottle')) return 'bottle';
    if (normalized.includes('perfume')) return 'perfume';
    if (normalized.includes('phone')) return 'phone';
    return 'shoe';
  }
}
