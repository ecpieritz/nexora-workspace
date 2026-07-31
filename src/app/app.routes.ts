import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('@features/auth/auth.routes').then(({ AUTH_ROUTES }) => AUTH_ROUTES),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
