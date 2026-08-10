import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { MessagePayload, Messaging, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type PushRole = 'admin' | 'campo';

/** Notificación que llega con la app abierta (foreground). */
export interface FcmForegroundMessage {
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  tag: string | null;
  data: Record<string, string>;
}

/**
 * Canal nativo de notificaciones: pide el token de Firebase al navegador, lo
 * registra en el backend y escucha los mensajes que llegan con la app abierta.
 *
 * Todo lo de aquí es opcional a propósito: si el navegador no soporta FCM (por
 * ejemplo Safari sin la PWA instalada) o Firebase no responde, el
 * PushNotificationService cae al Web Push con VAPID sin que el usuario se entere.
 */
@Injectable({ providedIn: 'root' })
export class FcmService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private readonly baseUrl = environment.apiUrl + '/api/push';

  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private tokenActual: string | null = null;
  private escuchando = false;

  /** Emite cuando llega una notificación con la app en primer plano. */
  readonly mensajeEnPrimerPlano$ = new Subject<FcmForegroundMessage>();

  /** El token vivo del dispositivo, si ya se obtuvo. */
  get token(): string | null {
    return this.tokenActual;
  }

  /** True si el navegador puede recibir push por Firebase. */
  async esCompatible(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
    if (!environment.firebase?.apiKey) return false;

    try {
      return await isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Pide el token y lo registra en el backend. Devuelve true si quedó listo.
   * Da por hecho que el permiso de notificaciones ya fue concedido.
   */
  async registrar(role: PushRole): Promise<boolean> {
    try {
      if (!(await this.esCompatible())) return false;
      if (Notification.permission !== 'granted') return false;

      const messaging = await this.getMessaging();
      if (!messaging) return false;

      const registration = await this.registrarServiceWorker();
      const vapidKey = environment.firebaseVapidKey?.trim();

      // Sin vapidKey propia el SDK usa la clave por defecto del proyecto, que
      // funciona igual: por eso el certificado push web es opcional.
      const token = await getToken(messaging, {
        ...(vapidKey ? { vapidKey } : {}),
        ...(registration ? { serviceWorkerRegistration: registration } : {}),
      });

      if (!token) return false;

      this.tokenActual = token;
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/device-token`, {
          token,
          role,
          platform: 'web',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })
      );

      this.escucharPrimerPlano(messaging);
      return true;
    } catch (err) {
      console.warn('[FCM] No se pudo registrar el dispositivo:', err);
      return false;
    }
  }

  /** Da de baja el token en el backend (cierre de sesión). */
  async darDeBaja(): Promise<void> {
    const token = this.tokenActual;
    this.tokenActual = null;
    if (!token) return;

    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/device-token/remove`, { token }));
    } catch (err) {
      console.warn('[FCM] No se pudo dar de baja el dispositivo:', err);
    }
  }

  private async getMessaging(): Promise<Messaging | null> {
    if (this.messaging) return this.messaging;

    try {
      this.app ??= initializeApp(environment.firebase);
      this.messaging = getMessaging(this.app);
      return this.messaging;
    } catch (err) {
      console.warn('[FCM] No se pudo inicializar Firebase:', err);
      return null;
    }
  }

  /**
   * Registra el service worker de Firebase. Si falla, seguimos: el SDK intenta
   * su registro por defecto en /firebase-messaging-sw.js.
   */
  private async registrarServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
    try {
      return await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope',
      });
    } catch (err) {
      console.warn('[FCM] No se pudo registrar firebase-messaging-sw.js:', err);
      return undefined;
    }
  }

  private escucharPrimerPlano(messaging: Messaging): void {
    if (this.escuchando) return;
    this.escuchando = true;

    onMessage(messaging, (payload: MessagePayload) => {
      const data = (payload.data ?? {}) as Record<string, string>;
      const notification = payload.notification;

      this.zone.run(() =>
        this.mensajeEnPrimerPlano$.next({
          tipo: data['tipo'] ?? 'generico',
          titulo: notification?.title ?? data['title'] ?? 'R&R Importaciones',
          mensaje: notification?.body ?? data['body'] ?? '',
          url: data['url'] ?? null,
          tag: data['tag'] ?? null,
          data,
        })
      );
    });
  }
}
