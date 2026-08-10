import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard específico para rutas de campo: redirige a /campo/pin en vez de /login.
 * Además del token exige el permiso CAMPO_USAR — sin él, cualquier usuario con
 * sesión abierta (por ejemplo alguien de finanzas) podía entrar a /campo.
 */
export const campoAuthGuard = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/campo/pin'], { queryParams: { returnUrl: state.url } });
  }

  // Con sesión pero sin permiso de campo: mandarlo a su propio inicio en vez de
  // dejarlo en un login que ya no le aplica.
  if (!auth.can('CAMPO_USAR')) {
    return router.createUrlTree(['/inicio']);
  }

  return true;
};
