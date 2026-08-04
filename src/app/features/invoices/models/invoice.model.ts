export type InvoiceStatus = 'complete' | 'pending' | 'cancelled';

export interface InvoiceLineItem {
  description: string;
  rate: number;
  quantity: number;
}

export interface CreateInvoiceInput {
  customerName: string;
  email: string;
  address: string;
  issuedAt: string;
  discount: number;
  items: InvoiceLineItem[];
}

export interface Invoice {
  id: string;
  customerName: string;
  email: string;
  issuedAt: string;
  status: InvoiceStatus;
  favorite: boolean;
  address?: string;
  discount?: number;
  items?: InvoiceLineItem[];
  total?: number;
}
