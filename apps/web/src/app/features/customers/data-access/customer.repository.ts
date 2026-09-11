import { inject, Injectable } from '@angular/core';
import { MockApiError, MockApiService, MockStorageService } from '@core/mock-api';
import { Customer, CustomerFormValue } from '../models/customer.model';

const CUSTOMERS_STORAGE_KEY = 'nexora:customers';

const CUSTOMERS: readonly Customer[] = [
  {
    id: 'customer-1',
    firstName: 'John',
    lastName: 'Deo',
    email: 'johndeo2211@gmail.com',
    phone: '+33 757 005 4167',
    gender: 'male',
    role: 'UI/UX Designer',
    address: '2239 Hog Camp Road, Schaumburg',
    performance: [28, 42, 68, 35, 54, 79],
    satisfaction: 70,
    retention: 60,
    color: '#87a8ff',
  },
  {
    id: 'customer-2',
    firstName: 'Shelby',
    lastName: 'Goode',
    email: 'shelbygoode481@gmail.com',
    phone: '+33 757 005 4567',
    gender: 'female',
    role: 'Product Designer',
    address: '148 Design Avenue, Paris',
    performance: [38, 54, 46, 72, 61, 85],
    satisfaction: 84,
    retention: 76,
    color: '#ff9da8',
  },
  {
    id: 'customer-3',
    firstName: 'Robert',
    lastName: 'Bacins',
    email: 'robertbacins4182@co.com',
    phone: '+33 757 005 4167',
    gender: 'male',
    role: 'Frontend Developer',
    address: '35 Angular Street, Lyon',
    performance: [32, 49, 58, 63, 70, 81],
    satisfaction: 78,
    retention: 73,
    color: '#f1c66a',
  },
  {
    id: 'customer-4',
    firstName: 'John',
    lastName: 'Carilo',
    email: 'johncarilo182@co.com',
    phone: '+33 757 005 4167',
    gender: 'male',
    role: 'Project Manager',
    address: '806 Market Road, Lille',
    performance: [55, 48, 67, 59, 82, 74],
    satisfaction: 81,
    retention: 68,
    color: '#72c7ca',
  },
  {
    id: 'customer-5',
    firstName: 'Adriene',
    lastName: 'Watson',
    email: 'adrienewatson82@co.com',
    phone: '+83 757 305 4167',
    gender: 'female',
    role: 'Business Analyst',
    address: '91 Discovery Lane, Nice',
    performance: [29, 44, 61, 57, 76, 89],
    satisfaction: 88,
    retention: 80,
    color: '#c59be9',
  },
  {
    id: 'customer-6',
    firstName: 'Mark',
    lastName: 'Ruffalo',
    email: 'markruffalo3735@co.com',
    phone: '+33 757 005 4167',
    gender: 'male',
    role: 'Sales Manager',
    address: '74 Commerce Boulevard, Rouen',
    performance: [45, 62, 51, 70, 66, 83],
    satisfaction: 75,
    retention: 71,
    color: '#7cb9a8',
  },
  {
    id: 'customer-7',
    firstName: 'Bethany',
    lastName: 'Jackson',
    email: 'bethanyjackson5@co.com',
    phone: '+33 757 005 4167',
    gender: 'female',
    role: 'Marketing Lead',
    address: '16 Campaign Street, Dijon',
    performance: [40, 53, 65, 75, 69, 90],
    satisfaction: 91,
    retention: 86,
    color: '#ed9e85',
  },
  {
    id: 'customer-8',
    firstName: 'Christine',
    lastName: 'Huston',
    email: 'christinehuston4@co.com',
    phone: '+33 757 005 4167',
    gender: 'female',
    role: 'UX Researcher',
    address: '402 Research Way, Bordeaux',
    performance: [36, 47, 59, 72, 80, 87],
    satisfaction: 86,
    retention: 79,
    color: '#d3aa70',
  },
];

@Injectable({ providedIn: 'root' })
export class CustomerRepository {
  private readonly mockApi = inject(MockApiService);
  private readonly storage = inject(MockStorageService);
  getAll(): Promise<Customer[]> {
    return this.mockApi.execute(() => this.read());
  }
  create(input: CustomerFormValue): Promise<Customer> {
    return this.mockApi.execute(() => {
      const customers = this.read();
      const customer: Customer = {
        ...input,
        id: this.mockApi.createId(),
        performance: [35, 48, 42, 61, 58, 72],
        satisfaction: 72,
        retention: 65,
        color: '#625df5',
      };
      this.storage.write(CUSTOMERS_STORAGE_KEY, [customer, ...customers]);
      return { ...customer, performance: [...customer.performance] };
    });
  }
  update(id: string, input: CustomerFormValue): Promise<Customer> {
    return this.mockApi.execute(() => {
      const customers = this.read();
      const index = customers.findIndex((customer) => customer.id === id);
      if (index < 0) throw new MockApiError(404, 'Customer not found.');
      customers[index] = { ...customers[index], ...input };
      this.storage.write(CUSTOMERS_STORAGE_KEY, customers);
      return { ...customers[index], performance: [...customers[index].performance] };
    });
  }
  private read(): Customer[] {
    return this.storage.read<Customer[]>(
      CUSTOMERS_STORAGE_KEY,
      CUSTOMERS.map((customer) => ({ ...customer, performance: [...customer.performance] })),
    );
  }
}
