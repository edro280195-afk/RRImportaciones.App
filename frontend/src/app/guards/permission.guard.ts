import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * A dónde mandar a alguien que no puede quedarse donde está.
 *
 * Antes cada guard tenía su propio destino de "no puedes, vete a X" escrito a
 * mano (la mayoría a '/inicio'). El 11-ago eso causó un loop real: a oficina
 * se le mandaba a '/cotizaciones' si no tenía dashboard, pero si además le
 * quitaban COTIZACIONES_VER desde Roles, '/cotizaciones' rebotaba a '/inicio'
 * y '/inicio' rebotaba de vuelta a '/cotizaciones' — sesión que nunca carga,
 * navegador que se queda pensando para siempre.
 *
 * La corrección: un único lugar que revisa lo que el usuario SÍ puede ver hoy
 * (no una lista fija de "los roles de oficina siempre tienen tal permiso") y
 * cae, en el peor caso, a una ruta sin ningún guard — así no hay combinación
 * de permisos que pueda producir un ciclo.
 */
export function resolveHomeRoute(auth: AuthService): string {
  // Rol de campo (YARDERO/CHOFER): /campo es su herramienta de trabajo, va
  // primero — aunque también tengan TRAMITES_VER (lo usan para consultar,
  // no es su tablero principal).
  const role = auth.user()?.role;
  const esRolDeCampo = role === 'YARDERO' || role === 'CHOFER' || role === 'CAMPO';

  const candidatos: { ruta: string; cumple: boolean }[] = [];
  candidatos.push({ ruta: '/asistente-personal', cumple: auth.isDueno() });
  if (esRolDeCampo) {
    candidatos.push({ ruta: '/campo', cumple: auth.can('CAMPO_USAR') });
  }
  candidatos.push(
    { ruta: '/inicio', cumple: auth.puedeVerDashboard() },
    { ruta: '/cotizaciones', cumple: auth.can('COTIZACIONES_VER') },
    { ruta: '/tramites', cumple: auth.can('TRAMITES_VER') },
    // Alguien que no es "de campo" pero igual trae CAMPO_USAR (p.ej. oficina
    // con acceso extra): lo manda aquí solo si nada de lo de arriba aplicó.
    { ruta: '/campo', cumple: auth.can('CAMPO_USAR') },
    { ruta: '/clientes', cumple: auth.can('CLIENTES_VER') },
    { ruta: '/pagos', cumple: auth.can('PAGOS_VER') },
    { ruta: '/usuarios', cumple: auth.can('USUARIOS_VER') }
  );

  for (const { ruta, cumple } of candidatos) {
    if (cumple) return ruta;
  }

  // Sin ningún permiso reconocido: /manual no tiene canActivate, así que
  // siempre carga. Es el fondo del pozo que evita el loop.
  return '/manual';
}

/**
 * Fábrica de guards de permisos.
 * Uso: canActivate: [permissionGuard('TRAMITES_VER')]
 */
export const permissionGuard = (codigo: string) => () => {
  const auth = inject(AuthService);
  if (auth.can(codigo)) return true;
  return inject(Router).parseUrl(resolveHomeRoute(auth));
};

/**
 * Guard para secciones exclusivas del rol ADMIN.
 */
export const adminGuard = () => {
  const auth = inject(AuthService);
  if (auth.isAdmin()) return true;
  return inject(Router).parseUrl(resolveHomeRoute(auth));
};

/**
 * Guard para la vista Asistente Personal (rol DUEÑO).
 */
export const duenoGuard = () => {
  const auth = inject(AuthService);
  if (auth.isDueno()) return true;
  return inject(Router).parseUrl(resolveHomeRoute(auth));
};

/**
 * Guard del dashboard (/inicio): exclusivo de dirección (ADMIN, DUEÑO,
 * GERENTE).
 */
export const direccionGuard = () => {
  const auth = inject(AuthService);
  if (auth.puedeVerDashboard()) return true;
  return inject(Router).parseUrl(resolveHomeRoute(auth));
};
