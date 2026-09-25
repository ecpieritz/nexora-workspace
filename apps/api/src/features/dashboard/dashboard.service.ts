import { ApiError } from '../../errors/api-error.js';
import type { AuthPrincipal } from '../auth/index.js';
import type { DashboardMetricsQuery, DashboardReportsQuery } from './dashboard.schemas.js';
import type {
  DashboardInterval,
  DashboardMetric,
  DashboardRange,
  DashboardRepository,
  DashboardSource,
  RecentOrder,
  SalesReportPoint,
  TopProduct,
  TransactionSegment,
} from './dashboard.types.js';

export interface DashboardMetricsResult {
  data: DashboardMetric[];
  meta: { from: string; to: string; currency: string };
}

export interface DashboardReportsResult {
  data: {
    sales: {
      total: number;
      invoiceCount: number;
      averageOrderValue: number;
      interval: DashboardInterval;
      series: SalesReportPoint[];
    };
    transactions: {
      total: number;
      completionRate: number;
      segments: TransactionSegment[];
    };
    recentOrders: RecentOrder[];
    topProducts: TopProduct[];
  };
  meta: { from: string; to: string; currency: string };
}

export interface DashboardReportingService {
  metrics(principal: AuthPrincipal, query: DashboardMetricsQuery): Promise<DashboardMetricsResult>;
  reports(principal: AuthPrincipal, query: DashboardReportsQuery): Promise<DashboardReportsResult>;
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function resolveRange(query: DashboardMetricsQuery): DashboardRange {
  const to = query.to ? endOfDay(query.to) : new Date();
  const from = query.from ? startOfDay(query.from) : new Date(to);
  if (!query.from) {
    from.setUTCDate(from.getUTCDate() - 89);
    from.setUTCHours(0, 0, 0, 0);
  }
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days < 0) throw ApiError.badRequest('To must be on or after from.');
  if (days > 367) throw ApiError.badRequest('Dashboard range cannot exceed 366 days.');
  return { from, to, currency: query.currency };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function buildSalesSeries(
  source: DashboardSource,
  range: DashboardRange,
  interval: DashboardInterval,
): SalesReportPoint[] {
  const completed = source.invoices.filter(({ status }) => status === 'complete');
  if (interval === 'month') {
    const values = new Map<string, number>();
    for (const invoice of completed) {
      const key = monthKey(invoice.issuedAt);
      values.set(key, roundCurrency((values.get(key) ?? 0) + invoice.total));
    }
    const points: SalesReportPoint[] = [];
    const cursor = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1));
    const last = new Date(Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1));
    while (cursor <= last) {
      const period = monthKey(cursor);
      points.push({ period, label: monthLabel(cursor), value: values.get(period) ?? 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return points;
  }

  if (interval === 'week') {
    const totalDays = Math.floor((range.to.getTime() - range.from.getTime()) / 86_400_000);
    const count = Math.floor(totalDays / 7) + 1;
    const values = Array.from({ length: count }, () => 0);
    for (const invoice of completed) {
      const index = Math.floor((invoice.issuedAt.getTime() - range.from.getTime()) / 604_800_000);
      if (index >= 0 && index < values.length) {
        values[index] = roundCurrency((values[index] ?? 0) + invoice.total);
      }
    }
    return values.map((value, index) => {
      const start = new Date(range.from);
      start.setUTCDate(start.getUTCDate() + index * 7);
      return { period: dateKey(start), label: dayLabel(start), value };
    });
  }

  const values = new Map<string, number>();
  for (const invoice of completed) {
    const key = dateKey(invoice.issuedAt);
    values.set(key, roundCurrency((values.get(key) ?? 0) + invoice.total));
  }
  const points: SalesReportPoint[] = [];
  const cursor = new Date(range.from);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= range.to) {
    const period = dateKey(cursor);
    points.push({ period, label: dayLabel(cursor), value: values.get(period) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function transactionSegments(source: DashboardSource): TransactionSegment[] {
  const definitions = [
    { status: 'complete' as const, label: 'Complete', color: '#5b8ff9' },
    { status: 'pending' as const, label: 'Pending', color: '#f6c85f' },
    { status: 'cancelled' as const, label: 'Cancelled', color: '#ff876c' },
  ];
  const total = source.invoices.length;
  let allocated = 0;
  return definitions.map((definition, index) => {
    const count = source.invoices.filter(({ status }) => status === definition.status).length;
    const percentage =
      total === 0
        ? 0
        : index === definitions.length - 1
          ? roundCurrency(100 - allocated)
          : Math.round((count / total) * 1000) / 10;
    allocated += percentage;
    return { ...definition, count, percentage };
  });
}

function recentOrders(source: DashboardSource, limit: number): RecentOrder[] {
  return source.invoices
    .flatMap((invoice) =>
      invoice.items.map((item) => ({
        id: item.id,
        invoiceId: invoice.id,
        trackingNumber: invoice.number,
        customerName: invoice.customerName,
        productId: item.productId,
        productName: item.productName ?? item.description,
        price: item.unitPrice,
        quantity: item.quantity,
        totalAmount: item.amount,
        status: invoice.status,
        issuedAt: invoice.issuedAt.toISOString(),
      })),
    )
    .slice(0, limit);
}

function topProducts(source: DashboardSource, limit: number): TopProduct[] {
  const products = new Map<
    string,
    {
      id: string;
      name: string;
      price: number;
      quantity: number;
      invoices: Set<string>;
      revenue: number;
    }
  >();
  for (const invoice of source.invoices.filter(({ status }) => status === 'complete')) {
    for (const item of invoice.items) {
      const key = item.productId ?? `description:${item.description.toLowerCase()}`;
      const product = products.get(key) ?? {
        id: item.productId ?? key,
        name: item.productName ?? item.description,
        price: item.unitPrice,
        quantity: 0,
        invoices: new Set<string>(),
        revenue: 0,
      };
      product.quantity += item.quantity;
      product.invoices.add(invoice.id);
      product.revenue = roundCurrency(product.revenue + item.amount);
      products.set(key, product);
    }
  }
  return [...products.values()]
    .sort((left, right) => right.revenue - left.revenue || left.name.localeCompare(right.name))
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      orderCount: product.invoices.size,
      revenue: product.revenue,
    }));
}

function resultMeta(range: DashboardRange): DashboardMetricsResult['meta'] {
  return {
    from: dateKey(range.from),
    to: dateKey(range.to),
    currency: range.currency,
  };
}

export class DashboardService implements DashboardReportingService {
  constructor(private readonly repository: DashboardRepository) {}

  async metrics(
    principal: AuthPrincipal,
    query: DashboardMetricsQuery,
  ): Promise<DashboardMetricsResult> {
    const range = resolveRange(query);
    const source = await this.repository.getSource(principal.workspaceId, range);
    const revenue = roundCurrency(
      source.invoices
        .filter(({ status }) => status === 'complete')
        .reduce((total, invoice) => total + invoice.total, 0),
    );
    return {
      data: [
        { id: 'products', label: 'Active products', value: source.products.count, currency: null },
        { id: 'stock', label: 'Units in stock', value: source.products.stock, currency: null },
        { id: 'revenue', label: 'Revenue', value: revenue, currency: range.currency },
        { id: 'customers', label: 'Customers', value: source.customerCount, currency: null },
      ],
      meta: resultMeta(range),
    };
  }

  async reports(
    principal: AuthPrincipal,
    query: DashboardReportsQuery,
  ): Promise<DashboardReportsResult> {
    const range = resolveRange(query);
    const source = await this.repository.getSource(principal.workspaceId, range);
    const completed = source.invoices.filter(({ status }) => status === 'complete');
    const total = roundCurrency(completed.reduce((sum, invoice) => sum + invoice.total, 0));
    const segments = transactionSegments(source);
    return {
      data: {
        sales: {
          total,
          invoiceCount: completed.length,
          averageOrderValue: completed.length === 0 ? 0 : roundCurrency(total / completed.length),
          interval: query.interval,
          series: buildSalesSeries(source, range, query.interval),
        },
        transactions: {
          total: source.invoices.length,
          completionRate: segments.find(({ status }) => status === 'complete')?.percentage ?? 0,
          segments,
        },
        recentOrders: recentOrders(source, query.recentLimit),
        topProducts: topProducts(source, query.productLimit),
      },
      meta: resultMeta(range),
    };
  }
}
