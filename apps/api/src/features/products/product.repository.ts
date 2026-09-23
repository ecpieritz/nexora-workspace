import { prisma } from '../../database/prisma.js';
import { InvoiceStatus, Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  Product,
  ProductAnalyticsRange,
  ProductAnalyticsSource,
  ProductChanges,
  ProductListOptions,
  ProductPage,
  ProductRepository,
  ProductWriteInput,
} from './product.types.js';

const productSelect = {
  id: true,
  sku: true,
  name: true,
  brand: true,
  category: true,
  description: true,
  price: true,
  negotiable: true,
  stock: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function toProduct(product: ProductRecord): Product {
  return {
    ...product,
    price: product.price.toNumber(),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function createWhere(workspaceId: string, options: ProductListOptions): Prisma.ProductWhereInput {
  const search = options.search?.trim();
  return {
    workspaceId,
    ...(options.active === undefined ? {} : { active: options.active }),
    ...(options.category === undefined
      ? {}
      : { category: { equals: options.category, mode: Prisma.QueryMode.insensitive } }),
    ...(search
      ? {
          OR: ['name', 'brand', 'category', 'sku'].map((field) => ({
            [field]: { contains: search, mode: Prisma.QueryMode.insensitive },
          })),
        }
      : {}),
  };
}

function toUpdateData(changes: ProductChanges): Prisma.ProductUpdateManyMutationInput {
  return {
    ...(changes.sku === undefined ? {} : { sku: changes.sku }),
    ...(changes.name === undefined ? {} : { name: changes.name }),
    ...(changes.brand === undefined ? {} : { brand: changes.brand }),
    ...(changes.category === undefined ? {} : { category: changes.category }),
    ...(changes.description === undefined ? {} : { description: changes.description }),
    ...(changes.price === undefined ? {} : { price: new Prisma.Decimal(changes.price) }),
    ...(changes.negotiable === undefined ? {} : { negotiable: changes.negotiable }),
    ...(changes.stock === undefined ? {} : { stock: changes.stock }),
    ...(changes.active === undefined ? {} : { active: changes.active }),
  };
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async list(workspaceId: string, options: ProductListOptions): Promise<ProductPage> {
    const where = createWhere(workspaceId, options);
    const [items, total] = await this.database.$transaction([
      this.database.product.findMany({
        where,
        select: productSelect,
        orderBy: [{ [options.sort]: options.order }, { id: 'asc' }],
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.database.product.count({ where }),
    ]);
    return { items: items.map(toProduct), total };
  }

  async findById(workspaceId: string, productId: string): Promise<Product | null> {
    const product = await this.database.product.findFirst({
      where: { id: productId, workspaceId },
      select: productSelect,
    });
    return product ? toProduct(product) : null;
  }

  async create(
    workspaceId: string,
    createdById: string,
    input: ProductWriteInput,
  ): Promise<Product> {
    const product = await this.database.product.create({
      data: {
        ...input,
        workspaceId,
        createdById,
        price: new Prisma.Decimal(input.price),
      },
      select: productSelect,
    });
    return toProduct(product);
  }

  async update(
    workspaceId: string,
    productId: string,
    changes: ProductChanges,
  ): Promise<Product | null> {
    const updated = await this.database.product.updateMany({
      where: { id: productId, workspaceId },
      data: toUpdateData(changes),
    });
    if (updated.count !== 1) return null;
    return this.findById(workspaceId, productId);
  }

  async delete(workspaceId: string, productId: string): Promise<boolean> {
    const deleted = await this.database.product.deleteMany({
      where: { id: productId, workspaceId },
    });
    return deleted.count === 1;
  }

  async getAnalyticsSource(
    workspaceId: string,
    range: ProductAnalyticsRange,
  ): Promise<ProductAnalyticsSource> {
    const [products, statuses] = await this.database.$transaction([
      this.database.product.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          createdAt: true,
          invoiceItems: {
            where: {
              invoice: {
                workspaceId,
                status: InvoiceStatus.COMPLETE,
                issuedAt: { gte: range.from, lte: range.to },
              },
            },
            select: {
              quantity: true,
              amount: true,
              invoice: { select: { issuedAt: true } },
            },
          },
        },
      }),
      this.database.invoice.findMany({
        where: { workspaceId, issuedAt: { gte: range.from, lte: range.to } },
        select: { status: true },
      }),
    ]);

    const statusCounts = new Map<InvoiceStatus, number>();
    for (const invoice of statuses) {
      statusCounts.set(invoice.status, (statusCounts.get(invoice.status) ?? 0) + 1);
    }

    return {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price.toNumber(),
        createdAt: product.createdAt,
        sales: product.invoiceItems.map((item) => ({
          quantity: item.quantity,
          amount: item.amount.toNumber(),
          issuedAt: item.invoice.issuedAt,
        })),
      })),
      invoiceStatuses: [...statusCounts].map(([status, count]) => ({ status, count })),
    };
  }
}
