import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Guard específico para rutas de campo: redirige a /campo/pin en vez de /login */
export const campoAuthGuard = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/campo/pin'], {
    queryParams: { returnUrl: state.url },
  });
};
