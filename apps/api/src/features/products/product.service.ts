import { ApiError } from '../../errors/api-error.js';
import { InvoiceStatus } from '../../generated/prisma/client.js';
import type { AuthPrincipal } from '../auth/index.js';
import type {
  CreateProductInput,
  ProductAnalyticsQuery,
  ProductListQuery,
  UpdateProductInput,
} from './product.schemas.js';
import type {
  Product,
  ProductChanges,
  ProductListOptions,
  ProductRepository,
} from './product.types.js';

export interface ProductListResult {
  data: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ProductAnalytics {
  range: { from: string; to: string };
  metrics: {
    id: 'products' | 'sales';
    label: string;
    value: number;
    change: string;
    trend: number[];
  }[];
  ranking: {
    id: string;
    name: string;
    category: string;
    price: number;
    orders: number;
    sales: number;
  }[];
  monthlySales: { month: string; value: number }[];
  distribution: { label: string; value: number; color: string }[];
}

export interface ProductManagementService {
  list(principal: AuthPrincipal, query: ProductListQuery): Promise<ProductListResult>;
  get(principal: AuthPrincipal, productId: string): Promise<Product>;
  create(principal: AuthPrincipal, input: CreateProductInput): Promise<Product>;
  update(principal: AuthPrincipal, productId: string, input: UpdateProductInput): Promise<Product>;
  delete(principal: AuthPrincipal, productId: string): Promise<void>;
  analytics(principal: AuthPrincipal, query: ProductAnalyticsQuery): Promise<ProductAnalytics>;
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function resolveRange(query: ProductAnalyticsQuery): { from: Date; to: Date } {
  const to = query.to ? endOfDay(query.to) : new Date();
  const from = query.from ? startOfDay(query.from) : new Date(to);
  if (!query.from) {
    from.setUTCDate(1);
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCMonth(from.getUTCMonth() - 6);
  }
  return { from, to };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthsInRange(from: Date, to: Date): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= last) {
    months.push({
      key: monthKey(cursor),
      label: cursor.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export class ProductService implements ProductManagementService {
  constructor(private readonly repository: ProductRepository) {}

  async list(principal: AuthPrincipal, query: ProductListQuery): Promise<ProductListResult> {
    const options: ProductListOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.category === undefined ? {} : { category: query.category }),
      ...(query.active === undefined ? {} : { active: query.active }),
    };
    const page = await this.repository.list(principal.workspaceId, options);
    return {
      data: page.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: page.total,
        totalPages: Math.ceil(page.total / query.limit),
      },
    };
  }

  async get(principal: AuthPrincipal, productId: string): Promise<Product> {
    const product = await this.repository.findById(principal.workspaceId, productId);
    if (!product) throw ApiError.notFound('Product was not found.');
    return product;
  }

  create(principal: AuthPrincipal, input: CreateProductInput): Promise<Product> {
    return this.repository.create(principal.workspaceId, principal.userId, {
      name: input.name,
      brand: input.brand,
      category: input.category,
      description: input.description,
      price: input.price,
      negotiable: input.negotiable,
      stock: input.stock,
      active: input.active,
      ...(input.sku === undefined ? {} : { sku: input.sku }),
    });
  }

  async update(
    principal: AuthPrincipal,
    productId: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const product = await this.repository.update(
      principal.workspaceId,
      productId,
      input as ProductChanges,
    );
    if (!product) throw ApiError.notFound('Product was not found.');
    return product;
  }

  async delete(principal: AuthPrincipal, productId: string): Promise<void> {
    const deleted = await this.repository.delete(principal.workspaceId, productId);
    if (!deleted) throw ApiError.notFound('Product was not found.');
  }

  async analytics(
    principal: AuthPrincipal,
    query: ProductAnalyticsQuery,
  ): Promise<ProductAnalytics> {
    const range = resolveRange(query);
    const source = await this.repository.getAnalyticsSource(principal.workspaceId, range);
    const months = monthsInRange(range.from, range.to);
    const salesByMonth = new Map(months.map(({ key }) => [key, 0]));
    const productsByMonth = new Map(months.map(({ key }) => [key, 0]));

    for (const product of source.products) {
      const productMonth = monthKey(product.createdAt);
      if (
        product.createdAt >= range.from &&
        product.createdAt <= range.to &&
        productsByMonth.has(productMonth)
      ) {
        productsByMonth.set(productMonth, (productsByMonth.get(productMonth) ?? 0) + 1);
      }
      for (const sale of product.sales) {
        const saleMonth = monthKey(sale.issuedAt);
        salesByMonth.set(
          saleMonth,
          roundCurrency((salesByMonth.get(saleMonth) ?? 0) + sale.amount),
        );
      }
    }

    const productPerformance = source.products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      orders: product.sales.reduce((total, sale) => total + sale.quantity, 0),
      sales: roundCurrency(product.sales.reduce((total, sale) => total + sale.amount, 0)),
    }));
    const totalSales = roundCurrency(
      productPerformance.reduce((total, product) => total + product.sales, 0),
    );
    const ranking = productPerformance
      .sort((left, right) => right.sales - left.sales || left.name.localeCompare(right.name))
      .slice(0, 10);
    const newProducts = [...productsByMonth.values()].reduce((total, value) => total + value, 0);
    const statusCounts = new Map(
      source.invoiceStatuses.map(({ status, count }) => [status, count]),
    );
    const totalOrders = source.invoiceStatuses.reduce((total, item) => total + item.count, 0);
    const percentage = (status: InvoiceStatus): number =>
      totalOrders === 0 ? 0 : Math.round(((statusCounts.get(status) ?? 0) / totalOrders) * 100);

    return {
      range: {
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      metrics: [
        {
          id: 'products',
          label: 'Total products',
          value: source.products.length,
          change: `+${newProducts.toLocaleString('en-US')} new`,
          trend: [...productsByMonth.values()],
        },
        {
          id: 'sales',
          label: 'Total sales',
          value: totalSales,
          change: `${totalOrders.toLocaleString('en-US')} orders`,
          trend: [...salesByMonth.values()],
        },
      ],
      ranking,
      monthlySales: months.map(({ key, label }) => ({
        month: label,
        value: salesByMonth.get(key) ?? 0,
      })),
      distribution: [
        { label: 'Total sales', value: percentage(InvoiceStatus.COMPLETE), color: '#5b8ff9' },
        { label: 'Total orders', value: percentage(InvoiceStatus.PENDING), color: '#f6c85f' },
        {
          label: 'Orders canceled',
          value: percentage(InvoiceStatus.CANCELLED),
          color: '#ff876c',
        },
      ],
    };
  }
}
