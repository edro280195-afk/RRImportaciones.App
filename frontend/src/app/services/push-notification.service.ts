import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type PushRole = 'admin' | 'campo';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/push';
  private readonly vapidPublicKey = environment.vapidPublicKey;

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
   * Suscribe al navegador a notificaciones push para el rol indicado.
   * Si el permiso ya fue denegado, sale silenciosamente.
   */
  async subscribe(role: PushRole): Promise<boolean> {
    try {
      if (!this.isSupported()) return false;
      if (!this.vapidPublicKey) return false;

      // Pide permiso si no se ha pedido
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return false;

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
    } catch (err) {
      console.warn('[Push] Error al suscribir:', err);
      return false;
    }
  }

  /** Cancela la suscripción local y la elimina del backend. */
  async unsubscribe(): Promise<void> {
    try {
      if (!this.isSupported()) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await firstValueFrom(this.http.post(`${this.baseUrl}/unsubscribe`, { endpoint }));
    } catch (err) {
      console.warn('[Push] Error al desuscribir:', err);
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
