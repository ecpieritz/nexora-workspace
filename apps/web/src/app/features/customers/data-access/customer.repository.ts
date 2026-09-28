import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import { Customer, CustomerFormValue } from '../models/customer.model';

interface ApiDataResponse<T> {
  data: T;
}

interface CustomerListResponse {
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CustomerRepository {
  private readonly http = inject(HttpClient);
  private readonly customersUrl = `${environment.apiUrl}/customers`;

  async getAll(): Promise<Customer[]> {
    const firstPage = await this.getPage(1);
    if (firstPage.meta.totalPages <= 1) return firstPage.data;

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) => this.getPage(index + 2)),
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.data);
  }

  private async getPage(page: number): Promise<CustomerListResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', 100)
      .set('sort', 'name')
      .set('order', 'asc');
    return firstValueFrom(this.http.get<CustomerListResponse>(this.customersUrl, { params }));
  }

  async getById(id: string): Promise<Customer> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<Customer>>(`${this.customersUrl}/${id}`),
    );
    return response.data;
  }

  async create(input: CustomerFormValue): Promise<Customer> {
    const response = await firstValueFrom(
      this.http.post<ApiDataResponse<Customer>>(this.customersUrl, input),
    );
    return response.data;
  }

  async update(id: string, input: CustomerFormValue): Promise<Customer> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<Customer>>(`${this.customersUrl}/${id}`, input),
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.customersUrl}/${id}`));
  }
}
