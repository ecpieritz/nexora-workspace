import { randomUUID } from 'node:crypto';

import { ApiError } from '../../errors/api-error.js';
import type { AuthPrincipal } from '../auth/index.js';
import type {
  CreateInvoiceInput,
  InvoiceListQuery,
  UpdateInvoiceInput,
} from './invoice.schemas.js';
import type {
  Invoice,
  InvoiceChanges,
  InvoiceLineWriteInput,
  InvoiceListOptions,
  InvoiceRepository,
  InvoiceStatusValue,
} from './invoice.types.js';

export interface InvoiceListResult {
  data: Invoice[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface InvoiceManagementService {
  list(principal: AuthPrincipal, query: InvoiceListQuery): Promise<InvoiceListResult>;
  get(principal: AuthPrincipal, invoiceId: string): Promise<Invoice>;
  create(principal: AuthPrincipal, input: CreateInvoiceInput): Promise<Invoice>;
  update(principal: AuthPrincipal, invoiceId: string, input: UpdateInvoiceInput): Promise<Invoice>;
  updateStatus(
    principal: AuthPrincipal,
    invoiceId: string,
    status: InvoiceStatusValue,
  ): Promise<Invoice>;
  updateFavorite(principal: AuthPrincipal, invoiceId: string, favorite: boolean): Promise<Invoice>;
  delete(principal: AuthPrincipal, invoiceId: string): Promise<void>;
}

type LineInput = CreateInvoiceInput['items'][number];

function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

function calculateAmounts(lines: LineInput[], discount: number) {
  const items: InvoiceLineWriteInput[] = lines.map((line) => {
    const amountInCents = toCents(line.rate) * line.quantity;
    return {
      description: line.description,
      rate: line.rate,
      quantity: line.quantity,
      amount: amountInCents / 100,
      ...(line.productId === undefined ? {} : { productId: line.productId }),
    };
  });
  const subtotalInCents = items.reduce((sum, item) => sum + toCents(item.amount), 0);
  const discountBasisPoints = Math.round(discount * 100);
  const totalInCents = Math.round((subtotalInCents * (10_000 - discountBasisPoints)) / 10_000);
  if (!Number.isSafeInteger(subtotalInCents) || subtotalInCents > 99_999_999_999_999) {
    throw ApiError.badRequest('Invoice total exceeds the supported monetary limit.');
  }
  return { items, subtotal: subtotalInCents / 100, total: totalInCents / 100 };
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function createInvoiceNumber(): string {
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

export class InvoiceService implements InvoiceManagementService {
  constructor(private readonly repository: InvoiceRepository) {}

  async list(principal: AuthPrincipal, query: InvoiceListQuery): Promise<InvoiceListResult> {
    const options: InvoiceListOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.favorite === undefined ? {} : { favorite: query.favorite }),
      ...(query.from === undefined ? {} : { from: startOfDay(query.from) }),
      ...(query.to === undefined ? {} : { to: endOfDay(query.to) }),
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

  async get(principal: AuthPrincipal, invoiceId: string): Promise<Invoice> {
    const invoice = await this.repository.findById(principal.workspaceId, invoiceId);
    if (!invoice) throw ApiError.notFound('Invoice was not found.');
    return invoice;
  }

  async create(principal: AuthPrincipal, input: CreateInvoiceInput): Promise<Invoice> {
    await this.assertReferences(principal.workspaceId, input.customerId, input.items);
    const amounts = calculateAmounts(input.items, input.discount);
    return this.repository.create(principal.workspaceId, principal.userId, {
      number: createInvoiceNumber(),
      customerName: input.customerName,
      email: input.email,
      issuedAt: new Date(input.issuedAt),
      currency: input.currency,
      discount: input.discount,
      ...amounts,
      ...(input.customerId === undefined ? {} : { customerId: input.customerId }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.dueAt === undefined
        ? {}
        : { dueAt: input.dueAt === null ? null : new Date(input.dueAt) }),
    });
  }

  async update(
    principal: AuthPrincipal,
    invoiceId: string,
    input: UpdateInvoiceInput,
  ): Promise<Invoice> {
    const existing = await this.get(principal, invoiceId);
    const issuedAt = input.issuedAt ? new Date(input.issuedAt) : new Date(existing.issuedAt);
    const dueAt =
      input.dueAt === undefined
        ? existing.dueAt === null
          ? null
          : new Date(existing.dueAt)
        : input.dueAt === null
          ? null
          : new Date(input.dueAt);
    if (dueAt && dueAt < issuedAt) {
      throw ApiError.badRequest('Due date must be on or after the issue date.');
    }
    const sourceLines: LineInput[] =
      input.items ??
      existing.items.map((item) => ({
        productId: item.productId,
        description: item.description,
        rate: item.rate,
        quantity: item.quantity,
      }));
    const discount = input.discount ?? existing.discount;
    await this.assertReferences(principal.workspaceId, input.customerId, sourceLines);
    const { items, ...amounts } = calculateAmounts(sourceLines, discount);
    const changes: InvoiceChanges = {
      ...amounts,
      discount,
      ...(input.customerId === undefined ? {} : { customerId: input.customerId }),
      ...(input.customerName === undefined ? {} : { customerName: input.customerName }),
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.issuedAt === undefined ? {} : { issuedAt }),
      ...(input.dueAt === undefined ? {} : { dueAt }),
      ...(input.currency === undefined ? {} : { currency: input.currency }),
      ...(input.items === undefined ? {} : { items }),
    };
    const invoice = await this.repository.update(principal.workspaceId, invoiceId, changes);
    if (!invoice) throw ApiError.notFound('Invoice was not found.');
    return invoice;
  }

  async updateStatus(
    principal: AuthPrincipal,
    invoiceId: string,
    status: InvoiceStatusValue,
  ): Promise<Invoice> {
    const invoice = await this.repository.updateStatus(principal.workspaceId, invoiceId, status);
    if (!invoice) throw ApiError.notFound('Invoice was not found.');
    return invoice;
  }

  async updateFavorite(
    principal: AuthPrincipal,
    invoiceId: string,
    favorite: boolean,
  ): Promise<Invoice> {
    const invoice = await this.repository.updateFavorite(
      principal.workspaceId,
      invoiceId,
      favorite,
    );
    if (!invoice) throw ApiError.notFound('Invoice was not found.');
    return invoice;
  }

  async delete(principal: AuthPrincipal, invoiceId: string): Promise<void> {
    const deleted = await this.repository.delete(principal.workspaceId, invoiceId);
    if (!deleted) throw ApiError.notFound('Invoice was not found.');
  }

  private async assertReferences(
    workspaceId: string,
    customerId: string | null | undefined,
    lines: LineInput[],
  ): Promise<void> {
    const referencesExist = await this.repository.referencesExist(workspaceId, {
      ...(customerId === undefined ? {} : { customerId }),
      productIds: lines.flatMap((line) => (line.productId ? [line.productId] : [])),
    });
    if (!referencesExist) {
      throw ApiError.badRequest('Customer and products must belong to the active workspace.');
    }
  }
}
