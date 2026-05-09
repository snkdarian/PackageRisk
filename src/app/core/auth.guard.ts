import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ready.then(() => {
    if (auth.user()) return true;
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: router.url } });
  });
};
