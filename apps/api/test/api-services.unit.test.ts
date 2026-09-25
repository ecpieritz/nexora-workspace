import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AuthPrincipal } from '../src/features/auth/index.js';
import {
  CustomerService,
  type Customer,
  type CustomerListOptions,
  type CustomerRepository,
} from '../src/features/customers/index.js';
import {
  DashboardService,
  type DashboardRange,
  type DashboardRepository,
} from '../src/features/dashboard/index.js';
import {
  InvoiceService,
  type Invoice,
  type InvoiceChanges,
  type InvoiceRepository,
} from '../src/features/invoices/index.js';
import {
  ProductService,
  type Product,
  type ProductRepository,
} from '../src/features/products/index.js';
import {
  ScheduleService,
  type CalendarEventOptions,
  type ScheduleEntry,
  type ScheduleRepository,
} from '../src/features/schedules/index.js';
import {
  TaskService,
  type TaskListOptions,
  type TaskRepository,
  type WorkspaceTask,
} from '../src/features/tasks/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000001';
const principal: AuthPrincipal = {
  userId,
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId,
  role: WorkspaceRole.OWNER,
};

const customer: Customer = {
  id: '40000000-0000-4000-8000-000000000001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+55 85 99999-9999',
  gender: 'male',
  role: 'Designer',
  address: 'Fortaleza, CE',
  performance: [],
  satisfaction: 0,
  retention: 0,
  color: '#625df5',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const product: Product = {
  id: '50000000-0000-4000-8000-000000000001',
  sku: 'NXR-001',
  name: 'Nexora Book',
  brand: 'Nexora',
  category: 'Computers',
  description: 'Portable computer for productive teams.',
  price: 1200,
  negotiable: false,
  stock: 10,
  active: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const invoice: Invoice = {
  id: '60000000-0000-4000-8000-000000000001',
  number: 'INV-2026-0001',
  customerId: null,
  customerName: 'John Doe',
  email: 'john@example.com',
  address: null,
  issuedAt: '2026-08-10T10:00:00.000Z',
  dueAt: '2026-08-20T10:00:00.000Z',
  status: 'pending',
  favorite: false,
  currency: 'USD',
  discount: 0,
  subtotal: 39.98,
  total: 39.98,
  items: [
    {
      id: '61000000-0000-4000-8000-000000000001',
      productId: null,
      description: 'Consulting',
      rate: 19.99,
      quantity: 2,
      amount: 39.98,
    },
  ],
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const schedule: ScheduleEntry = {
  id: '70000000-0000-4000-8000-000000000001',
  organizerId: userId,
  organizer: { id: userId, name: 'Owner', email: 'owner@nexora.app', avatarUrl: null },
  title: 'Planning',
  description: null,
  location: null,
  kind: 'event',
  startsAt: '2026-08-10T10:00:00.000Z',
  endsAt: '2026-08-10T11:00:00.000Z',
  attendeeIds: [],
  attendees: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const task: WorkspaceTask = {
  id: '80000000-0000-4000-8000-000000000001',
  createdById: userId,
  name: 'API tests',
  description: null,
  category: 'development',
  startsAt: '2026-08-10T10:00:00.000Z',
  dueAt: '2026-08-12T10:00:00.000Z',
  status: 'todo',
  assigneeIds: [],
  assignees: [],
  memberCount: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

void describe('API service units', () => {
  void it('scopes customer lists to the principal workspace and calculates pagination metadata', async () => {
    let receivedWorkspace = '';
    let receivedOptions: CustomerListOptions | undefined;
    const repository: CustomerRepository = {
      list(workspace, options) {
        receivedWorkspace = workspace;
        receivedOptions = options;
        return Promise.resolve({ items: [customer], total: 21 });
      },
      findById: () => Promise.resolve(customer),
      create: () => Promise.resolve(customer),
      update: () => Promise.resolve(customer),
      delete: () => Promise.resolve(true),
    };

    const result = await new CustomerService(repository).list(principal, {
      page: 2,
      limit: 10,
      search: 'john',
      gender: 'male',
      sort: 'name',
      order: 'asc',
    });

    assert.equal(receivedWorkspace, workspaceId);
    assert.deepEqual(receivedOptions, {
      page: 2,
      limit: 10,
      search: 'john',
      gender: 'male',
      sort: 'name',
      order: 'asc',
    });
    assert.deepEqual(result.meta, { page: 2, limit: 10, total: 21, totalPages: 3 });
  });

  void it('maps missing product reads, updates and deletes to not-found errors', async () => {
    const repository: ProductRepository = {
      list: () => Promise.resolve({ items: [], total: 0 }),
      findById: () => Promise.resolve(null),
      create: () => Promise.resolve(product),
      update: () => Promise.resolve(null),
      delete: () => Promise.resolve(false),
      getAnalyticsSource: () => Promise.resolve({ products: [], invoiceStatuses: [] }),
    };
    const service = new ProductService(repository);

    await assert.rejects(service.get(principal, product.id), { statusCode: 404 });
    await assert.rejects(service.update(principal, product.id, { stock: 5 }), { statusCode: 404 });
    await assert.rejects(service.delete(principal, product.id), { statusCode: 404 });
  });

  void it('recalculates invoice totals without replacing unchanged line items', async () => {
    let receivedChanges: InvoiceChanges | undefined;
    const repository: InvoiceRepository = {
      list: () => Promise.resolve({ items: [], total: 0 }),
      findById: () => Promise.resolve(invoice),
      referencesExist: () => Promise.resolve(true),
      create: () => Promise.resolve(invoice),
      update(_workspace, _id, changes) {
        receivedChanges = changes;
        return Promise.resolve({ ...invoice, discount: changes.discount ?? 0, total: 35.98 });
      },
      updateStatus: () => Promise.resolve(invoice),
      updateFavorite: () => Promise.resolve(invoice),
      delete: () => Promise.resolve(true),
    };
    const service = new InvoiceService(repository);

    await service.update(principal, invoice.id, { discount: 10 });

    assert.equal(receivedChanges?.subtotal, 39.98);
    assert.equal(receivedChanges?.total, 35.98);
    assert.equal(receivedChanges?.discount, 10);
    assert.equal(receivedChanges?.items, undefined);
    await assert.rejects(
      service.update(principal, invoice.id, { issuedAt: '2026-08-21T10:00:00.000Z' }),
      { statusCode: 400 },
    );
  });

  void it('converts calendar query boundaries and rejects invalid partial schedule updates', async () => {
    let calendarOptions: CalendarEventOptions | undefined;
    const repository: ScheduleRepository = {
      list: () => Promise.resolve({ items: [], total: 0 }),
      listCalendarEvents(_workspace, options) {
        calendarOptions = options;
        return Promise.resolve([schedule]);
      },
      listPeople: () => Promise.resolve([]),
      findById: () => Promise.resolve(schedule),
      membersExist: () => Promise.resolve(true),
      create: () => Promise.resolve(schedule),
      update: () => Promise.resolve(schedule),
      delete: () => Promise.resolve(true),
    };
    const service = new ScheduleService(repository);

    await service.listCalendarEvents(principal, {
      from: '2026-08-01',
      to: '2026-08-31',
      kind: 'event',
    });

    assert.equal(calendarOptions?.from.toISOString(), '2026-08-01T00:00:00.000Z');
    assert.equal(calendarOptions?.to.toISOString(), '2026-08-31T23:59:59.999Z');
    assert.equal(calendarOptions?.kind, 'event');
    await assert.rejects(
      service.update(principal, schedule.id, { startsAt: '2026-08-10T12:00:00.000Z' }),
      { statusCode: 400 },
    );
  });

  void it('converts task timeline ranges and validates dates against persisted values', async () => {
    let listOptions: TaskListOptions | undefined;
    const repository: TaskRepository = {
      list(_workspace, options) {
        listOptions = options;
        return Promise.resolve({ items: [task], total: 1 });
      },
      listPeople: () => Promise.resolve([]),
      findById: () => Promise.resolve(task),
      membersExist: () => Promise.resolve(true),
      create: () => Promise.resolve(task),
      update: () => Promise.resolve(task),
      updateStatus: () => Promise.resolve(task),
      delete: () => Promise.resolve(true),
    };
    const service = new TaskService(repository);

    await service.list(principal, {
      page: 1,
      limit: 20,
      from: '2026-08-01',
      to: '2026-08-31',
      sort: 'dueAt',
      order: 'asc',
    });

    assert.equal(listOptions?.from?.toISOString(), '2026-08-01T00:00:00.000Z');
    assert.equal(listOptions?.to?.toISOString(), '2026-08-31T23:59:59.999Z');
    await assert.rejects(
      service.update(principal, task.id, { startsAt: '2026-08-13T10:00:00.000Z' }),
      { statusCode: 400 },
    );
  });

  void it('returns stable zero-value dashboard reports for an empty workspace period', async () => {
    let receivedRange: DashboardRange | undefined;
    const repository: DashboardRepository = {
      getSource(_workspace, range) {
        receivedRange = range;
        return Promise.resolve({
          products: { count: 0, stock: 0 },
          customerCount: 0,
          invoices: [],
        });
      },
    };
    const service = new DashboardService(repository);
    const reports = await service.reports(principal, {
      from: '2026-08-01',
      to: '2026-08-03',
      currency: 'USD',
      interval: 'day',
      recentLimit: 4,
      productLimit: 5,
    });

    assert.equal(receivedRange?.currency, 'USD');
    assert.equal(reports.data.sales.total, 0);
    assert.equal(reports.data.sales.averageOrderValue, 0);
    assert.deepEqual(
      reports.data.sales.series.map(({ value }) => value),
      [0, 0, 0],
    );
    assert.equal(reports.data.transactions.completionRate, 0);
    assert.deepEqual(
      reports.data.transactions.segments.map(({ percentage }) => percentage),
      [0, 0, 0],
    );
    assert.deepEqual(reports.data.recentOrders, []);
    assert.deepEqual(reports.data.topProducts, []);
  });
});
