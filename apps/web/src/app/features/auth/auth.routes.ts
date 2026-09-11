import { Routes } from '@angular/router';

import { AuthLayoutComponent } from './layout/auth-layout.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'account-created',
    loadComponent: () =>
      import('./pages/account-created/account-created.component').then(
        ({ AccountCreatedComponent }) => AccountCreatedComponent,
      ),
  },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login.component').then(({ LoginComponent }) => LoginComponent),
      },
      {
        path: 'recover-password',
        loadComponent: () =>
          import('./pages/recover-password/recover-password.component').then(
            ({ RecoverPasswordComponent }) => RecoverPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/reset-password/reset-password.component').then(
            ({ ResetPasswordComponent }) => ResetPasswordComponent,
          ),
      },
      {
        path: 'sign-up',
        loadComponent: () =>
          import('./pages/sign-up/sign-up.component').then(
            ({ SignUpComponent }) => SignUpComponent,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
    ],
  },
];
