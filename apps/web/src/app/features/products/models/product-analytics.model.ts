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
export interface ProductCreateInput {
  sku?: string | null;
  name: string;
  brand: string;
  category: string;
  price: number;
  negotiable: boolean;
  description: string;
  stock?: number;
  active?: boolean;
}
export interface Product extends Omit<
  ProductCreateInput,
  'sku' | 'description' | 'stock' | 'active'
> {
  id: string;
  sku: string | null;
  description: string | null;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export type ProductUpdateInput = Partial<Omit<ProductCreateInput, 'description'>> & {
  description?: string | null;
};
export interface ProductListOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  active?: boolean;
  sort?: 'name' | 'price' | 'stock' | 'createdAt';
  order?: 'asc' | 'desc';
}
export interface ProductPage {
  data: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  range: { from: string; to: string };
  metrics: readonly ProductMetric[];
  ranking: readonly ProductRanking[];
  monthlySales: readonly MonthlyProductSales[];
  distribution: readonly ProductSalesDistribution[];
}
