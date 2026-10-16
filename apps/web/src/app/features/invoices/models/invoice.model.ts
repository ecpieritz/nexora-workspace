export type InvoiceStatus = 'complete' | 'pending' | 'cancelled';

export interface InvoiceLineItem {
  productId?: string | null;
  description: string;
  rate: number;
  quantity: number;
}

export interface CreateInvoiceInput {
  customerId?: string | null;
  customerName: string;
  email: string;
  address?: string | null;
  issuedAt: string;
  dueAt?: string | null;
  currency?: string;
  discount: number;
  items: InvoiceLineItem[];
}

export interface InvoiceItem extends InvoiceLineItem {
  id: string;
  productId: string | null;
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
  status: InvoiceStatus;
  favorite: boolean;
  currency: string;
  discount: number;
  subtotal: number;
  total: number;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export interface InvoiceListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  favorite?: boolean;
  from?: string;
  to?: string;
  sort?: 'issuedAt' | 'dueAt' | 'customerName' | 'total' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface InvoicePage {
  data: Invoice[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
