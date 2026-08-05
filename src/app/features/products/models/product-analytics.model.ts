export interface ProductMetric {
  id: 'products' | 'sales';
  label: string;
  value: number;
  change: string;
  trend: readonly number[];
}
export interface ProductRanking {
  id: string;
  name: string;
  category: string;
  price: number;
  orders: number;
  sales: number;
}
export interface MonthlyProductSales {
  month: string;
  value: number;
}
export interface ProductSalesDistribution {
  label: string;
  value: number;
  color: string;
}
export interface ProductAnalytics {
  metrics: readonly ProductMetric[];
  ranking: readonly ProductRanking[];
  monthlySales: readonly MonthlyProductSales[];
  distribution: readonly ProductSalesDistribution[];
}
