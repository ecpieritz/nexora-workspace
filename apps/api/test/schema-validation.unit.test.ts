import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dashboardMetricsQuerySchema,
  dashboardReportsQuerySchema,
} from '../src/features/dashboard/index.js';
import {
  createCustomerBodySchema,
  customerListQuerySchema,
  updateCustomerBodySchema,
} from '../src/features/customers/index.js';
import {
  createInvoiceBodySchema,
  invoiceListQuerySchema,
  updateInvoiceBodySchema,
} from '../src/features/invoices/index.js';
import {
  createProductBodySchema,
  productAnalyticsQuerySchema,
  productListQuerySchema,
  updateProductBodySchema,
} from '../src/features/products/index.js';
import {
  calendarEventQuerySchema,
  createScheduleBodySchema,
  updateScheduleBodySchema,
} from '../src/features/schedules/index.js';
import {
  createTaskBodySchema,
  taskListQuerySchema,
  updateTaskBodySchema,
} from '../src/features/tasks/index.js';
import { idParamsSchema, paginationQuerySchema } from '../src/validation/index.js';

const firstMemberId = '30000000-0000-4000-8000-000000000001';
const secondMemberId = '30000000-0000-4000-8000-000000000002';

void describe('API schema validation units', () => {
  void it('coerces pagination values, applies defaults and rejects invalid identifiers', () => {
    assert.deepEqual(paginationQuerySchema.parse({}), { page: 1, limit: 20 });
    assert.deepEqual(paginationQuerySchema.parse({ page: '2', limit: '50' }), {
      page: 2,
      limit: 50,
    });
    assert.equal(paginationQuerySchema.safeParse({ page: 0, limit: 101 }).success, false);
    assert.equal(idParamsSchema.safeParse({ id: 'not-a-uuid' }).success, false);
    assert.equal(idParamsSchema.safeParse({ id: firstMemberId, extra: true }).success, false);
  });

  void it('normalizes customer input and enforces strict partial updates', () => {
    const customer = createCustomerBodySchema.parse({
      firstName: '  John ',
      lastName: ' Doe  ',
      email: 'JOHN@EXAMPLE.COM',
      phone: ' +55 85 99999-9999 ',
      gender: 'male',
      role: ' Designer ',
      address: ' Fortaleza, CE ',
    });

    assert.deepEqual(customer, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+55 85 99999-9999',
      gender: 'male',
      role: 'Designer',
      address: 'Fortaleza, CE',
    });
    assert.equal(updateCustomerBodySchema.safeParse({}).success, false);
    assert.equal(updateCustomerBodySchema.safeParse({ fullName: 'Not allowed' }).success, false);
    assert.deepEqual(customerListQuerySchema.parse({ search: '  john  ' }), {
      page: 1,
      limit: 20,
      search: 'john',
      sort: 'name',
      order: 'asc',
    });
  });

  void it('normalizes product defaults and validates analytics ranges', () => {
    const product = createProductBodySchema.parse({
      sku: ' nxr-001 ',
      name: ' Nexora Book ',
      brand: ' Nexora ',
      category: ' Computers ',
      description: ' A portable computer for productive teams. ',
      price: 1200,
    });

    assert.equal(product.sku, 'NXR-001');
    assert.equal(product.negotiable, false);
    assert.equal(product.stock, 0);
    assert.equal(product.active, true);
    assert.equal(updateProductBodySchema.safeParse({}).success, false);
    assert.equal(
      productAnalyticsQuerySchema.safeParse({ from: '2026-04-01', to: '2026-03-31' }).success,
      false,
    );
    assert.deepEqual(productListQuerySchema.parse({ active: 'false', sort: 'price' }), {
      page: 1,
      limit: 20,
      active: false,
      sort: 'price',
      order: 'asc',
    });
  });

  void it('validates invoice defaults, monetary inputs and date order', () => {
    const invoice = createInvoiceBodySchema.parse({
      customerName: '  John Doe ',
      email: 'JOHN@EXAMPLE.COM',
      issuedAt: '2026-08-10T10:00:00.000Z',
      dueAt: '2026-08-20T10:00:00.000Z',
      items: [{ description: ' Consulting ', rate: 19.99, quantity: 2 }],
    });

    assert.equal(invoice.customerName, 'John Doe');
    assert.equal(invoice.email, 'john@example.com');
    assert.equal(invoice.currency, 'USD');
    assert.equal(invoice.discount, 0);
    assert.equal(invoice.items[0]?.description, 'Consulting');
    assert.equal(
      createInvoiceBodySchema.safeParse({
        ...invoice,
        issuedAt: '2026-08-20T10:00:00.000Z',
        dueAt: '2026-08-10T10:00:00.000Z',
      }).success,
      false,
    );
    assert.equal(updateInvoiceBodySchema.safeParse({}).success, false);
    assert.deepEqual(invoiceListQuerySchema.parse({ favorite: 'true', status: 'pending' }), {
      page: 1,
      limit: 20,
      favorite: true,
      status: 'pending',
      sort: 'issuedAt',
      order: 'desc',
    });
  });

  void it('rejects duplicate schedule attendees and invalid event ranges', () => {
    const validSchedule = {
      title: 'Planning session',
      startsAt: '2026-08-10T10:00:00.000Z',
      endsAt: '2026-08-10T11:00:00.000Z',
      attendeeIds: [firstMemberId, secondMemberId],
    };

    assert.deepEqual(createScheduleBodySchema.parse(validSchedule), {
      ...validSchedule,
      kind: 'event',
    });
    assert.equal(
      createScheduleBodySchema.safeParse({
        ...validSchedule,
        attendeeIds: [firstMemberId, firstMemberId],
      }).success,
      false,
    );
    assert.equal(
      createScheduleBodySchema.safeParse({
        ...validSchedule,
        endsAt: validSchedule.startsAt,
      }).success,
      false,
    );
    assert.equal(updateScheduleBodySchema.safeParse({}).success, false);
    assert.equal(
      calendarEventQuerySchema.safeParse({ from: '2026-01-01', to: '2027-12-31' }).success,
      false,
    );
  });

  void it('validates task assignments, dates and list filters', () => {
    const validTask = {
      name: 'Build API tests',
      category: 'development',
      startsAt: '2026-08-10T10:00:00.000Z',
      dueAt: '2026-08-12T10:00:00.000Z',
      assigneeIds: [firstMemberId],
    };

    assert.deepEqual(createTaskBodySchema.parse(validTask), { ...validTask, status: 'todo' });
    assert.equal(
      createTaskBodySchema.safeParse({
        ...validTask,
        assigneeIds: [firstMemberId, firstMemberId],
      }).success,
      false,
    );
    assert.equal(
      createTaskBodySchema.safeParse({ ...validTask, dueAt: '2026-08-09T10:00:00.000Z' }).success,
      false,
    );
    assert.equal(updateTaskBodySchema.safeParse({}).success, false);
    assert.deepEqual(taskListQuerySchema.parse({ status: 'doing', category: 'development' }), {
      page: 1,
      limit: 20,
      status: 'doing',
      category: 'development',
      sort: 'dueAt',
      order: 'asc',
    });
  });

  void it('normalizes dashboard controls and bounds reporting periods', () => {
    assert.deepEqual(dashboardMetricsQuerySchema.parse({ currency: ' brl ' }), {
      currency: 'BRL',
    });
    assert.deepEqual(dashboardReportsQuerySchema.parse({ recentLimit: '8', productLimit: '3' }), {
      currency: 'USD',
      interval: 'week',
      recentLimit: 8,
      productLimit: 3,
    });
    assert.equal(
      dashboardReportsQuerySchema.safeParse({ from: '2026-01-01', to: '2027-12-31' }).success,
      false,
    );
    assert.equal(dashboardReportsQuerySchema.safeParse({ recentLimit: 21 }).success, false);
  });
});
