import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

import {
  CustomerGender,
  InvoiceStatus,
  Prisma,
  PrismaClient,
  ScheduleKind,
  TaskCategory,
  TaskStatus,
  WorkspaceRole,
} from '../src/generated/prisma/client.js';

const defaultDatabaseUrl = 'postgresql://nexora:nexora@localhost:5432/nexora';
const demoPassword = 'Nexora123!';

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  users: {
    emilyn: '20000000-0000-4000-8000-000000000001',
    eddie: '20000000-0000-4000-8000-000000000002',
    alexey: '20000000-0000-4000-8000-000000000003',
    anton: '20000000-0000-4000-8000-000000000004',
    maya: '20000000-0000-4000-8000-000000000005',
    james: '20000000-0000-4000-8000-000000000006',
  },
  members: {
    emilyn: '30000000-0000-4000-8000-000000000001',
    eddie: '30000000-0000-4000-8000-000000000002',
    alexey: '30000000-0000-4000-8000-000000000003',
    anton: '30000000-0000-4000-8000-000000000004',
    maya: '30000000-0000-4000-8000-000000000005',
    james: '30000000-0000-4000-8000-000000000006',
  },
} as const;

const demoUsers = [
  {
    id: ids.users.emilyn,
    email: 'demo@nexora.app',
    username: 'emilyn',
    fullName: 'Emilyn Pieritz',
    displayName: 'Emilyn',
    role: WorkspaceRole.OWNER,
  },
  {
    id: ids.users.eddie,
    email: 'lobanovskiy@gmail.com',
    username: 'eddie.lobanovskiy',
    fullName: 'Eddie Lobanovskiy',
    displayName: 'Eddie',
    role: WorkspaceRole.ADMIN,
  },
  {
    id: ids.users.alexey,
    email: 'alexey@gmail.com',
    username: 'alexey.stave',
    fullName: 'Alexey Stave',
    displayName: 'Alexey',
    role: WorkspaceRole.MEMBER,
  },
  {
    id: ids.users.anton,
    email: 'tkacheveanton@gmail.com',
    username: 'anton.tkacheve',
    fullName: 'Anton Tkacheve',
    displayName: 'Anton',
    role: WorkspaceRole.MEMBER,
  },
  {
    id: ids.users.maya,
    email: 'maya@nexora.app',
    username: 'maya.chen',
    fullName: 'Maya Chen',
    displayName: 'Maya',
    role: WorkspaceRole.MEMBER,
  },
  {
    id: ids.users.james,
    email: 'james@nexora.app',
    username: 'james.mullican',
    fullName: 'James Mullican',
    displayName: 'James',
    role: WorkspaceRole.MEMBER,
  },
] as const;

const customers = [
  [
    '40000000-0000-4000-8000-000000000001',
    'John',
    'Deo',
    'johndeo2211@gmail.com',
    '+33 757 005 4167',
    CustomerGender.MALE,
    'UI/UX Designer',
    '2239 Hog Camp Road, Schaumburg',
    [28, 42, 68, 35, 54, 79],
    70,
    60,
    '#87a8ff',
  ],
  [
    '40000000-0000-4000-8000-000000000002',
    'Shelby',
    'Goode',
    'shelbygoode481@gmail.com',
    '+33 757 005 4567',
    CustomerGender.FEMALE,
    'Product Designer',
    '148 Design Avenue, Paris',
    [38, 54, 46, 72, 61, 85],
    84,
    76,
    '#ff9da8',
  ],
  [
    '40000000-0000-4000-8000-000000000003',
    'Robert',
    'Bacins',
    'robertbacins4182@co.com',
    '+33 757 005 4167',
    CustomerGender.MALE,
    'Frontend Developer',
    '35 Angular Street, Lyon',
    [32, 49, 58, 63, 70, 81],
    78,
    73,
    '#f1c66a',
  ],
  [
    '40000000-0000-4000-8000-000000000004',
    'John',
    'Carilo',
    'johncarilo182@co.com',
    '+33 757 005 4167',
    CustomerGender.MALE,
    'Project Manager',
    '806 Market Road, Lille',
    [55, 48, 67, 59, 82, 74],
    81,
    68,
    '#72c7ca',
  ],
  [
    '40000000-0000-4000-8000-000000000005',
    'Adriene',
    'Watson',
    'adrienewatson82@co.com',
    '+83 757 305 4167',
    CustomerGender.FEMALE,
    'Business Analyst',
    '91 Discovery Lane, Nice',
    [29, 44, 61, 57, 76, 89],
    88,
    80,
    '#c59be9',
  ],
  [
    '40000000-0000-4000-8000-000000000006',
    'Mark',
    'Ruffalo',
    'markruffalo3735@co.com',
    '+33 757 005 4167',
    CustomerGender.MALE,
    'Sales Manager',
    '74 Commerce Boulevard, Rouen',
    [45, 62, 51, 70, 66, 83],
    75,
    71,
    '#7cb9a8',
  ],
  [
    '40000000-0000-4000-8000-000000000007',
    'Bethany',
    'Jackson',
    'bethanyjackson5@co.com',
    '+33 757 005 4167',
    CustomerGender.FEMALE,
    'Marketing Lead',
    '16 Campaign Street, Dijon',
    [40, 53, 65, 75, 69, 90],
    91,
    86,
    '#ed9e85',
  ],
  [
    '40000000-0000-4000-8000-000000000008',
    'Christine',
    'Huston',
    'christinehuston4@co.com',
    '+33 757 005 4167',
    CustomerGender.FEMALE,
    'UX Researcher',
    '402 Research Way, Bordeaux',
    [36, 47, 59, 72, 80, 87],
    86,
    79,
    '#d3aa70',
  ],
] as const;

