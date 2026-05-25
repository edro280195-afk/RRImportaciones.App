import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, CampoUserDto } from '../../services/auth.service';

type PinScreen = 'select-user' | 'enter-pin' | 'set-pin' | 'confirm-pin' | 'lockout';

@Component({
  selector: 'app-campo-pin',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="login-wrapper" style="font-family: var(--font-body);">
      <!-- Panel Izquierdo: Animación Interactiva y Marca (Idéntica a Login) -->
      <div class="left-panel">
        <canvas #networkCanvas class="network-canvas"></canvas>
        <div class="brand-overlay">
          <div class="logo-box animate-fade-in-down">
            <img src="assets/imagenes/rr_logo.png" alt="R&R Logo" class="brand-logo" />
            <div class="brand-text">
              <span class="company-name">R&R Importaciones</span>
              <span class="company-sub">Terminal de Campo</span>
            </div>
          </div>

          <div class="headline-container animate-fade-in">
            <span class="system-tag">Módulo Operaciones</span>
            <h1 class="headline-title">Registro de datos e inspección en patio.</h1>
            <p class="headline-desc">
              Acceso rápido mediante PIN para operadores de yarda, verificación de unidades y
              captura de evidencias en tiempo real.
            </p>
          </div>

          <div class="connection-status animate-fade-in-up">
            <div class="pulse-dot"></div>
            <span>Servicio de Campo Activo</span>
          </div>
        </div>
      </div>

      <!-- Panel Derecho: Interfaz de PIN -->
      <div class="right-panel">
        <div class="bg-glow"></div>

        <div
          class="form-container"
          [class.shake]="shaking()"
          style="animation: fadeUp .32s cubic-bezier(.16,1,.3,1)"
        >
          <!-- Logo móvil (oculto en pantallas grandes) -->
          <div class="mobile-logo-box">
            <img src="assets/imagenes/rr_logo.png" alt="R&R Logo" class="mobile-logo" />
            <div>
              <span class="mobile-brand-title">R&R Campo</span>
              <span class="mobile-brand-sub">Acceso por PIN</span>
            </div>
          </div>

          <!-- PANTALLA: SELECCIONAR USUARIO -->
          @if (screen() === 'select-user') {
            <div class="welcome-header">
              <h2>¿Quién eres?</h2>
              <p>Selecciona tu usuario de campo para ingresar.</p>
            </div>

            <div class="pin-card user-card-list">
              @if (loadingUsers()) {
                <div class="user-list-skeleton">
                  @for (i of [1, 2, 3]; track i) {
                    <div class="user-row-skeleton"></div>
                  }
                </div>
              } @else {
                <div class="user-list">
                  @for (u of campoUsers(); track u.id) {
                    <button class="user-row" (click)="selectUser(u)">
                      <div class="user-avatar">{{ initial(u.nombre) }}</div>
                      <div class="user-info">
                        <span class="user-name"
                          >{{ u.nombre }}{{ u.apellidos ? ' ' + u.apellidos : '' }}</span
                        >
                        <span class="user-status">{{
                          u.tienePin ? 'PIN configurado' : 'Necesita configurar PIN'
                        }}</span>
                      </div>
                      <svg
                        class="user-chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  } @empty {
                    <p class="no-users">
                      No hay usuarios de campo configurados.<br />Contacta al administrador.
                    </p>
                  }
                </div>
              }
            </div>

            <!-- Botón para ir al portal administrativo -->
            <div class="action-footer">
              <a routerLink="/login" class="back-to-portal-btn">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="arrow-icon-back"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                <span>Volver al Portal Administrativo</span>
              </a>
            </div>
          }

          <!-- PANTALLA: INGRESAR PIN -->
          @if (screen() === 'enter-pin') {
            <div class="pin-header-box">
              <button class="back-to-list-btn" (click)="goBack()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7-7-7 7-7" />
                </svg>
                <span>Volver a lista de operadores</span>
              </button>

              <div class="user-badge-header">
                <div class="avatar-large">{{ initial(selectedUser()?.nombre || '') }}</div>
                <div class="user-badge-details">
                  <p class="avatar-name">
                    {{ selectedUser()?.nombre }} {{ selectedUser()?.apellidos || '' }}
                  </p>
                  <p class="avatar-username">{{ '@' + selectedUser()?.username }}</p>
                </div>
              </div>
            </div>

            <div class="pin-card text-center">
              <div class="dots-row" [class.dots-error]="pinError()">
                @for (i of [0, 1, 2, 3, 4, 5]; track i) {
                  <div class="dot" [class.dot-filled]="pin().length > i"></div>
                }
              </div>

              @if (pinError()) {
                <p class="pin-error-msg animate-shake">{{ pinError() }}</p>
              } @else {
                <p class="pin-hint">Ingresa tu PIN de 6 dígitos</p>
              }

              <!-- Teclado Numérico Tactil (Optimizado para 36°C) -->
              <div class="keypad">
                @for (key of keys; track key) {
                  @if (key === 'backspace') {
                    <button
                      class="key key-action"
                      (click)="pressKey(key)"
                      [disabled]="pin().length === 0"
                      aria-label="Borrar"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7l5 7-5 7z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m15 12-3 3m0-3 3 3"
                        />
                      </svg>
                    </button>
                  } @else if (key === 'bio') {
                    <button
                      class="key key-action key-bio"
                      (click)="triggerBiometric()"
                      [disabled]="true"
                      title="Próximamente: biometría"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M8 12s1 2 4 2 4-2 4-2"
                        />
                        <line
                          x1="9"
                          y1="9"
                          x2="9.01"
                          y2="9"
                          stroke-linecap="round"
                          stroke-width="2"
                        />
                        <line
                          x1="15"
                          y1="9"
                          x2="15.01"
                          y2="9"
                          stroke-linecap="round"
                          stroke-width="2"
                        />
                      </svg>
                    </button>
                  } @else {
                    <button class="key" (click)="pressKey(key)">
                      <span class="key-num">{{ key }}</span>
                      <span class="key-sub">{{ keySub[key] }}</span>
                    </button>
                  }
                }
              </div>

              <!-- Olvidé mi PIN -->
              <div class="forgot-pin-container">
                @if (resetRequested()) {
                  <div class="reset-alert animate-bounce-in">
                    <span class="reset-alert-icon">✓</span>
                    <div>
                      <p class="reset-alert-title">Solicitud enviada</p>
                      <p class="reset-alert-text">
                        Tu administrador ha sido notificado. Solicítale tu nuevo PIN.
                      </p>
                    </div>
                  </div>
                } @else {
                  <button
                    type="button"
                    class="forgot-pin-btn"
                    (click)="requestPinReset()"
                    [disabled]="requestingReset()"
                  >
                    {{
                      requestingReset()
                        ? 'Enviando solicitud...'
                        : '¿Olvidaste tu PIN? Solicitar restablecer'
                    }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- PANTALLA: CONFIGURAR PIN -->
          @if (screen() === 'set-pin' || screen() === 'confirm-pin') {
            <div class="pin-header-box">
              <button class="back-to-list-btn" (click)="goBack()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7-7-7 7-7" />
                </svg>
                <span>Volver a lista de operadores</span>
              </button>

              <div class="setup-header-details">
                <h1 class="pin-title">
                  {{ screen() === 'set-pin' ? 'Crea tu PIN' : 'Confirma tu PIN' }}
                </h1>
                <p class="pin-sub">
                  {{
                    screen() === 'set-pin'
                      ? 'Elige 6 dígitos de seguridad'
                      : 'Re-ingresa los 6 dígitos elegidos'
                  }}
                </p>
                <div class="setup-user-badge">
                  Operador: {{ selectedUser()?.nombre }} ({{ '@' + selectedUser()?.username }})
                </div>
              </div>
            </div>

            <div class="pin-card text-center">
              <div class="dots-row" [class.dots-error]="pinError()">
                @for (i of [0, 1, 2, 3, 4, 5]; track i) {
                  <div class="dot" [class.dot-filled]="pin().length > i"></div>
                }
              </div>

              @if (pinError()) {
                <p class="pin-error-msg animate-shake">{{ pinError() }}</p>
              }

              <div class="keypad">
                @for (key of keys; track key) {
                  @if (key === 'backspace') {
                    <button
                      class="key key-action"
                      (click)="pressKey(key)"
                      [disabled]="pin().length === 0"
                      aria-label="Borrar"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7l5 7-5 7z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m15 12-3 3m0-3 3 3"
                        />
                      </svg>
                    </button>
                  } @else if (key === 'bio') {
                    <button class="key key-action" style="opacity:0;pointer-events:none"></button>
                  } @else {
                    <button class="key" (click)="pressKey(key)">
                      <span class="key-num">{{ key }}</span>
                      <span class="key-sub">{{ keySub[key] }}</span>
                    </button>
                  }
                }
              </div>
            </div>
          }

          <!-- PANTALLA: LOCKOUT -->
          @if (screen() === 'lockout') {
            <div class="pin-card lockout-card text-center">
              <div class="lockout-icon">🔒</div>
              <h2 class="pin-title">Acceso Bloqueado</h2>
              <p class="pin-sub">Demasiados intentos fallidos</p>
              <div class="lockout-timer">{{ lockoutRemaining() }}s</div>
              <p class="pin-hint">Por favor, espera para volver a intentar</p>
            </div>
          }

          @if (loading()) {
            <div class="pin-loading-overlay">
              <div class="spinner"></div>
            </div>
          }

          <p class="copyright">
            &copy; {{ currentYear }} R&amp;R Importaciones. Terminal de Campo.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        min-height: 100dvh;
        display: flex;
        background: #ffffff;
      }

      /* Panel Izquierdo */
      .left-panel {
        display: none;
        width: 460px;
        position: relative;
        background: #090b0f;
        overflow: hidden;
        flex-shrink: 0;
      }
      @media (min-width: 1024px) {
        .left-panel {
          display: block;
        }
      }

      .network-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        opacity: 0.85;
      }

      .brand-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        display: flex;
        flex-direction: column;
        padding: 48px;
        justify-content: space-between;
        pointer-events: none;
        background: linear-gradient(to bottom, rgba(9, 11, 15, 0.45) 0%, rgba(9, 11, 15, 0.9) 100%);
      }

      .logo-box {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand-logo {
        width: 44px;
        height: 44px;
        object-fit: contain;
      }
      .brand-text {
        display: flex;
        flex-direction: column;
      }
      .company-name {
        color: #ffffff;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.3px;
        line-height: 1.2;
      }
      .company-sub {
        color: rgba(255, 255, 255, 0.45);
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.8px;
      }

      .headline-container {
        max-width: 340px;
        margin-top: 40px;
        margin-bottom: auto;
      }
      .system-tag {
        display: inline-block;
        background: rgba(198, 29, 38, 0.15);
        border: 1px solid rgba(198, 29, 38, 0.35);
        color: #ff5a5f;
        font-size: 10px;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 18px;
      }
      .headline-title {
        color: #ffffff;
        font-size: 28px;
        font-weight: 800;
        line-height: 1.25;
        letter-spacing: -0.8px;
        margin-bottom: 14px;
      }
      .headline-desc {
        color: rgba(255, 255, 255, 0.55);
        font-size: 14px;
        line-height: 1.55;
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(255, 255, 255, 0.45);
        font-size: 12px;
        font-weight: 600;
      }
      .pulse-dot {
        width: 6px;
        height: 6px;
        background: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 8px #10b981;
        animation: pulseAnim 2.2s infinite;
      }
      @keyframes pulseAnim {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
        }
      }

      /* Panel Derecho */
      .right-panel {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        background: #f9fafb;
        position: relative;
        overflow: hidden;
      }
      .bg-glow {
        position: absolute;
        top: -10%;
        right: -10%;
        width: 450px;
        height: 450px;
        background: radial-gradient(circle, rgba(198, 29, 38, 0.04) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
      .form-container {
        width: 100%;
        max-width: 380px;
        z-index: 1;
      }

      .mobile-logo-box {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 32px;
      }
      @media (min-width: 1024px) {
        .mobile-logo-box {
          display: none;
        }
      }
      .mobile-logo {
        width: 40px;
        height: 40px;
        object-fit: contain;
      }
      .mobile-brand-title {
        display: block;
        color: #0f172a;
        font-weight: 800;
        font-size: 15px;
        line-height: 1.2;
      }
      .mobile-brand-sub {
        display: block;
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .welcome-header h2 {
        color: #0f172a;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.6px;
        margin: 0 0 4px;
      }
      .welcome-header p {
        color: #64748b;
        font-size: 14px;
        margin: 0 0 26px;
      }

      /* Tarjeta de PIN y Contenedor */
      .pin-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 24px;
        padding: 28px;
        box-shadow:
          0 10px 30px -5px rgba(0, 0, 0, 0.03),
          0 8px 12px -6px rgba(0, 0, 0, 0.02);
      }
      .user-card-list {
        padding: 20px;
      }
      .text-center {
        text-align: center;
      }

      /* Lista de Usuarios */
      .user-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 320px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .user-list::-webkit-scrollbar {
        width: 5px;
      }
      .user-list::-webkit-scrollbar-thumb {
        background: #e5e7eb;
        border-radius: 99px;
      }
      .user-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 12px 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }
      .user-row:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        transform: translateY(-0.5px);
      }
      .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #c61d26;
        color: #ffffff;
        display: grid;
        place-items: center;
        font-size: 16px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .user-info {
        flex: 1;
        min-width: 0;
      }
      .user-name {
        display: block;
        color: #0f172a;
        font-size: 14.5px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .user-status {
        display: block;
        color: #64748b;
        font-size: 11.5px;
        margin-top: 1px;
      }
      .user-chevron {
        width: 16px;
        height: 16px;
        color: #9ca3af;
        flex-shrink: 0;
      }
      .no-users {
        color: #64748b;
        font-size: 13.5px;
        text-align: center;
        padding: 24px 0;
        line-height: 1.6;
      }

      /* Skeleton Loading */
      .user-list-skeleton {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .user-row-skeleton {
        height: 64px;
        border-radius: 16px;
        background: #f3f4f6;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 0.6;
        }
        50% {
          opacity: 1;
        }
      }

      /* Cabecera del PIN (Volver y detalles del usuario) */
      .pin-header-box {
        margin-bottom: 20px;
      }
      .back-to-list-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #4b5563;
        font-size: 12.5px;
        font-weight: 700;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        padding: 8px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 16px;
      }
      .back-to-list-btn:hover {
        background: #e5e7eb;
        color: #111827;
      }
      .back-to-list-btn svg {
        width: 15px;
        height: 15px;
      }

      .user-badge-header {
        display: flex;
        align-items: center;
        gap: 14px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 12px 16px;
        border-radius: 18px;
      }
      .avatar-large {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #c61d26;
        color: #ffffff;
        display: grid;
        place-items: center;
        font-size: 20px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .user-badge-details {
        min-width: 0;
      }
      .avatar-name {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .avatar-username {
        margin: 1px 0 0 0;
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
      }

      /* Configuración de PIN */
      .setup-header-details {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 16px;
        border-radius: 20px;
        text-align: center;
      }
      .setup-header-details .pin-title {
        font-size: 18px;
        font-weight: 800;
        margin: 0 0 2px 0;
        color: #0f172a;
      }
      .setup-header-details .pin-sub {
        font-size: 12.5px;
        margin: 0 0 10px 0;
        color: #64748b;
      }
      .setup-user-badge {
        display: inline-block;
        background: #f3f4f6;
        padding: 4px 12px;
        border-radius: 99px;
        font-size: 11.5px;
        font-weight: 700;
        color: #374151;
      }

      /* Dots */
      .dots-row {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin: 8px 0 16px;
      }
      .dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #d1d5db;
        background: transparent;
        transition: all 0.12s ease;
      }
      .dot-filled {
        background: #0f172a;
        border-color: #0f172a;
        transform: scale(1.15);
      }
      .dots-error .dot-filled {
        background: #dc2626;
        border-color: #dc2626;
      }

      .pin-hint {
        color: #64748b;
        font-size: 12.5px;
        margin: 0 0 20px;
      }
      .pin-error-msg {
        color: #dc2626;
        font-size: 12.5px;
        font-weight: 700;
        margin: 0 0 20px;
      }

      /* Teclado Numérico */
      .keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        width: 100%;
        max-width: 280px;
        margin: 0 auto;
      }
      .key {
        aspect-ratio: 1;
        border-radius: 50%;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        color: #0f172a;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        min-height: 60px;
        user-select: none;
      }
      .key:hover {
        background: #e5e7eb;
        border-color: #d1d5db;
      }
      .key:active {
        transform: scale(0.92);
        background: #d1d5db;
      }
      .key-num {
        font-size: 20px;
        font-weight: 800;
        line-height: 1;
      }
      .key-sub {
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #64748b;
        text-transform: uppercase;
      }
      .key-action {
        background: transparent;
        border-color: transparent;
      }
      .key-action:hover {
        background: #f3f4f6;
        border-color: #e5e7eb;
      }
      .key-action:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .key-action svg {
        width: 20px;
        height: 20px;
        color: #4b5563;
      }
      .key-bio {
        opacity: 0.35;
      }

      /* Olvidé mi PIN / Alerta */
      .forgot-pin-container {
        margin-top: 16px;
      }
      .forgot-pin-btn {
        background: none;
        border: none;
        color: #c61d26;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        padding: 6px 12px;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .forgot-pin-btn:hover {
        background: #fff5f5;
      }
      .forgot-pin-btn:active {
        transform: scale(0.98);
      }
      .reset-alert {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #15803d;
        border-radius: 14px;
        padding: 12px 14px;
        text-align: left;
        font-size: 13px;
      }
      .reset-alert-icon {
        background: #dcfce7;
        color: #166534;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: bold;
        flex-shrink: 0;
      }
      .reset-alert-title {
        font-weight: 700;
        margin: 0 0 2px 0;
      }
      .reset-alert-text {
        margin: 0;
        font-size: 11.5px;
        color: #14532d;
        line-height: 1.4;
      }

      /* Lockout */
      .lockout-card {
        padding: 36px 24px;
      }
      .lockout-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
      .lockout-timer {
        font-size: 48px;
        font-weight: 800;
        color: #dc2626;
        margin: 12px 0;
      }

      /* Loading overlay */
      .pin-loading-overlay {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 24px;
        display: grid;
        place-items: center;
        z-index: 10;
      }
      .spinner {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid #e5e7eb;
        border-top-color: #c61d26;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Botones de pie */
      .action-footer {
        margin-top: 24px;
        display: flex;
        justify-content: center;
      }
      .back-to-portal-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 10px 18px;
        border-radius: 14px;
        font-size: 13px;
        font-weight: 700;
        color: #4b5563;
        text-decoration: none;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01);
      }
      .back-to-portal-btn:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        color: #111827;
        transform: translateY(-0.5px);
      }
      .arrow-icon-back {
        width: 15px;
        height: 15px;
        transition: transform 0.2s;
      }
      .back-to-portal-btn:hover .arrow-icon-back {
        transform: translateX(-3px);
      }

      .copyright {
        text-align: center;
        color: #9ca3af;
        font-size: 11.5px;
        margin-top: 28px;
      }

      /* Keyframe Animations */
      .animate-fade-in {
        animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-fade-in-down {
        animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-shake {
        animation: shake 0.4s ease-in-out;
      }
      .animate-bounce-in {
        animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-24px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(24px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes shake {
        0%,
        100% {
          transform: translateX(0);
        }
        20%,
        60% {
          transform: translateX(-6px);
        }
        40%,
        80% {
          transform: translateX(6px);
        }
      }
      @keyframes bounceIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Shaking for invalid PIN input */
      .shake .dots-row {
        animation: shakeX 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
      }
      @keyframes shakeX {
        0%,
        100% {
          transform: translateX(0);
        }
        20%,
        60% {
          transform: translateX(-8px);
        }
        40%,
        80% {
          transform: translateX(8px);
        }
      }

      @media (max-height: 700px) {
        .pin-card {
          padding: 20px;
        }
        .avatar-large {
          width: 40px;
          height: 40px;
          font-size: 16px;
        }
        .keypad {
          gap: 8px;
        }
        .key {
          min-height: 54px;
        }
        .key-num {
          font-size: 18px;
        }
      }
    `,
  ],
})
export class CampoPinComponent implements OnInit, OnDestroy, AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('networkCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId?: number;
  private points: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];
  private mouse = { x: -1000, y: -1000 };

  screen = signal<PinScreen>('select-user');
  campoUsers = signal<CampoUserDto[]>([]);
  loadingUsers = signal(true);
  selectedUser = signal<CampoUserDto | null>(null);
  pin = signal('');
  pinError = signal('');
  shaking = signal(false);
  loading = signal(false);
  attempts = signal(0);
  lockoutRemaining = signal(0);
  private lockoutTimer?: ReturnType<typeof setInterval>;
  private firstPin = '';

  requestingReset = signal(false);
  resetRequested = signal(false);
  currentYear = new Date().getFullYear();

  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'bio'];
  readonly keySub: Record<string, string> = {
    '2': 'ABC',
    '3': 'DEF',
    '4': 'GHI',
    '5': 'JKL',
    '6': 'MNO',
    '7': 'PQRS',
    '8': 'TUV',
    '9': 'WXYZ',
    '0': '',
    '1': '',
    backspace: '',
    bio: '',
  };

  ngOnInit(): void {
    // Si ya hay sesión activa con permiso de campo, ir directo
    if (this.auth.isAuthenticated() && this.auth.can('CAMPO_USAR')) {
      this.router.navigate(['/campo']);
      return;
    }

    // Intentar recordar el último usuario
    const saved = localStorage.getItem('campo_username');
    if (saved) {
      this.auth.getCampoUsers().subscribe({
        next: users => {
          this.campoUsers.set(users);
          const user = users.find(u => u.username === saved);
          if (user) {
            this.selectedUser.set(user);
            this.screen.set(user.tienePin ? 'enter-pin' : 'set-pin');
          }
          this.loadingUsers.set(false);
        },
        error: () => this.loadingUsers.set(false),
      });
    } else {
      this.auth.getCampoUsers().subscribe({
        next: users => {
          this.campoUsers.set(users);
          this.loadingUsers.set(false);
        },
        error: () => this.loadingUsers.set(false),
      });
    }
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    this.generatePoints();

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseleave', this.onMouseLeave);

    this.tick();
  }

  ngOnDestroy(): void {
    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    if (this.animationId) cancelAnimationFrame(this.animationId);

    window.removeEventListener('resize', this.onResize);
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.onMouseMove);
      canvas.removeEventListener('mouseleave', this.onMouseLeave);
    }
  }

  private onResize = (): void => {
    this.resizeCanvas();
    this.generatePoints();
  };

  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || 460;
    canvas.height = canvas.parentElement?.clientHeight || 800;
  }

  private generatePoints(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.points = [];
    const count = Math.min(45, Math.floor((canvas.width * canvas.height) / 8000));

    for (let i = 0; i < count; i++) {
      this.points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1.2,
      });
    }
  }

  private onMouseMove = (e: MouseEvent): void => {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  };

  private onMouseLeave = (): void => {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  };

  private tick = (): void => {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar fondo sutil oscuro
    this.ctx.fillStyle = '#090B0F';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar conexiones y actualizar puntos
    const maxDist = 110;
    const mouseDist = 150;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      p.x += p.vx;
      p.y += p.vy;

      // Colisión contra bordes
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // Efecto gravedad suave hacia el mouse si está cerca
      if (this.mouse.x > 0) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseDist) {
          const force = ((mouseDist - dist) / mouseDist) * 0.12;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      // Dibujar punto con un brillo interactivo más fuerte si está cerca del mouse
      let pointAlpha = 0.55;
      let pointRadius = p.radius;
      if (this.mouse.x > 0) {
        const distToMouse = Math.hypot(this.mouse.x - p.x, this.mouse.y - p.y);
        if (distToMouse < mouseDist) {
          pointAlpha = 0.9 - (distToMouse / mouseDist) * 0.35;
          pointRadius = p.radius * (1.5 - (distToMouse / mouseDist) * 0.5);
        }
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(198, 29, 38, ${pointAlpha})`; // Rojo corporativo R&R
      this.ctx.fill();

      // Enlaces interactivos entre los propios puntos
      for (let j = i + 1; j < this.points.length; j++) {
        const p2 = this.points[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDist) {
          const alpha = ((maxDist - dist) / maxDist) * 0.16;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);

          let isNearMouse = false;
          if (this.mouse.x > 0) {
            const mDist1 = Math.hypot(this.mouse.x - p.x, this.mouse.y - p.y);
            const mDist2 = Math.hypot(this.mouse.x - p2.x, this.mouse.y - p2.y);
            if (mDist1 < mouseDist && mDist2 < mouseDist) {
              isNearMouse = true;
            }
          }

          if (isNearMouse) {
            this.ctx.strokeStyle = `rgba(198, 29, 38, ${alpha * 2.5})`;
            this.ctx.lineWidth = 1.2;
          } else {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.lineWidth = 0.7;
          }
          this.ctx.stroke();
        }
      }

      // Enlace dinámico directo de los puntos al cursor
      if (this.mouse.x > 0) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouseDist) {
          const alpha = ((mouseDist - dist) / mouseDist) * 0.22;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.strokeStyle = `rgba(198, 29, 38, ${alpha})`;
          this.ctx.lineWidth = 0.9;
          this.ctx.stroke();
        }
      }
    }

    this.animationId = requestAnimationFrame(this.tick);
  };

  initial(nombre: string): string {
    return (nombre || '?').charAt(0).toUpperCase();
  }

  selectUser(user: CampoUserDto): void {
    this.selectedUser.set(user);
    this.pin.set('');
    this.pinError.set('');
    this.screen.set(user.tienePin ? 'enter-pin' : 'set-pin');
    localStorage.setItem('campo_username', user.username);
  }

  goBack(): void {
    this.screen.set('select-user');
    this.pin.set('');
    this.pinError.set('');
    this.resetRequested.set(false);
    localStorage.removeItem('campo_username');
  }

  requestPinReset(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.requestingReset.set(true);
    this.auth.requestPinReset(user.username).subscribe({
      next: () => {
        this.requestingReset.set(false);
        this.resetRequested.set(true);
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      },
      error: (err: Error) => {
        this.requestingReset.set(false);
        this.pinError.set(err.message || 'Error al enviar solicitud de reinicio');
      },
    });
  }

  pressKey(key: string): void {
    if (key === 'backspace') {
      this.pin.set(this.pin().slice(0, -1));
      this.pinError.set('');
      return;
    }
    if (key === 'bio' || this.pin().length >= 6) return;

    // vibration feedback
    if ('vibrate' in navigator) navigator.vibrate(8);

    const newPin = this.pin() + key;
    this.pin.set(newPin);

    if (newPin.length === 6) {
      // Small delay so last dot fills visually before action
      setTimeout(() => this.submitPin(newPin), 80);
    }
  }

  triggerBiometric(): void {
    // Placeholder — se implementa en la siguiente fase
  }

  private submitPin(pin: string): void {
    const screen = this.screen();
    if (screen === 'enter-pin') this.doLogin(pin);
    else if (screen === 'set-pin') this.doSetPinStep1(pin);
    else if (screen === 'confirm-pin') this.doSetPinConfirm(pin);
  }

  private doLogin(pin: string): void {
    const user = this.selectedUser();
    if (!user) return;

    this.loading.set(true);
    this.auth.pinLogin({ username: user.username, pin }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.needsSetPin) {
          this.pin.set('');
          this.screen.set('set-pin');
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/campo';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.pin.set('');
        this.attempts.update(a => a + 1);

        if (this.attempts() >= 5) {
          this.startLockout();
          return;
        }

        const remaining = 5 - this.attempts();
        this.pinError.set(
          `PIN incorrecto. ${remaining} intento${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'}.`
        );
        this.triggerShake();
      },
    });
  }

  private doSetPinStep1(pin: string): void {
    this.firstPin = pin;
    this.pin.set('');
    this.pinError.set('');
    this.screen.set('confirm-pin');
  }

  private doSetPinConfirm(pin: string): void {
    if (pin !== this.firstPin) {
      this.pin.set('');
      this.pinError.set('Los PIN no coinciden. Intenta de nuevo.');
      this.triggerShake();
      this.screen.set('set-pin');
      this.firstPin = '';
      return;
    }

    const user = this.selectedUser();
    if (!user) return;

    this.loading.set(true);
    const onSaved = () => {
      this.loading.set(false);
      if ('vibrate' in navigator) navigator.vibrate([50, 50, 100]);
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/campo';
      this.router.navigateByUrl(returnUrl);
    };
    const onError = (err: Error) => {
      this.loading.set(false);
      this.pinError.set(err.message || 'Error al guardar el PIN. Intenta de nuevo.');
      this.pin.set('');
      this.screen.set('set-pin');
      this.firstPin = '';
    };

    if (this.auth.isAuthenticated()) {
      this.auth.setPin(pin).subscribe({ next: onSaved, error: onError });
    } else {
      this.auth.setInitialCampoPin(user.username, pin).subscribe({ next: onSaved, error: onError });
    }
  }

  private triggerShake(): void {
    this.shaking.set(true);
    if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);
    setTimeout(() => this.shaking.set(false), 500);
  }

  private startLockout(): void {
    this.screen.set('lockout');
    this.lockoutRemaining.set(30);
    this.lockoutTimer = setInterval(() => {
      this.lockoutRemaining.update(n => {
        if (n <= 1) {
          clearInterval(this.lockoutTimer);
          this.attempts.set(0);
          this.pin.set('');
          this.pinError.set('');
          this.screen.set('enter-pin');
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }
}
