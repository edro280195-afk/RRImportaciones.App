import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { FcmService, PushRole } from './fcm.service';

export type { PushRole } from './fcm.service';

/**
 * Decide por dónde le llegan las notificaciones a este dispositivo.
 *
 * Primero intenta Firebase Cloud Messaging (el canal nativo). Si el navegador
 * no lo soporta o algo falla, cae al Web Push con VAPID, que es lo que se venía
 * usando. Nunca los dos a la vez: cuando Firebase queda registrado, se cancela
 * la suscripción VAPID vieja para que no lleguen notificaciones repetidas.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);
  private fcm = inject(FcmService);
  private readonly baseUrl = environment.apiUrl + '/api/push';
  private readonly vapidPublicKey = environment.vapidPublicKey;

  /** Canal que quedó activo en este dispositivo. */
  private canal: 'fcm' | 'webpush' | null = null;

  /** True si el navegador soporta service worker + push + notifications. */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Estado actual del permiso: 'granted' | 'denied' | 'default' | 'unsupported'.
   * Sirve para decidir si hay que ofrecerle al usuario un botón que lo pida —
   * Safari en iOS exige que `requestPermission()` salga de un gesto suyo, así
   * que pedirlo en el ngOnInit simplemente no funciona ahí.
   */
  permissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /** Canal en uso, para diagnóstico en pantalla. */
  canalActivo(): 'fcm' | 'webpush' | null {
    return this.canal;
  }

  /**
   * Deja al dispositivo listo para recibir notificaciones con el rol indicado.
   * Si el permiso ya fue denegado, sale silenciosamente.
   */
  async subscribe(role: PushRole): Promise<boolean> {
    try {
      if (!this.isSupported()) return false;

      // Pide permiso si no se ha pedido
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return false;

      if (await this.fcm.registrar(role)) {
        this.canal = 'fcm';
        // Este dispositivo pudo haber quedado suscrito al canal viejo: lo
        // soltamos para no recibir la misma notificación por partida doble.
        await this.cancelarWebPush();
        return true;
      }

      const ok = await this.suscribirWebPush(role);
      this.canal = ok ? 'webpush' : null;
      return ok;
    } catch (err) {
      console.warn('[Push] Error al suscribir:', err);
      return false;
    }
  }

  /** Suelta el dispositivo de los dos canales (cierre de sesión). */
  async unsubscribe(): Promise<void> {
    this.canal = null;
    await this.fcm.darDeBaja();
    await this.cancelarWebPush();
  }

  private async suscribirWebPush(role: PushRole): Promise<boolean> {
    if (!this.vapidPublicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });
    }

    const json = subscription.toJSON();
    const keys = (json.keys || {}) as { p256dh?: string; auth?: string };
    if (!json.endpoint || !keys.p256dh || !keys.auth) return false;

    await firstValueFrom(
      this.http.post(`${this.baseUrl}/subscribe`, {
        endpoint: json.endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        role,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
    );
    return true;
  }

  /** Cancela la suscripción VAPID local y la elimina del backend. */
  private async cancelarWebPush(): Promise<void> {
    try {
      if (!this.isSupported()) return;
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await firstValueFrom(this.http.post(`${this.baseUrl}/unsubscribe`, { endpoint }));
    } catch (err) {
      console.warn('[Push] Error al desuscribir del canal Web Push:', err);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      output[i] = rawData.charCodeAt(i);
    }
    return output;
  }
}