const products = [
  [
    '50000000-0000-4000-8000-000000000001',
    'NXR-AUD-001',
    'Bluetooth Devices',
    'Nexora Audio',
    'Audio',
    '10.00',
    180,
  ],
  [
    '50000000-0000-4000-8000-000000000002',
    'NXR-AUD-002',
    'AirPods',
    'Apple',
    'Audio',
    '15.00',
    125,
  ],
  [
    '50000000-0000-4000-8000-000000000003',
    'NXR-FAS-001',
    'Running Shoes',
    'Nexora Active',
    'Fashion',
    '10.00',
    240,
  ],
  [
    '50000000-0000-4000-8000-000000000004',
    'NXR-FAS-002',
    "Kids' T-Shirt",
    'Nexora Kids',
    'Fashion',
    '12.00',
    95,
  ],
  [
    '50000000-0000-4000-8000-000000000005',
    'NXR-WEA-001',
    'Smart Watch',
    'Nexora Tech',
    'Wearables',
    '12.00',
    150,
  ],
] as const;

const invoices = [
  [
    '60000000-0000-4000-8000-000000000001',
    '876364',
    'Aurora Gaur',
    'auroragaur@gmail.com',
    '2026-07-12',
    InvoiceStatus.COMPLETE,
    true,
    0,
    '900.00',
  ],
  [
    '60000000-0000-4000-8000-000000000002',
    '876123',
    'James Mullican',
    'jamesmullican@gmail.com',
    '2026-07-10',
    InvoiceStatus.PENDING,
    true,
    5,
    '300.00',
  ],
  [
    '60000000-0000-4000-8000-000000000003',
    '876213',
    'Robert Bacins',
    'robertbacins@gmail.com',
    '2026-07-09',
    InvoiceStatus.COMPLETE,
    false,
    0,
    '480.00',
  ],
  [
    '60000000-0000-4000-8000-000000000004',
    '876987',
    'Bethany Jackson',
    'bethanyjackson@gmail.com',
    '2026-07-09',
    InvoiceStatus.CANCELLED,
    false,
    0,
    '250.00',
  ],
  [
    '60000000-0000-4000-8000-000000000005',
    '871345',
    'Anne Jacob',
    'annejacob@gmail.com',
    '2026-07-08',
    InvoiceStatus.COMPLETE,
    false,
    10,
    '720.00',
  ],
  [
    '60000000-0000-4000-8000-000000000006',
    '872345',
    'Bethany Jackson',
    'bethany.jackson@gmail.com',
    '2026-07-06',
    InvoiceStatus.PENDING,
    true,
    0,
    '360.00',
  ],
  [
    '60000000-0000-4000-8000-000000000007',
    '872346',
    'James Mullican',
    'james.m@example.com',
    '2026-07-05',
    InvoiceStatus.COMPLETE,
    false,
    0,
    '1500.00',
  ],
  [
    '60000000-0000-4000-8000-000000000008',
    '873245',
    'Jhon Deo',
    'jhondeo32@gmail.com',
    '2026-07-04',
    InvoiceStatus.COMPLETE,
    true,
    5,
    '885.00',
  ],
  [
    '60000000-0000-4000-8000-000000000009',
    '876354',
    'Bethany Jackson',
    'bethany@example.com',
    '2026-07-02',
    InvoiceStatus.CANCELLED,
    true,
    0,
    '420.00',
  ],
  [
    '60000000-0000-4000-8000-000000000010',
    '878769',
    'James Mullican',
    'james.work@example.com',
    '2026-07-01',
    InvoiceStatus.PENDING,
    false,
    0,
    '1200.00',
  ],
] as const;

