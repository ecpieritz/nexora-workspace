import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  return session.isAuthenticated()
    ? true
    : router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
};
