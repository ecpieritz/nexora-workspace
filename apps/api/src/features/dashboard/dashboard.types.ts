export type DashboardInterval = 'day' | 'week' | 'month';
export type DashboardInvoiceStatus = 'complete' | 'pending' | 'cancelled';

export interface DashboardRange {
  from: Date;
  to: Date;
  currency: string;
}

export interface DashboardProductTotals {
  count: number;
  stock: number;
}

export interface DashboardInvoiceItemSource {
  id: string;
  productId: string | null;
  productName: string | null;
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface DashboardInvoiceSource {
  id: string;
  number: string;
  customerName: string;
  issuedAt: Date;
  status: DashboardInvoiceStatus;
  currency: string;
  total: number;
  items: DashboardInvoiceItemSource[];
}

export interface DashboardSource {
  products: DashboardProductTotals;
  customerCount: number;
  invoices: DashboardInvoiceSource[];
}

export interface DashboardRepository {
  getSource(workspaceId: string, range: DashboardRange): Promise<DashboardSource>;
}

export interface DashboardMetric {
  id: 'products' | 'stock' | 'revenue' | 'customers';
  label: string;
  value: number;
  currency: string | null;
}

export interface SalesReportPoint {
  period: string;
  label: string;
  value: number;
}

export interface TransactionSegment {
  status: DashboardInvoiceStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentOrder {
  id: string;
  invoiceId: string;
  trackingNumber: string;
  customerName: string;
  productId: string | null;
  productName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  status: DashboardInvoiceStatus;
  issuedAt: string;
}

export interface TopProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  orderCount: number;
  revenue: number;
}
