export type InvoiceStatus = 'complete' | 'pending' | 'cancelled';

export interface Invoice {
  id: string;
  customerName: string;
  email: string;
  issuedAt: string;
  status: InvoiceStatus;
  favorite: boolean;
}
