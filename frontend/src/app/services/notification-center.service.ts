import { Injectable, computed, signal } from '@angular/core';

export type NotificacionSeveridad = 'success' | 'info' | 'warning' | 'error';

export interface NotificacionItem {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  severidad: NotificacionSeveridad;
  fecha: string;
  leida: boolean;
}

/** Lo que emite el backend, ya sea por SignalR o por Firebase en primer plano. */
export interface NotificacionEntrante {
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  url?: string | null;
  severidad?: string;
  fecha?: string;
  data?: Record<string, string> | null;
}

const CLAVE_STORAGE = 'rr-notificaciones';
const MAX_HISTORIAL = 40;
/**
 * El mismo aviso puede llegar dos veces casi al mismo tiempo (por SignalR y por
 * Firebase en primer plano). Dentro de esta ventana se considera repetido.
 */
const VENTANA_DUPLICADOS_MS = 15_000;

/**
 * Historial de notificaciones de la sesión: es lo que pinta la campanita del
 * topbar. Se guarda en localStorage para que al recargar no se pierda lo que
 * llegó mientras el usuario estaba en otra pantalla.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  readonly items = signal<NotificacionItem[]>(this.leerDeStorage());
  readonly noLeidas = computed(() => this.items().filter(n => !n.leida).length);

  /**
   * Guarda una notificación nueva y la devuelve ya normalizada. Devuelve null
   * si es un duplicado recién recibido, para no pintar dos toasts iguales.
   */
  agregar(entrante: NotificacionEntrante): NotificacionItem | null {
    if (this.esDuplicado(entrante)) return null;

    const item: NotificacionItem = {
      id: crypto.randomUUID(),
      tipo: entrante.tipo || 'generico',
      titulo: entrante.titulo || 'R&R Importaciones',
      mensaje: entrante.mensaje || '',
      url: entrante.url ?? null,
      severidad: this.normalizarSeveridad(entrante.severidad),
      fecha: entrante.fecha || new Date().toISOString(),
      leida: false,
    };

    this.items.update(actuales => [item, ...actuales].slice(0, MAX_HISTORIAL));
    this.persistir();
    return item;
  }

  marcarLeida(id: string): void {
    this.items.update(actuales => actuales.map(n => (n.id === id ? { ...n, leida: true } : n)));
    this.persistir();
  }

  marcarTodasLeidas(): void {
    this.items.update(actuales => actuales.map(n => ({ ...n, leida: true })));
    this.persistir();
  }

  limpiar(): void {
    this.items.set([]);
    this.persistir();
  }

  /** Texto relativo tipo "hace 5 min", para la lista de la campanita. */
  tiempoRelativo(fecha: string): string {
    const ms = Date.now() - new Date(fecha).getTime();
    if (Number.isNaN(ms) || ms < 0) return 'ahora';

    const minutos = Math.floor(ms / 60000);
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `hace ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;

    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'ayer' : `hace ${dias} días`;
  }

  private esDuplicado(entrante: NotificacionEntrante): boolean {
    const titulo = entrante.titulo || '';
    const mensaje = entrante.mensaje || '';
    const limite = Date.now() - VENTANA_DUPLICADOS_MS;

    return this.items().some(
      n =>
        n.titulo === titulo &&
        n.mensaje === mensaje &&
        new Date(n.fecha).getTime() >= limite
    );
  }

  private normalizarSeveridad(valor?: string): NotificacionSeveridad {
    switch ((valor || '').toLowerCase()) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }

  private leerDeStorage(): NotificacionItem[] {
    try {
      const crudo = localStorage.getItem(CLAVE_STORAGE);
      if (!crudo) return [];
      const parsed = JSON.parse(crudo);
      return Array.isArray(parsed) ? (parsed as NotificacionItem[]).slice(0, MAX_HISTORIAL) : [];
    } catch {
      return [];
    }
  }

  private persistir(): void {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(this.items()));
    } catch {
      // Sin espacio en el dispositivo: la campanita sigue viva en memoria.
    }
  }
}
