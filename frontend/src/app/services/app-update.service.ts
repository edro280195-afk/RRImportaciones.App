import { Injectable, NgZone, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';

/** Qué fue lo que se actualizó, para redactar el aviso. */
export type OrigenActualizacion = 'frontend' | 'backend';

interface HuellaFrontend {
  version: string;
}

interface HuellaBackend {
  version: string;
}

/**
 * Detecta despliegues nuevos —de la app y del API— mientras la PWA está abierta.
 *
 * El problema que resuelve: una PWA instalada puede quedarse días sin recargar.
 * El navegador no vuelve a pedir index.html por su cuenta, así que el usuario
 * sigue usando el código de hace tres despliegues y, cuando el API cambia,
 * empiezan los errores inexplicables. Aquí se compara cada minuto la huella del
 * build contra la que está corriendo y, si cambió, se levanta el aviso.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private zone = inject(NgZone);

  /** true cuando hay una versión publicada distinta a la que está corriendo. */
  readonly actualizacionDisponible = signal(false);
  readonly origen = signal<OrigenActualizacion | null>(null);
  /** true mientras se aplica la actualización, para bloquear el botón. */
  readonly aplicando = signal(false);

  /** Huellas de lo que está corriendo ahora mismo en esta pestaña. */
  private versionFrontend: string | null = null;
  private versionBackend: string | null = null;

  private iniciado = false;
  private recargaEnMarcha = false;
  private yaRecargue = false;
  private intervalo?: ReturnType<typeof setInterval>;

  /** Cada minuto: suficiente para que un despliegue se note casi al instante y
   *  demasiado poco tráfico como para que importe. */
  private readonly INTERVALO_MS = 60_000;

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    void this.revisar();
    this.vigilarServiceWorker();

    // Fuera de la zona de Angular: un temporizador dentro dispararía detección
    // de cambios en toda la app cada minuto sin que nada haya cambiado.
    this.zone.runOutsideAngular(() => {
      this.intervalo = setInterval(() => void this.revisar(), this.INTERVALO_MS);

      // Al volver a la app (cambiar de pestaña, desbloquear el teléfono) es
      // cuando más probable es que haya un despliegue nuevo esperando.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.revisar();
      });
      window.addEventListener('online', () => void this.revisar());
    });
  }

  detener(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = undefined;
    this.iniciado = false;
  }

  /** Compara las huellas publicadas contra las que está corriendo esta pestaña. */
  async revisar(): Promise<void> {
    if (this.recargaEnMarcha) return;

    const [frontend, backend] = await Promise.all([
      this.leerJson<HuellaFrontend>('/version.json'),
      this.leerJson<HuellaBackend>(`${environment.apiUrl}/api/version`),
    ]);

    if (frontend?.version) {
      if (this.versionFrontend === null) {
        this.versionFrontend = frontend.version;
      } else if (this.versionFrontend !== frontend.version) {
        this.avisar('frontend');
      }
    }

    if (backend?.version) {
      if (this.versionBackend === null) {
        this.versionBackend = backend.version;
      } else if (this.versionBackend !== backend.version) {
        this.avisar('backend');
      }
    }

    // Aunque no haya cambiado version.json, se le pide al navegador que revise
    // el service worker: si hay uno esperando, también hay versión nueva.
    void this.pedirRevisionServiceWorker();
  }

  /**
   * Aplica la versión nueva: destraba el service worker que está esperando,
   * tira la caché vieja y recarga. Es lo que hace el botón "Actualizar".
   */
  async aplicar(): Promise<void> {
    if (this.aplicando()) return;
    this.aplicando.set(true);
    this.recargaEnMarcha = true;

    try {
      const registro = await this.registroSW();

      if (registro) {
        await registro.update().catch(() => undefined);
        const esperando = registro.waiting;
        if (esperando) {
          // El 'controllerchange' que dispara skipWaiting recarga la página
          // (ver vigilarServiceWorker). Si por lo que sea no llega, el
          // recargar() de más abajo lo cubre.
          esperando.postMessage({ type: 'SKIP_WAITING' });
          await this.esperar(600);
        }
      }

      await this.limpiarCaches();
    } catch {
      // Da igual por qué falló la limpieza: recargar es lo que importa.
    }

    this.recargar();
  }

  /** Descarta el aviso hasta que se publique otra versión. */
  posponer(): void {
    this.actualizacionDisponible.set(false);
    this.origen.set(null);
  }

  private avisar(origen: OrigenActualizacion): void {
    this.zone.run(() => {
      this.origen.set(origen);
      this.actualizacionDisponible.set(true);
    });
  }

  private async leerJson<T>(url: string): Promise<T | null> {
    try {
      const respuesta = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      });
      if (!respuesta.ok) return null;
      return (await respuesta.json()) as T;
    } catch {
      // Sin señal o el archivo no existe (por ejemplo en un build viejo): se
      // reintenta al minuto siguiente, no hay nada que reportar.
      return null;
    }
  }

  private async registroSW(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return (await navigator.serviceWorker.getRegistration()) ?? null;
    } catch {
      return null;
    }
  }

  private async pedirRevisionServiceWorker(): Promise<void> {
    const registro = await this.registroSW();
    if (!registro) return;
    if (registro.waiting) this.avisar('frontend');
    await registro.update().catch(() => undefined);
  }

  private vigilarServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return;

    void this.registroSW().then(registro => {
      if (!registro) return;

      if (registro.waiting) this.avisar('frontend');

      registro.addEventListener('updatefound', () => {
        const nuevo = registro.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          // 'installed' con un controlador activo = versión nueva lista y en
          // espera. Sin controlador es la primera instalación, ahí no hay nada
          // que avisar.
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            this.avisar('frontend');
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Solo recargamos cuando el cambio lo pidió el usuario desde el aviso.
      if (this.recargaEnMarcha) this.recargar();
    });
  }

  private async limpiarCaches(): Promise<void> {
    if (!('caches' in window)) return;
    const nombres = await caches.keys();
    await Promise.all(nombres.map(nombre => caches.delete(nombre)));
  }

  private recargar(): void {
    // El 'controllerchange' y el final de aplicar() pueden llegar los dos; la
    // recarga tiene que dispararse una sola vez.
    if (this.yaRecargue) return;
    this.yaRecargue = true;
    window.location.reload();
  }

  private esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
