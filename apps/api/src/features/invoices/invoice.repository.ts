import { prisma } from '../../database/prisma.js';
import {
  InvoiceStatus,
  Prisma,
  type PrismaClient,
  type InvoiceStatus as PrismaInvoiceStatus,
} from '../../generated/prisma/client.js';
import type {
  Invoice,
  InvoiceChanges,
  InvoiceListOptions,
  InvoicePage,
  InvoiceReferenceInput,
  InvoiceRepository,
  InvoiceStatusValue,
  InvoiceWriteInput,
} from './invoice.types.js';

const invoiceSelect = {
  id: true,
  number: true,
  customerId: true,
  customerName: true,
  email: true,
  address: true,
  issuedAt: true,
  dueAt: true,
  status: true,
  favorite: true,
  currency: true,
  discount: true,
  subtotal: true,
  total: true,
  items: {
    select: {
      id: true,
      productId: true,
      description: true,
      unitPrice: true,
      quantity: true,
      amount: true,
    },
    orderBy: { id: 'asc' as const },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InvoiceSelect;

type InvoiceRecord = Prisma.InvoiceGetPayload<{ select: typeof invoiceSelect }>;

const publicToDatabaseStatus: Record<InvoiceStatusValue, PrismaInvoiceStatus> = {
  complete: InvoiceStatus.COMPLETE,
  pending: InvoiceStatus.PENDING,
  cancelled: InvoiceStatus.CANCELLED,
};

const databaseToPublicStatus: Record<PrismaInvoiceStatus, InvoiceStatusValue> = {
  [InvoiceStatus.COMPLETE]: 'complete',
  [InvoiceStatus.PENDING]: 'pending',
  [InvoiceStatus.CANCELLED]: 'cancelled',
};

function toInvoice(invoice: InvoiceRecord): Invoice {
  return {
    ...invoice,
    status: databaseToPublicStatus[invoice.status],
    discount: invoice.discount.toNumber(),
    subtotal: invoice.subtotal.toNumber(),
    total: invoice.total.toNumber(),
    items: invoice.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      description: item.description,
      rate: item.unitPrice.toNumber(),
      quantity: item.quantity,
      amount: item.amount.toNumber(),
    })),
    issuedAt: invoice.issuedAt.toISOString(),
    dueAt: invoice.dueAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

function createWhere(workspaceId: string, options: InvoiceListOptions): Prisma.InvoiceWhereInput {
  const search = options.search?.trim();
  return {
    workspaceId,
    ...(options.status === undefined ? {} : { status: publicToDatabaseStatus[options.status] }),
    ...(options.favorite === undefined ? {} : { favorite: options.favorite }),
    ...(options.from === undefined && options.to === undefined
      ? {}
      : {
          issuedAt: {
            ...(options.from === undefined ? {} : { gte: options.from }),
            ...(options.to === undefined ? {} : { lte: options.to }),
          },
        }),
    ...(search
      ? {
          OR: ['number', 'customerName', 'email'].map((field) => ({
            [field]: { contains: search, mode: Prisma.QueryMode.insensitive },
          })),
        }
      : {}),
  };
}

function lineData(input: InvoiceWriteInput['items'][number]) {
  return {
    productId: input.productId ?? null,
    description: input.description,
    unitPrice: new Prisma.Decimal(input.rate),
    quantity: input.quantity,
    amount: new Prisma.Decimal(input.amount),
  };
}

export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async list(workspaceId: string, options: InvoiceListOptions): Promise<InvoicePage> {
    const where = createWhere(workspaceId, options);
    const [items, total] = await this.database.$transaction([
      this.database.invoice.findMany({
        where,
        select: invoiceSelect,
        orderBy: [{ [options.sort]: options.order }, { id: 'asc' }],
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.database.invoice.count({ where }),
    ]);
    return { items: items.map(toInvoice), total };
  }

  async findById(workspaceId: string, invoiceId: string): Promise<Invoice | null> {
    const invoice = await this.database.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      select: invoiceSelect,
    });
    return invoice ? toInvoice(invoice) : null;
  }

  async referencesExist(workspaceId: string, references: InvoiceReferenceInput): Promise<boolean> {
    const productIds = [...new Set(references.productIds)];
    const checks = [
      this.database.product.count({ where: { id: { in: productIds }, workspaceId } }),
      references.customerId
        ? this.database.customer.count({ where: { id: references.customerId, workspaceId } })
        : Promise.resolve(1),
    ] as const;
    const [productCount, customerCount] = await Promise.all(checks);
    return productCount === productIds.length && customerCount === 1;
  }

  async create(
    workspaceId: string,
    createdById: string,
    input: InvoiceWriteInput,
  ): Promise<Invoice> {
    const invoice = await this.database.invoice.create({
      data: {
        workspaceId,
        createdById,
        number: input.number,
        customerId: input.customerId ?? null,
        customerName: input.customerName,
        email: input.email,
        address: input.address ?? null,
        issuedAt: input.issuedAt,
        dueAt: input.dueAt ?? null,
        currency: input.currency,
        discount: new Prisma.Decimal(input.discount),
        subtotal: new Prisma.Decimal(input.subtotal),
        total: new Prisma.Decimal(input.total),
        items: { create: input.items.map(lineData) },
      },
      select: invoiceSelect,
    });
    return toInvoice(invoice);
  }

  async update(
    workspaceId: string,
    invoiceId: string,
    changes: InvoiceChanges,
  ): Promise<Invoice | null> {
    return this.database.$transaction(async (transaction) => {
      const existing = await transaction.invoice.findFirst({
        where: { id: invoiceId, workspaceId },
        select: { id: true },
      });
      if (!existing) return null;

      await transaction.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(changes.customerId === undefined ? {} : { customerId: changes.customerId }),
          ...(changes.customerName === undefined ? {} : { customerName: changes.customerName }),
          ...(changes.email === undefined ? {} : { email: changes.email }),
          ...(changes.address === undefined ? {} : { address: changes.address }),
          ...(changes.issuedAt === undefined ? {} : { issuedAt: changes.issuedAt }),
          ...(changes.dueAt === undefined ? {} : { dueAt: changes.dueAt }),
          ...(changes.currency === undefined ? {} : { currency: changes.currency }),
          ...(changes.discount === undefined
            ? {}
            : { discount: new Prisma.Decimal(changes.discount) }),
          ...(changes.subtotal === undefined
            ? {}
            : { subtotal: new Prisma.Decimal(changes.subtotal) }),
          ...(changes.total === undefined ? {} : { total: new Prisma.Decimal(changes.total) }),
        },
      });

      if (changes.items) {
        await transaction.invoiceItem.deleteMany({ where: { invoiceId } });
        await transaction.invoiceItem.createMany({
          data: changes.items.map((item) => ({ invoiceId, ...lineData(item) })),
        });
      }

      const invoice = await transaction.invoice.findUnique({
        where: { id: invoiceId },
        select: invoiceSelect,
      });
      return invoice ? toInvoice(invoice) : null;
    });
  }

  async updateStatus(
    workspaceId: string,
    invoiceId: string,
    status: InvoiceStatusValue,
  ): Promise<Invoice | null> {
    const updated = await this.database.invoice.updateMany({
      where: { id: invoiceId, workspaceId },
      data: { status: publicToDatabaseStatus[status] },
    });
    return updated.count === 1 ? this.findById(workspaceId, invoiceId) : null;
  }

  async updateFavorite(
    workspaceId: string,
    invoiceId: string,
    favorite: boolean,
  ): Promise<Invoice | null> {
    const updated = await this.database.invoice.updateMany({
      where: { id: invoiceId, workspaceId },
      data: { favorite },
    });
    return updated.count === 1 ? this.findById(workspaceId, invoiceId) : null;
  }

  async delete(workspaceId: string, invoiceId: string): Promise<boolean> {
    const deleted = await this.database.invoice.deleteMany({
      where: { id: invoiceId, workspaceId },
    });
    return deleted.count === 1;
  }
}
