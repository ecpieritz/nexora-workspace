import { inject, Injectable } from '@angular/core';
import { MockApiService } from '@core/mock-api';
import { ProductAnalytics } from '../models/product-analytics.model';

const DATA: ProductAnalytics = {
  metrics: [
    {
      id: 'products',
      label: 'Total products',
      value: 500874,
      change: '+1,400 new',
      trend: [28, 36, 34, 52, 38, 47, 65],
    },
    {
      id: 'sales',
      label: 'Total sales',
      value: 234888,
      change: '+1,000 today',
      trend: [52, 45, 58, 39, 48, 43, 54],
    },
  ],
  ranking: [
    {
      id: 'p1',
      name: 'Bluetooth Devices',
      category: 'Audio',
      price: 10,
      orders: 34666,
      sales: 346660,
    },
    { id: 'p2', name: 'AirPods', category: 'Audio', price: 15, orders: 20000, sales: 300000 },
    {
      id: 'p3',
      name: 'Running Shoes',
      category: 'Fashion',
      price: 10,
      orders: 15000,
      sales: 150000,
    },
    {
      id: 'p4',
      name: "Kids' T-Shirt",
      category: 'Fashion',
      price: 12,
      orders: 10000,
      sales: 120000,
    },
    {
      id: 'p5',
      name: 'Smart Watch',
      category: 'Wearables',
      price: 12,
      orders: 10000,
      sales: 120000,
    },
  ],
  monthlySales: [
    { month: 'Jan', value: 23400 },
    { month: 'Feb', value: 15000 },
    { month: 'Mar', value: 30000 },
    { month: 'Apr', value: 22000 },
    { month: 'May', value: 10000 },
    { month: 'Jun', value: 23400 },
    { month: 'Jul', value: 5000 },
  ],
  distribution: [
    { label: 'Total sales', value: 58, color: '#5b8ff9' },
    { label: 'Total orders', value: 27, color: '#f6c85f' },
    { label: 'Orders canceled', value: 15, color: '#ff876c' },
  ],
};

@Injectable({ providedIn: 'root' })
export class ProductRepository {
  private readonly mockApi = inject(MockApiService);
  getAnalytics(): Promise<ProductAnalytics> {
    return this.mockApi.execute(() => structuredClone(DATA));
  }
}
