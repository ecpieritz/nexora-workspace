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
        path: 'invoices',
        loadComponent: () =>
          import('@features/invoices/pages/invoice-list/invoice-list.component').then(
            ({ InvoiceListComponent }) => InvoiceListComponent,
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
