import { prisma } from '../../database/prisma.js';
import { CustomerGender, Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  Customer,
  CustomerChanges,
  CustomerGenderValue,
  CustomerListOptions,
  CustomerPage,
  CustomerRepository,
  CustomerWriteInput,
} from './customer.types.js';

const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  gender: true,
  role: true,
  address: true,
  performance: true,
  satisfaction: true,
  retention: true,
  color: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

type CustomerRecord = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;

function toDatabaseGender(gender: CustomerGenderValue): CustomerGender {
  const genders: Record<CustomerGenderValue, CustomerGender> = {
    male: CustomerGender.MALE,
    female: CustomerGender.FEMALE,
    'non-binary': CustomerGender.NON_BINARY,
  };
  return genders[gender];
}

function toPublicGender(gender: CustomerGender): CustomerGenderValue {
  const genders: Record<CustomerGender, CustomerGenderValue> = {
    [CustomerGender.MALE]: 'male',
    [CustomerGender.FEMALE]: 'female',
    [CustomerGender.NON_BINARY]: 'non-binary',
  };
  return genders[gender];
}

function toCustomer(customer: CustomerRecord): Customer {
  return {
    ...customer,
    gender: toPublicGender(customer.gender),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function createWhere(workspaceId: string, options: CustomerListOptions): Prisma.CustomerWhereInput {
  const search = options.search?.trim();
  return {
    workspaceId,
    ...(options.gender === undefined ? {} : { gender: toDatabaseGender(options.gender) }),
    ...(search
      ? {
          OR: ['firstName', 'lastName', 'email', 'phone', 'role'].map((field) => ({
            [field]: { contains: search, mode: Prisma.QueryMode.insensitive },
          })),
        }
      : {}),
  };
}

function createOrderBy(options: CustomerListOptions): Prisma.CustomerOrderByWithRelationInput[] {
  if (options.sort === 'name') {
    return [{ lastName: options.order }, { firstName: options.order }, { id: 'asc' }];
  }
  return [{ [options.sort]: options.order }, { id: 'asc' }];
}

function toUpdateData(changes: CustomerChanges): Prisma.CustomerUpdateManyMutationInput {
  return {
    ...(changes.firstName === undefined ? {} : { firstName: changes.firstName }),
    ...(changes.lastName === undefined ? {} : { lastName: changes.lastName }),
    ...(changes.email === undefined ? {} : { email: changes.email }),
    ...(changes.phone === undefined ? {} : { phone: changes.phone }),
    ...(changes.gender === undefined ? {} : { gender: toDatabaseGender(changes.gender) }),
    ...(changes.role === undefined ? {} : { role: changes.role }),
    ...(changes.address === undefined ? {} : { address: changes.address }),
  };
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async list(workspaceId: string, options: CustomerListOptions): Promise<CustomerPage> {
    const where = createWhere(workspaceId, options);
    const [items, total] = await this.database.$transaction([
      this.database.customer.findMany({
        where,
        select: customerSelect,
        orderBy: createOrderBy(options),
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.database.customer.count({ where }),
    ]);
    return { items: items.map(toCustomer), total };
  }

  async findById(workspaceId: string, customerId: string): Promise<Customer | null> {
    const customer = await this.database.customer.findFirst({
      where: { id: customerId, workspaceId },
      select: customerSelect,
    });
    return customer ? toCustomer(customer) : null;
  }

  async create(
    workspaceId: string,
    createdById: string,
    input: CustomerWriteInput,
  ): Promise<Customer> {
    const customer = await this.database.customer.create({
      data: {
        ...input,
        workspaceId,
        createdById,
        gender: toDatabaseGender(input.gender),
        performance: [35, 48, 42, 61, 58, 72],
        satisfaction: 72,
        retention: 65,
      },
      select: customerSelect,
    });
    return toCustomer(customer);
  }

  async update(
    workspaceId: string,
    customerId: string,
    changes: CustomerChanges,
  ): Promise<Customer | null> {
    const updated = await this.database.customer.updateMany({
      where: { id: customerId, workspaceId },
      data: toUpdateData(changes),
    });
    if (updated.count !== 1) return null;
    return this.findById(workspaceId, customerId);
  }

  async delete(workspaceId: string, customerId: string): Promise<boolean> {
    const deleted = await this.database.customer.deleteMany({
      where: { id: customerId, workspaceId },
    });
    return deleted.count === 1;
  }
}
