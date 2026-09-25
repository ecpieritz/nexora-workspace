import { prisma } from '../../database/prisma.js';
import { InvoiceStatus, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  DashboardInvoiceStatus,
  DashboardRange,
  DashboardRepository,
  DashboardSource,
} from './dashboard.types.js';

const databaseToPublicStatus: Record<InvoiceStatus, DashboardInvoiceStatus> = {
  [InvoiceStatus.COMPLETE]: 'complete',
  [InvoiceStatus.PENDING]: 'pending',
  [InvoiceStatus.CANCELLED]: 'cancelled',
};

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async getSource(workspaceId: string, range: DashboardRange): Promise<DashboardSource> {
    const [products, customerCount, invoices] = await this.database.$transaction([
      this.database.product.aggregate({
        where: { workspaceId, active: true },
        _count: { _all: true },
        _sum: { stock: true },
      }),
      this.database.customer.count({ where: { workspaceId } }),
      this.database.invoice.findMany({
        where: {
          workspaceId,
          currency: range.currency,
          issuedAt: { gte: range.from, lte: range.to },
        },
        select: {
          id: true,
          number: true,
          customerName: true,
          issuedAt: true,
          status: true,
          currency: true,
          total: true,
          items: {
            select: {
              id: true,
              productId: true,
              description: true,
              unitPrice: true,
              quantity: true,
              amount: true,
              product: { select: { name: true } },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
      }),
    ]);

    return {
      products: { count: products._count._all, stock: products._sum.stock ?? 0 },
      customerCount,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        customerName: invoice.customerName,
        issuedAt: invoice.issuedAt,
        status: databaseToPublicStatus[invoice.status],
        currency: invoice.currency,
        total: invoice.total.toNumber(),
        items: invoice.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? null,
          description: item.description,
          unitPrice: item.unitPrice.toNumber(),
          quantity: item.quantity,
          amount: item.amount.toNumber(),
        })),
      })),
    };
  }
}
