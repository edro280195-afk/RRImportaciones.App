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

/**
 * Guard para la vista Asistente Personal (rol DUEÑO).
 */
export const duenoGuard = () => {
  const auth = inject(AuthService);
  if (auth.isDueno()) return true;
  return inject(Router).parseUrl('/inicio');
};

/**
 * Guard del dashboard (/inicio): exclusivo de dirección (ADMIN, DUEÑO,
 * GERENTE). A quien no cumple lo manda a la sección desde la que sí trabaja
 * — nunca de vuelta a /inicio, que sería un loop de redirects.
 */
export const direccionGuard = () => {
  const auth = inject(AuthService);
  if (auth.puedeVerDashboard()) return true;

  const role = auth.user()?.role;
  const esRolDeCampo = role === 'YARDERO' || role === 'CHOFER' || role === 'CAMPO';
  return inject(Router).parseUrl(esRolDeCampo ? '/campo' : '/cotizaciones');
};
