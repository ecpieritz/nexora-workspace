import { Routes } from '@angular/router';

import { authGuard } from '@core/auth';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('@features/auth/auth.routes').then(({ AUTH_ROUTES }) => AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('@core/layout/dashboard-shell/dashboard-shell.component').then(
        ({ DashboardShellComponent }) => DashboardShellComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/dashboard/pages/dashboard-home/dashboard-home.component').then(
            ({ DashboardHomeComponent }) => DashboardHomeComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('@features/customers/pages/customer-list/customer-list.component').then(
            ({ CustomerListComponent }) => CustomerListComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('@features/products/pages/product-analytics/product-analytics.component').then(
            ({ ProductAnalyticsComponent }) => ProductAnalyticsComponent,
          ),
      },
      {
        path: 'invoices/new',
        loadComponent: () =>
          import('@features/invoices/pages/invoice-create/invoice-create.component').then(
            ({ InvoiceCreateComponent }) => InvoiceCreateComponent,
          ),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('@features/invoices/pages/invoice-list/invoice-list.component').then(
            ({ InvoiceListComponent }) => InvoiceListComponent,
          ),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('@features/schedule/pages/schedule-list/schedule-list.component').then(
            ({ ScheduleListComponent }) => ScheduleListComponent,
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('@features/tasks/pages/task-list/task-list.component').then(
            ({ TaskListComponent }) => TaskListComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('@features/calendar/pages/month-calendar/month-calendar.component').then(
            ({ MonthCalendarComponent }) => MonthCalendarComponent,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
