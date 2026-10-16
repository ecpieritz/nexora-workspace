import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import {
  Product,
  ProductAnalytics,
  ProductCreateInput,
  ProductListOptions,
  ProductPage,
  ProductUpdateInput,
} from '../models/product-analytics.model';

interface ApiDataResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ProductRepository {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${environment.apiUrl}/products`;

  async getAnalytics(range?: { from: string; to: string }): Promise<ProductAnalytics> {
    let params = new HttpParams();
    if (range) params = params.set('from', range.from).set('to', range.to);
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<ProductAnalytics>>(`${this.productsUrl}/analytics`, { params }),
    );
    return response.data;
  }

  list(options: ProductListOptions = {}): Promise<ProductPage> {
    let params = new HttpParams()
      .set('page', options.page ?? 1)
      .set('limit', options.limit ?? 20)
      .set('sort', options.sort ?? 'name')
      .set('order', options.order ?? 'asc');
    if (options.search) params = params.set('search', options.search);
    if (options.category) params = params.set('category', options.category);
    if (options.active !== undefined) params = params.set('active', options.active);
    return firstValueFrom(this.http.get<ProductPage>(this.productsUrl, { params }));
  }

  async getById(id: string): Promise<Product> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<Product>>(`${this.productsUrl}/${id}`),
    );
    return response.data;
  }

  async create(input: ProductCreateInput): Promise<Product> {
    const response = await firstValueFrom(
      this.http.post<ApiDataResponse<Product>>(this.productsUrl, {
        ...input,
        stock: input.stock ?? 0,
        active: input.active ?? true,
      }),
    );
    return response.data;
  }

  async update(id: string, input: ProductUpdateInput): Promise<Product> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<Product>>(`${this.productsUrl}/${id}`, input),
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.productsUrl}/${id}`));
  }
}
