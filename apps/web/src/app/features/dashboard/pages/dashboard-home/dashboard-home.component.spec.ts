import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

import { DashboardData, DashboardRepository } from '../../data-access/dashboard.repository';
import { DashboardHomeComponent } from './dashboard-home.component';

describe('DashboardHomeComponent', () => {
  let fixture: ComponentFixture<DashboardHomeComponent>;
  let repository: jasmine.SpyObj<DashboardRepository>;

  const dashboard: DashboardData = {
    summary: [
      {
        id: 'products',
        label: 'Active products',
        value: 8,
        suffix: '',
        icon: 'saved',
        tone: 'blue',
      },
    ],
    salesReport: [
      { label: 'Sep 1', value: 800 },
      { label: 'Sep 8', value: 1200 },
    ],
    transactionAnalytics: {
      headline: 75,
      label: 'Transactions',
      segments: [{ id: 'complete', label: 'Complete', value: 75, color: '#5b8ff9' }],
    },
    recentOrders: [
      {
        id: 'item-1',
        trackingNumber: 'INV-001',
        productName: 'iPhone 12',
        productVisual: 'phone',
        price: 1300,
        quantity: 1,
        totalAmount: 1300,
      },
    ],
    topProducts: [
      {
        id: 'product-1',
        name: 'iPhone 12',
        productVisual: 'phone',
        price: 1300,
        quantity: 2,
        orderCount: 2,
        revenue: 2600,
      },
    ],
  };

  beforeEach(async () => {
    repository = jasmine.createSpyObj<DashboardRepository>('DashboardRepository', ['getDashboard']);
    repository.getDashboard.and.resolveTo(dashboard);
    const session = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', [], {
      currentUser: signal({
        id: 'user-id',
        fullName: 'Jane Doe',
        displayName: 'Jane',
        email: 'jane@example.com',
        username: 'janedoe',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    });
    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        { provide: DashboardRepository, useValue: repository },
        { provide: AuthSessionService, useValue: session },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardHomeComponent);
  });

  it('should render dashboard data loaded from the repository', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repository.getDashboard).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Welcome back, Jane Doe');
    expect(fixture.nativeElement.textContent).toContain('Active products');
    expect(fixture.nativeElement.textContent).toContain('iPhone 12');
    expect(fixture.nativeElement.querySelector('.sales-report__line')).not.toBeNull();
  });

  it('should show an empty state when the API has no summary data', async () => {
    repository.getDashboard.and.resolveTo({ ...dashboard, summary: [] });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nothing to summarize yet');
  });

  it('should expose an error state and retry the dashboard request', async () => {
    repository.getDashboard.and.rejectWith(new Error('API unavailable'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Workspace unavailable');

    repository.getDashboard.and.resolveTo(dashboard);
    const retry: HTMLButtonElement = fixture.nativeElement.querySelector('[role="alert"] button');
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repository.getDashboard).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Active products');
  });
});
