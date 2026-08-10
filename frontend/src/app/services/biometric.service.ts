import { Injectable } from '@angular/core';

/**
 * Desbloqueo biométrico del módulo de campo (huella / Face ID) sobre WebAuthn.
 *
 * ALCANCE — importante: esto es un **candado local del dispositivo**, no una
 * autenticación contra el servidor. Se registra una credencial de plataforma y,
 * al superarla, se reanuda la sesión con el refresh token que la app ya guarda
 * en `localStorage`. No sustituye al PIN: es un atajo para no teclearlo cada vez
 * que el yardero vuelve a abrir la PWA, igual que hace la app Flutter.
 *
 * Consecuencia práctica: si el refresh token venció, la biometría no alcanza y
 * hay que volver al PIN. Por eso `unlock()` distingue ambos casos.
 *
 * Requiere contexto seguro (HTTPS o localhost).
 */
@Injectable({ providedIn: 'root' })
export class BiometricService {
  private readonly storageKey = (username: string) => `rr_campo_bio_${username}`;

  /** ¿El dispositivo tiene autenticador de plataforma (huella/rostro) usable? */
  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
      if (!window.isSecureContext) return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /** ¿Este usuario ya activó la biometría en este dispositivo? */
  isEnrolled(username: string): boolean {
    return !!localStorage.getItem(this.storageKey(username));
  }

  /**
   * Registra la huella/rostro del usuario en este dispositivo.
   * Devuelve false si el usuario cancela o el navegador no lo permite.
   */
  async enroll(username: string): Promise<boolean> {
    try {
      if (!(await this.isAvailable())) return false;

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: this.randomBytes(32),
          rp: { name: 'R&R Importaciones' },
          user: {
            id: new TextEncoder().encode(username),
            name: username,
            displayName: username,
          },
          // ES256 y RS256 cubren prácticamente todos los autenticadores actuales.
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60_000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (!credential) return false;
      localStorage.setItem(this.storageKey(username), this.toBase64(credential.rawId));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pide la huella/rostro. Devuelve true solo si el dispositivo la validó.
   * No prueba nada ante el servidor — ver la nota de alcance de la clase.
   */
  async verify(username: string): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.storageKey(username));
      if (!stored) return false;

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: this.randomBytes(32),
          allowCredentials: [{ type: 'public-key', id: this.fromBase64(stored) }],
          userVerification: 'required',
          timeout: 60_000,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  }

  /** Olvida la credencial de este usuario en este dispositivo. */
  clear(username: string): void {
    localStorage.removeItem(this.storageKey(username));
  }

  private randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  private toBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
