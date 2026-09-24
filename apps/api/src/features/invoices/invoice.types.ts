export type InvoiceStatusValue = 'complete' | 'pending' | 'cancelled';
export type InvoiceSortField = 'issuedAt' | 'dueAt' | 'customerName' | 'total' | 'createdAt';
export type InvoiceSortOrder = 'asc' | 'desc';

export interface InvoiceItem {
  id: string;
  productId: string | null;
  description: string;
  rate: number;
  quantity: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  email: string;
  address: string | null;
  issuedAt: string;
  dueAt: string | null;
  status: InvoiceStatusValue;
  favorite: boolean;
  currency: string;
  discount: number;
  subtotal: number;
  total: number;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineWriteInput {
  productId?: string | null;
  description: string;
  rate: number;
  quantity: number;
  amount: number;
}

export interface InvoiceWriteInput {
  number: string;
  customerId?: string | null;
  customerName: string;
  email: string;
  address?: string | null;
  issuedAt: Date;
  dueAt?: Date | null;
  currency: string;
  discount: number;
  subtotal: number;
  total: number;
  items: InvoiceLineWriteInput[];
}

export interface InvoiceChanges {
  customerId?: string | null;
  customerName?: string;
  email?: string;
  address?: string | null;
  issuedAt?: Date;
  dueAt?: Date | null;
  currency?: string;
  discount?: number;
  subtotal?: number;
  total?: number;
  items?: InvoiceLineWriteInput[];
}

export interface InvoiceListOptions {
  page: number;
  limit: number;
  search?: string;
  status?: InvoiceStatusValue;
  favorite?: boolean;
  from?: Date;
  to?: Date;
  sort: InvoiceSortField;
  order: InvoiceSortOrder;
}

export interface InvoicePage {
  items: Invoice[];
  total: number;
}

export interface InvoiceReferenceInput {
  customerId?: string | null;
  productIds: string[];
}

export interface InvoiceRepository {
  list(workspaceId: string, options: InvoiceListOptions): Promise<InvoicePage>;
  findById(workspaceId: string, invoiceId: string): Promise<Invoice | null>;
  referencesExist(workspaceId: string, references: InvoiceReferenceInput): Promise<boolean>;
  create(workspaceId: string, createdById: string, input: InvoiceWriteInput): Promise<Invoice>;
  update(workspaceId: string, invoiceId: string, changes: InvoiceChanges): Promise<Invoice | null>;
  updateStatus(
    workspaceId: string,
    invoiceId: string,
    status: InvoiceStatusValue,
  ): Promise<Invoice | null>;
  updateFavorite(
    workspaceId: string,
    invoiceId: string,
    favorite: boolean,
  ): Promise<Invoice | null>;
  delete(workspaceId: string, invoiceId: string): Promise<boolean>;
}
