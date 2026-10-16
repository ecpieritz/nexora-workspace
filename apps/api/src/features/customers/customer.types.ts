export type CustomerGenderValue = 'male' | 'female' | 'non-binary';
export type CustomerSortField = 'name' | 'email' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: CustomerGenderValue;
  role: string;
  address: string;
  performance: number[];
  satisfaction: number;
  retention: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWriteInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: CustomerGenderValue;
  role: string;
  address: string;
}

export interface CustomerChanges {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: CustomerGenderValue;
  role?: string;
  address?: string;
}

export interface CustomerListOptions {
  page: number;
  limit: number;
  search?: string;
  gender?: CustomerGenderValue;
  sort: CustomerSortField;
  order: SortOrder;
}

export interface CustomerPage {
  items: Customer[];
  total: number;
}

export interface CustomerRepository {
  list(workspaceId: string, options: CustomerListOptions): Promise<CustomerPage>;
  findById(workspaceId: string, customerId: string): Promise<Customer | null>;
  create(workspaceId: string, createdById: string, input: CustomerWriteInput): Promise<Customer>;
  update(
    workspaceId: string,
    customerId: string,
    changes: CustomerChanges,
  ): Promise<Customer | null>;
  delete(workspaceId: string, customerId: string): Promise<boolean>;
}
