import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Fábrica de guards de permisos.
 * Uso: canActivate: [permissionGuard('TRAMITES_VER')]
 */
export const permissionGuard = (codigo: string) => () => {
  const auth = inject(AuthService);
  if (auth.can(codigo)) return true;
  return inject(Router).parseUrl('/inicio');
};

/**
 * Guard para secciones exclusivas del rol ADMIN.
 */
export const adminGuard = () => {
  const auth = inject(AuthService);
  if (auth.isAdmin()) return true;
  return inject(Router).parseUrl('/inicio');
};
