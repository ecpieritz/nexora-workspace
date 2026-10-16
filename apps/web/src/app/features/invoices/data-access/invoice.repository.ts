import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import {
  CreateInvoiceInput,
  Invoice,
  InvoiceListOptions,
  InvoicePage,
  InvoiceStatus,
  UpdateInvoiceInput,
} from '../models/invoice.model';

interface ApiDataResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class InvoiceRepository {
  private readonly http = inject(HttpClient);
  private readonly invoicesUrl = `${environment.apiUrl}/invoices`;

  async getAll(): Promise<Invoice[]> {
    const firstPage = await this.list({ page: 1, limit: 100 });
    if (firstPage.meta.totalPages <= 1) return firstPage.data;

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
        this.list({ page: index + 2, limit: 100 }),
      ),
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.data);
  }

  list(options: InvoiceListOptions = {}): Promise<InvoicePage> {
    let params = new HttpParams()
      .set('page', options.page ?? 1)
      .set('limit', options.limit ?? 20)
      .set('sort', options.sort ?? 'issuedAt')
      .set('order', options.order ?? 'desc');
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    if (options.favorite !== undefined) params = params.set('favorite', options.favorite);
    if (options.from) params = params.set('from', options.from);
    if (options.to) params = params.set('to', options.to);
    return firstValueFrom(this.http.get<InvoicePage>(this.invoicesUrl, { params }));
  }

  async getById(id: string): Promise<Invoice> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<Invoice>>(`${this.invoicesUrl}/${id}`),
    );
    return response.data;
  }

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const response = await firstValueFrom(
      this.http.post<ApiDataResponse<Invoice>>(this.invoicesUrl, input),
    );
    return response.data;
  }

  async update(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<Invoice>>(`${this.invoicesUrl}/${id}`, input),
    );
    return response.data;
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<Invoice>>(`${this.invoicesUrl}/${id}/status`, { status }),
    );
    return response.data;
  }

  async updateFavorite(id: string, favorite: boolean): Promise<Invoice> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<Invoice>>(`${this.invoicesUrl}/${id}/favorite`, {
        favorite,
      }),
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.invoicesUrl}/${id}`));
  }
}