const tasks = [
  [
    '70000000-0000-4000-8000-000000000001',
    'UI design',
    TaskCategory.DESIGN,
    '2026-08-03',
    '2026-08-05',
    TaskStatus.TODO,
    5,
  ],
  [
    '70000000-0000-4000-8000-000000000002',
    'Logo design',
    TaskCategory.DESIGN,
    '2026-08-03',
    '2026-08-05',
    TaskStatus.TODO,
    3,
  ],
  [
    '70000000-0000-4000-8000-000000000003',
    'Graphic design',
    TaskCategory.DESIGN,
    '2026-08-02',
    '2026-08-06',
    TaskStatus.DOING,
    4,
  ],
  [
    '70000000-0000-4000-8000-000000000004',
    'Web development',
    TaskCategory.DEVELOPMENT,
    '2026-08-01',
    '2026-08-08',
    TaskStatus.DOING,
    6,
  ],
  [
    '70000000-0000-4000-8000-000000000005',
    'User research',
    TaskCategory.RESEARCH,
    '2026-07-28',
    '2026-08-02',
    TaskStatus.DONE,
    2,
  ],
  [
    '70000000-0000-4000-8000-000000000006',
    'Design system',
    TaskCategory.DESIGN,
    '2026-07-25',
    '2026-08-01',
    TaskStatus.DONE,
    5,
  ],
] as const;

const schedules = [
  [
    '80000000-0000-4000-8000-000000000001',
    'Product planning',
    '2026-08-12T10:15:00.000Z',
    'Office meeting',
    ['eddie', 'alexey'],
  ],
  [
    '80000000-0000-4000-8000-000000000002',
    'Design critique',
    '2026-08-10T11:20:00.000Z',
    'Home',
    ['alexey', 'maya'],
  ],
  [
    '80000000-0000-4000-8000-000000000003',
    'Customer interview',
    '2026-08-09T11:45:00.000Z',
    'Friends zone',
    ['anton'],
  ],
  [
    '80000000-0000-4000-8000-000000000004',
    'Sprint review',
    '2026-08-08T12:15:00.000Z',
    'Office meeting',
    ['eddie', 'anton', 'maya'],
  ],
  [
    '80000000-0000-4000-8000-000000000005',
    'Roadmap sync',
    '2026-08-07T13:20:00.000Z',
    'Home',
    ['maya'],
  ],
  [
    '80000000-0000-4000-8000-000000000006',
    'Team workshop',
    '2026-08-05T10:15:00.000Z',
    'Meeting outside',
    ['eddie', 'alexey', 'anton'],
  ],
  [
    '80000000-0000-4000-8000-000000000007',
    'Weekly check-in',
    '2026-08-04T11:15:00.000Z',
    'Office meeting',
    ['eddie'],
  ],
  [
    '80000000-0000-4000-8000-000000000008',
    'Project kickoff',
    '2026-08-02T10:15:00.000Z',
    'Friends',
    ['alexey', 'anton'],
  ],
] as const;

