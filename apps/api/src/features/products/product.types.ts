import type { InvoiceStatus } from '../../generated/prisma/client.js';

export type ProductSortField = 'name' | 'price' | 'stock' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  price: number;
  negotiable: boolean;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWriteInput {
  sku?: string | null;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  negotiable: boolean;
  stock: number;
  active: boolean;
}

export interface ProductChanges {
  sku?: string | null;
  name?: string;
  brand?: string;
  category?: string;
  description?: string | null;
  price?: number;
  negotiable?: boolean;
  stock?: number;
  active?: boolean;
}

export interface ProductListOptions {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  active?: boolean;
  sort: ProductSortField;
  order: SortOrder;
}

export interface ProductPage {
  items: Product[];
  total: number;
}

export interface ProductAnalyticsRange {
  from: Date;
  to: Date;
}

export interface ProductAnalyticsRecord {
  id: string;
  name: string;
  category: string;
  price: number;
  createdAt: Date;
  sales: {
    quantity: number;
    amount: number;
    issuedAt: Date;
  }[];
}

export interface ProductAnalyticsSource {
  products: ProductAnalyticsRecord[];
  invoiceStatuses: { status: InvoiceStatus; count: number }[];
}

export interface ProductRepository {
  list(workspaceId: string, options: ProductListOptions): Promise<ProductPage>;
  findById(workspaceId: string, productId: string): Promise<Product | null>;
  create(workspaceId: string, createdById: string, input: ProductWriteInput): Promise<Product>;
  update(workspaceId: string, productId: string, changes: ProductChanges): Promise<Product | null>;
  delete(workspaceId: string, productId: string): Promise<boolean>;
  getAnalyticsSource(
    workspaceId: string,
    range: ProductAnalyticsRange,
  ): Promise<ProductAnalyticsSource>;
}
