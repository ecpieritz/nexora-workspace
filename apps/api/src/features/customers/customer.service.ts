import { ApiError } from '../../errors/api-error.js';
import type { AuthPrincipal } from '../auth/index.js';
import type {
  CreateCustomerInput,
  CustomerListQuery,
  UpdateCustomerInput,
} from './customer.schemas.js';
import type {
  Customer,
  CustomerChanges,
  CustomerListOptions,
  CustomerRepository,
} from './customer.types.js';

export interface CustomerListResult {
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerManagementService {
  list(principal: AuthPrincipal, query: CustomerListQuery): Promise<CustomerListResult>;
  get(principal: AuthPrincipal, customerId: string): Promise<Customer>;
  create(principal: AuthPrincipal, input: CreateCustomerInput): Promise<Customer>;
  update(
    principal: AuthPrincipal,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<Customer>;
  delete(principal: AuthPrincipal, customerId: string): Promise<void>;
}

export class CustomerService implements CustomerManagementService {
  constructor(private readonly repository: CustomerRepository) {}

  async list(principal: AuthPrincipal, query: CustomerListQuery): Promise<CustomerListResult> {
    const options: CustomerListOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.gender === undefined ? {} : { gender: query.gender }),
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

  async get(principal: AuthPrincipal, customerId: string): Promise<Customer> {
    const customer = await this.repository.findById(principal.workspaceId, customerId);
    if (!customer) throw ApiError.notFound('Customer was not found.');
    return customer;
  }

  create(principal: AuthPrincipal, input: CreateCustomerInput): Promise<Customer> {
    return this.repository.create(principal.workspaceId, principal.userId, input);
  }

  async update(
    principal: AuthPrincipal,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    const customer = await this.repository.update(
      principal.workspaceId,
      customerId,
      input as CustomerChanges,
    );
    if (!customer) throw ApiError.notFound('Customer was not found.');
    return customer;
  }

  async delete(principal: AuthPrincipal, customerId: string): Promise<void> {
    const deleted = await this.repository.delete(principal.workspaceId, customerId);
    if (!deleted) throw ApiError.notFound('Customer was not found.');
  }
}