function atMidnight(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

async function seedDatabase(tx: Prisma.TransactionClient, passwordHash: string): Promise<void> {
  for (const user of demoUsers) {
    const profile = {
      email: user.email,
      username: user.username,
      passwordHash,
      fullName: user.fullName,
      displayName: user.displayName,
      language: 'en',
      timezone: 'America/Fortaleza',
      dateFormat: 'MM/dd/yyyy',
      currency: 'USD',
      emailVerifiedAt: new Date('2026-01-01T12:00:00.000Z'),
    };

    await tx.user.upsert({
      where: { email: user.email },
      update: profile,
      create: { id: user.id, ...profile },
    });
  }

  await tx.workspace.upsert({
    where: { slug: 'nexora-demo' },
    update: { name: 'Nexora Demo Workspace', ownerId: ids.users.emilyn },
    create: {
      id: ids.workspace,
      name: 'Nexora Demo Workspace',
      slug: 'nexora-demo',
      ownerId: ids.users.emilyn,
    },
  });

  for (const user of demoUsers) {
    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: ids.workspace, userId: user.id } },
      update: { role: user.role },
      create: {
        id: ids.members[user.username.split('.')[0] as keyof typeof ids.members],
        workspaceId: ids.workspace,
        userId: user.id,
        role: user.role,
      },
    });
  }

  for (const customer of customers) {
    const [
      id,
      firstName,
      lastName,
      email,
      phone,
      gender,
      role,
      address,
      performance,
      satisfaction,
      retention,
      color,
    ] = customer;
    const data = {
      createdById: ids.users.emilyn,
      firstName,
      lastName,
      phone,
      gender,
      role,
      address,
      performance: [...performance],
      satisfaction,
      retention,
      color,
    };
    await tx.customer.upsert({
      where: { workspaceId_email: { workspaceId: ids.workspace, email } },
      update: data,
      create: { id, workspaceId: ids.workspace, email, ...data },
    });
  }

  for (const product of products) {
    const [id, sku, name, brand, category, price, stock] = product;
    const data = {
      createdById: ids.users.emilyn,
      name,
      brand,
      category,
      description: `${name} from the Nexora portfolio catalog.`,
      price,
      stock,
      active: true,
    };
    await tx.product.upsert({
      where: { workspaceId_sku: { workspaceId: ids.workspace, sku } },
      update: data,
      create: { id, workspaceId: ids.workspace, sku, ...data },
    });
  }

  for (const [index, invoice] of invoices.entries()) {
    const [id, number, customerName, email, issuedAt, status, favorite, discount, subtotal] =
      invoice;
    const discountAmount = Number(subtotal) * (Number(discount) / 100);
    const total = (Number(subtotal) - discountAmount).toFixed(2);
    const product = products[index % products.length];
    if (!product) throw new Error('A seeded product is required for each invoice.');

    const data = {
      createdById: ids.users.emilyn,
      customerName,
      email,
      issuedAt: atMidnight(issuedAt),
      dueAt: new Date(`${issuedAt}T23:59:59.000Z`),
      status,
      favorite,
      currency: 'USD',
      discount,
      subtotal,
      total,
    };
    await tx.invoice.upsert({
      where: { workspaceId_number: { workspaceId: ids.workspace, number } },
      update: {
        ...data,
        items: {
          deleteMany: {},
          create: {
            id: `61000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            productId: product[0],
            description: product[2],
            unitPrice: subtotal,
            quantity: 1,
            amount: subtotal,
          },
        },
      },
      create: {
        id,
        workspaceId: ids.workspace,
        number,
        ...data,
        items: {
          create: {
            id: `61000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            productId: product[0],
            description: product[2],
            unitPrice: subtotal,
            quantity: 1,
            amount: subtotal,
          },
        },
      },
    });
  }

  const memberIds = Object.values(ids.members);
  for (const task of tasks) {
    const [id, name, category, startsAt, dueAt, status, memberCount] = task;
    const data = {
      createdById: ids.users.emilyn,
      name,
      description: `${name} for the Nexora portfolio workspace.`,
      category,
      startsAt: atMidnight(startsAt),
      dueAt: atMidnight(dueAt),
      status,
    };
    const assignees = memberIds.slice(0, memberCount).map((memberId) => ({ memberId }));
    await tx.workspaceTask.upsert({
      where: { id },
      update: { ...data, assignees: { deleteMany: {}, create: assignees } },
      create: { id, workspaceId: ids.workspace, ...data, assignees: { create: assignees } },
    });
  }

  for (const schedule of schedules) {
    const [id, title, startsAt, location, attendeeKeys] = schedule;
    const attendees = attendeeKeys.map((key) => ({ memberId: ids.members[key] }));
    const start = new Date(startsAt);
    const data = {
      organizerId: ids.users.emilyn,
      title,
      description: `${title} in the Nexora demo calendar.`,
      location,
      kind: ScheduleKind.EVENT,
      startsAt: start,
      endsAt: new Date(start.getTime() + 60 * 60 * 1000),
    };
    await tx.scheduleEntry.upsert({
      where: { id },
      update: { ...data, attendees: { deleteMany: {}, create: attendees } },
      create: { id, workspaceId: ids.workspace, ...data, attendees: { create: attendees } },
    });
  }
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'] ?? defaultDatabaseUrl,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hash(demoPassword, 12);
    await prisma.$transaction((tx) => seedDatabase(tx, passwordHash), {
      maxWait: 10_000,
      timeout: 30_000,
    });

    console.info('Nexora portfolio demo data seeded successfully.');
    console.info('Demo login: demo@nexora.app / Nexora123!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Failed to seed the Nexora demo database.', error);
  process.exitCode = 1;
});
