import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  QueryList,
  ViewChildren,
  ViewChild,
  ElementRef,
  signal,
  HostListener,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'password' | 'pin';
type Step = 'credentials' | 'pin-setup' | 'forgot-pin';

const OTP_LOGIN   = 'otpLogin';
const OTP_NEW     = 'otpNew';
const OTP_CONFIRM = 'otpConfirm';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="layout">

  <!-- ══════════════════════════════════════
       Panel izquierdo — Marca (solo desktop)
  ══════════════════════════════════════ -->
  <aside class="brand-panel" aria-hidden="true">
    <canvas class="brand-canvas" #brandCanvas></canvas>
    <div class="orb orb-a"></div>
    <div class="orb orb-b"></div>

    <div class="brand-inner">
      <div class="brand-logo-row">
        <div class="brand-logo-wrap">
          <img src="assets/imagenes/rr_logo.png" class="brand-img" alt="" />
        </div>
        <div>
          <p class="brand-company">R&amp;R Importaciones</p>
          <p class="brand-sub">Agencia Aduanal</p>
        </div>
      </div>

      <div class="brand-rule"></div>

      <div class="brand-body">
        <h2 class="brand-headline">Gestión aduanal.<br><span class="brand-accent">Sin fricciones.</span></h2>
        <p class="brand-desc">Cotizaciones, trámites, pedimentos y operaciones de patio — todo en un solo sistema, en tiempo real.</p>
      </div>

      <div class="brand-modules">
        <span class="mod-chip"><span class="mod-dot" style="background:#C61D26"></span>Cotizaciones</span>
        <span class="mod-chip"><span class="mod-dot" style="background:#F59E0B"></span>Pedimentos</span>
        <span class="mod-chip"><span class="mod-dot" style="background:#10B981"></span>Patio</span>
        <span class="mod-chip"><span class="mod-dot" style="background:#3B82F6"></span>Clientes</span>
      </div>

      <div class="brand-status">
        <span class="status-dot"></span>
        <span>Sistema operativo — {{ currentYear }}</span>
      </div>
    </div>
  </aside>

  <!-- ══════════════════════════════════════
       Panel derecho — Formulario
  ══════════════════════════════════════ -->
  <main class="form-panel">

    <div class="mobile-brand">
      <img src="assets/imagenes/rr_logo.png" class="mobile-brand-img" alt="R&R" />
      <p class="mobile-brand-name">R&amp;R Importaciones</p>
    </div>

    <div class="form-scroll">
      <div class="card-wrap">
        <div class="form-card">

          @if (sessionExpiredToast()) {
            <div class="alert alert-warn" role="alert">
              <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <span>Tu sesión expiró. Inicia sesión de nuevo.</span>
              <button class="alert-close" (click)="sessionExpiredToast.set(false)" aria-label="Cerrar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          }

          <!-- ─── PASO: Credenciales ─── -->
          @if (step() === 'credentials') {
            <div class="step-block">

              <div class="card-header">
                <div class="logo-wrap">
                  <div class="logo-halo"></div>
                  <div class="logo-face">
                    <img src="assets/imagenes/rr_logo.png" class="logo-img" alt="R&R" />
                  </div>
                </div>
                <h1 class="step-title">Bienvenido</h1>
                <p class="step-sub">Ingresa tus credenciales para acceder al sistema.</p>
              </div>

              @if (error()) {
                <div class="alert alert-error animate-in" role="alert">
                  <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{{ error() }}</span>
                </div>
              }

              <form (ngSubmit)="onSubmit()" autocomplete="on" novalidate>

                <div class="field">
                  <input
                    id="username" name="username" type="text"
                    placeholder="x" autocomplete="username"
                    [(ngModel)]="username" [disabled]="loading()"
                    (keyup.enter)="onSubmit()"
                  />
                  <label for="username">Usuario</label>
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>

                <div class="mode-tabs" role="tablist">
                  <button type="button" role="tab" class="mode-tab" [class.active]="mode() === 'password'"
                    (click)="setMode('password')" [attr.aria-selected]="mode() === 'password'">
                    <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    Contraseña
                  </button>
                  <button type="button" role="tab" class="mode-tab" [class.active]="mode() === 'pin'"
                    (click)="setMode('pin')" [attr.aria-selected]="mode() === 'pin'">
                    <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    PIN de acceso
                  </button>
                </div>

                @if (mode() === 'password') {
                  <div class="field">
                    <input
                      id="password" name="password"
                      [type]="passShowing ? 'text' : 'password'"
                      placeholder="x" autocomplete="current-password"
                      [(ngModel)]="password" [disabled]="loading()"
                      (keyup.enter)="onSubmit()"
                    />
                    <label for="password">Contraseña</label>
                    <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <button type="button" class="toggle-pass" (click)="togglePass()">
                      @if (passShowing) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                    </button>
                  </div>
                }

                @if (mode() === 'pin') {
                  <div class="field-group">
                    <div class="pin-label-row">
                      <label class="label-field">PIN de 6 dígitos</label>
                      <button type="button" class="link-btn" (click)="goForgotPin()">¿Olvidaste tu PIN?</button>
                    </div>
                    <div class="otp-row" role="group" aria-label="Ingresa tu PIN de 6 dígitos">
                      @for (i of digits; track i) {
                        <input
                          #otpLogin type="text" inputmode="numeric" maxlength="1"
                          class="otp-box" [attr.aria-label]="'Dígito ' + (i + 1)"
                          (input)="onOtpInput($event, i, otpLoginBoxes, 'pinLogin')"
                          (keydown)="onOtpKeyDown($event, i, otpLoginBoxes, 'pinLogin')"
                          (paste)="onOtpPaste($event, otpLoginBoxes, 'pinLogin')"
                          (focus)="onOtpFocus($event)"
                        />
                      }
                    </div>
                  </div>
                }

                <button type="submit" class="btn" [class.is-loading]="loading()" [disabled]="loading()">
                  <span class="btn-shimmer"></span>
                  <span class="btn-content">
                    @if (loading()) {
                      <span class="btn-dots"><span></span><span></span><span></span></span>
                    } @else {
                      <span class="btn-text-wrap">
                        <span>Ingresar al sistema</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </span>
                    }
                  </span>
                </button>

              </form>
            </div>
          }

          <!-- ─── PASO: Configurar PIN ─── -->
          @if (step() === 'pin-setup') {
            <div class="step-block">
              <div class="step-badge">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="step-badge-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Primer acceso
              </div>
              <h1 class="step-title">Configura tu PIN</h1>
              <p class="step-sub">Elige 6 dígitos para tu acceso rápido. Úsalos la próxima vez en lugar de tu contraseña.</p>

              @if (error()) {
                <div class="alert alert-error animate-in" role="alert">
                  <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{{ error() }}</span>
                </div>
              }

              <div class="field-group">
                <label class="label-field">PIN nuevo</label>
                <div class="otp-row" role="group" aria-label="Ingresa tu nuevo PIN">
                  @for (i of digits; track i) {
                    <input
                      #otpNew type="text" inputmode="numeric" maxlength="1" class="otp-box"
                      [attr.aria-label]="'Dígito ' + (i + 1) + ' del nuevo PIN'"
                      (input)="onOtpInput($event, i, otpNewBoxes, 'pinNew')"
                      (keydown)="onOtpKeyDown($event, i, otpNewBoxes, 'pinNew')"
                      (paste)="onOtpPaste($event, otpNewBoxes, 'pinNew')"
                      (focus)="onOtpFocus($event)"
                    />
                  }
                </div>
              </div>

              <div class="field-group">
                <label class="label-field">Confirmar PIN</label>
                <div class="otp-row" role="group" aria-label="Confirma tu nuevo PIN">
                  @for (i of digits; track i) {
                    <input
                      #otpConfirm type="text" inputmode="numeric" maxlength="1"
                      class="otp-box"
                      [class.otp-mismatch]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"
                      [attr.aria-label]="'Dígito ' + (i + 1) + ' de confirmación'"
                      (input)="onOtpInput($event, i, otpConfirmBoxes, 'pinConfirm')"
                      (keydown)="onOtpKeyDown($event, i, otpConfirmBoxes, 'pinConfirm')"
                      (paste)="onOtpPaste($event, otpConfirmBoxes, 'pinConfirm')"
                      (focus)="onOtpFocus($event)"
                    />
                  }
                </div>
                @if (pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm) {
                  <p class="hint-error">Los PINs no coinciden</p>
                }
              </div>

              <button type="button" class="btn"
                [class.is-loading]="savingPin()"
                [disabled]="savingPin() || pinNew.length !== 6 || pinConfirm.length !== 6 || pinNew !== pinConfirm"
                (click)="onPinSetup()"
              >
                <span class="btn-shimmer"></span>
                <span class="btn-content">
                  @if (savingPin()) {
                    <span class="btn-dots"><span></span><span></span><span></span></span>
                  } @else {
                    <span class="btn-text-wrap">
                      <span>Guardar y continuar</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  }
                </span>
              </button>

              <button type="button" class="skip-btn" (click)="skipPinSetup()">
                Ahora no — entrar sin PIN
              </button>
            </div>
          }

          <!-- ─── PASO: Olvidé mi PIN ─── -->
          @if (step() === 'forgot-pin') {
            <div class="step-block">
              <button type="button" class="back-link" (click)="goCredentials()">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" class="back-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                </svg>
                Volver al acceso
              </button>

              <h1 class="step-title">¿Olvidaste<br>tu PIN?</h1>
              <p class="step-sub">Escribe tu usuario y notificaremos a un administrador para que te asigne uno nuevo.</p>

              @if (forgotSent()) {
                <div class="alert alert-ok animate-in" role="status">
                  <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Solicitud enviada. Un administrador te asignará un PIN nuevo pronto.</span>
                </div>
              } @else {
                @if (error()) {
                  <div class="alert alert-error animate-in" role="alert">
                    <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{{ error() }}</span>
                  </div>
                }
                <div class="field">
                  <input
                    id="forgotUser" name="forgotUser" type="text"
                    placeholder="x" [(ngModel)]="forgotUsername"
                    [disabled]="loadingForgot()"
                  />
                  <label for="forgotUser">Tu usuario</label>
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <button type="button" class="btn"
                  [class.is-loading]="loadingForgot()" [disabled]="loadingForgot()"
                  (click)="onForgotPin()"
                >
                  <span class="btn-shimmer"></span>
                  <span class="btn-content">
                    @if (loadingForgot()) {
                      <span class="btn-dots"><span></span><span></span><span></span></span>
                    } @else {
                      <span class="btn-text-wrap">
                        <span>Enviar solicitud</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </span>
                    }
                  </span>
                </button>
              }
            </div>
          }

        </div><!-- /form-card -->
        <p class="copyright">© {{ currentYear }} R&amp;R Importaciones · Agencia Aduanal</p>
      </div><!-- /card-wrap -->
    </div><!-- /form-scroll -->
  </main>

</div><!-- /layout -->
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      --rr-red:      #C61D26;
      --rr-red-dark: #A31820;
      --rr-rgb:      198, 29, 38;
    }

    .layout {
      display: flex;
      min-height: 100dvh;
      font-family: var(--font-body, 'Inter', sans-serif);
    }

    /* ════════════════════════════════════════
       Panel izquierdo — Marca
    ════════════════════════════════════════ */

    .brand-panel {
      display: none;
      width: 44%;
      max-width: 540px;
      flex-shrink: 0;
      position: relative;
      background: #08090D;
      overflow: hidden;
    }

    @media (min-width: 1024px) {
      .brand-panel { display: flex; flex-direction: column; }
    }

    .brand-canvas {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }

    /* Nebula orbs */
    .orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1;
    }
    .orb-a {
      width: 650px; height: 650px;
      background: radial-gradient(circle at center, rgba(var(--rr-rgb), 0.14) 0%, transparent 65%);
      bottom: -220px; left: -160px;
      animation: float-a 15s ease-in-out infinite;
    }
    .orb-b {
      width: 420px; height: 420px;
      background: radial-gradient(circle at center, rgba(var(--rr-rgb), 0.09) 0%, transparent 65%);
      top: -120px; right: -80px;
      animation: float-b 19s ease-in-out infinite;
    }

    @keyframes float-a {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%       { transform: translate(60px, 50px) scale(1.07); }
    }
    @keyframes float-b {
      0%, 100% { transform: translate(0, 0) scale(1.03); }
      50%       { transform: translate(-45px, -55px) scale(0.95); }
    }

    .brand-inner {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      padding: 52px 48px;
      height: 100%;
    }

    .brand-logo-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-wrap {
      width: 44px; height: 44px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.11);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .brand-img { width: 28px; height: 28px; object-fit: contain; }

    .brand-company {
      color: rgba(255, 255, 255, 0.90);
      font-size: 15px; font-weight: 700;
      letter-spacing: -0.2px; line-height: 1.2;
    }
    .brand-sub {
      color: rgba(255, 255, 255, 0.28);
      font-size: 10.5px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 1.9px; margin-top: 2px;
    }

    .brand-rule {
      height: 1px;
      background: rgba(255, 255, 255, 0.07);
      margin: 40px 0;
    }

    .brand-body { flex: 1; }

    .brand-headline {
      font-size: clamp(28px, 3vw, 40px);
      font-weight: 800;
      letter-spacing: -1px;
      line-height: 1.12;
      color: rgba(255, 255, 255, 0.92);
      margin-bottom: 16px;
    }
    .brand-accent { color: var(--rr-red); }

    .brand-desc {
      font-size: 13.5px;
      line-height: 1.65;
      color: rgba(255, 255, 255, 0.35);
      max-width: 34ch;
    }

    .brand-modules {
      display: flex; flex-wrap: wrap; gap: 7px;
      margin-top: 36px; margin-bottom: 32px;
    }
    .mod-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px; font-weight: 500;
      color: rgba(255, 255, 255, 0.48);
      letter-spacing: 0.2px;
    }
    .mod-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    .brand-status {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 500;
      color: rgba(255, 255, 255, 0.24);
    }
    .status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse-status 2.5s infinite;
      flex-shrink: 0;
    }
    @keyframes pulse-status {
      0%   { box-shadow: 0 0 0 0   rgba(16, 185, 129, 0.7); }
      70%  { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0   rgba(16, 185, 129, 0); }
    }

    /* ════════════════════════════════════════
       Logo móvil
    ════════════════════════════════════════ */

    .mobile-brand {
      display: flex; align-items: center; gap: 12px;
      padding: 20px 20px 0;
    }
    .mobile-brand-img { width: 34px; height: 34px; object-fit: contain; }
    .mobile-brand-name {
      font-size: 14px; font-weight: 700;
      color: var(--n-900, #0D1017);
    }

    @media (min-width: 1024px) { .mobile-brand { display: none; } }

    /* ════════════════════════════════════════
       Panel derecho — Formulario
    ════════════════════════════════════════ */

    .form-panel {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-app, #F5F6F8);
    }

    .form-scroll {
      flex: 1;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 20px;
    }

    .card-wrap {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    /* ════════════════════════════════════════
       Tarjeta del formulario
    ════════════════════════════════════════ */

    .form-card {
      width: 100%;
      background: var(--bg-surface, #FFFFFF);
      border-radius: 22px;
      border: 1px solid var(--border, #E4E7EC);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        0 20px 50px rgba(13, 16, 23, 0.10),
        0 4px 14px rgba(13, 16, 23, 0.06);
      padding: 36px 32px 32px;
      position: relative;
      overflow: hidden;
      animation: cardIn 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Línea roja superior — firma de marca */
    .form-card::before {
      content: '';
      position: absolute;
      top: 0; left: 18%; right: 18%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--rr-red), transparent);
      border-radius: 1px;
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(24px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    @media (max-width: 480px) {
      .form-card { padding: 28px 20px 24px; border-radius: 16px; }
    }

    /* ── Encabezado de la tarjeta (logo + título) ── */

    .card-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .logo-wrap {
      width: 64px; height: 64px;
      margin: 0 auto 16px;
      position: relative;
    }
    .logo-halo {
      position: absolute;
      inset: -3px; border-radius: 50%;
      background: linear-gradient(145deg, var(--rr-red), rgba(198, 29, 38, 0.25));
      opacity: 0.65;
      filter: blur(4px);
    }
    .logo-face {
      position: absolute;
      inset: 2px; border-radius: 50%;
      background: var(--bg-surface, #fff);
      display: flex; align-items: center; justify-content: center;
      z-index: 1; overflow: hidden;
      border: 1px solid rgba(198, 29, 38, 0.12);
    }
    .logo-img { width: 36px; height: 36px; object-fit: contain; }

    /* ════════════════════════════════════════
       Alertas
    ════════════════════════════════════════ */

    .alert {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; border-radius: 12px;
      font-size: 13px; line-height: 1.5;
      margin-bottom: 20px;
    }
    .alert-warn  { background: #FFFBEB; border: 1px solid #FDE68A; color: #78350F; }
    .alert-error { background: #FEF2F2; border: 1px solid rgba(220, 38, 38, 0.22); color: #7F1D1D; }
    .alert-ok    { background: #F0FDF4; border: 1px solid rgba(22, 163, 74, 0.22);  color: #14532D; }
    .alert-icon  { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    .alert span  { flex: 1; }
    .alert-close {
      background: none; border: none; cursor: pointer;
      padding: 0; color: inherit; opacity: 0.5; margin-top: 1px; flex-shrink: 0;
      transition: opacity 160ms;
      svg { width: 14px; height: 14px; display: block; }
    }
    .alert-close:hover { opacity: 1; }

    /* ════════════════════════════════════════
       Bloque de paso
    ════════════════════════════════════════ */

    .step-block {
      animation: stepIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes stepIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .step-title {
      font-size: 24px; font-weight: 800;
      letter-spacing: -0.5px; line-height: 1.15;
      color: var(--n-900, #0D1017);
      margin-bottom: 5px;
    }
    .step-sub {
      font-size: 13.5px;
      color: var(--n-500, #6B717F);
      line-height: 1.55;
      margin-bottom: 24px;
    }

    .step-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 20px;
      background: rgba(198, 29, 38, 0.08);
      border: 1px solid rgba(198, 29, 38, 0.18);
      color: var(--rr-red);
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 14px;
    }
    .step-badge-icon { width: 13px; height: 13px; }

    /* ════════════════════════════════════════
       Campos con label flotante
    ════════════════════════════════════════ */

    .field { position: relative; margin-bottom: 16px; }

    .field-icon {
      position: absolute;
      left: 15px; top: 50%;
      transform: translateY(-50%);
      width: 17px; height: 17px;
      color: var(--n-400, #9EA3AE);
      pointer-events: none;
      transition: color 0.25s, transform 0.25s;
      z-index: 2;
    }

    .field input {
      width: 100%;
      height: 58px;
      padding: 22px 16px 8px 46px;
      font-family: inherit;
      font-size: 15px; font-weight: 500;
      color: var(--n-900, #0D1017);
      background: var(--n-50, #F9FAFB);
      border: 1.5px solid var(--border, #E4E7EC);
      border-radius: 13px;
      outline: none;
      transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
      caret-color: var(--rr-red);
      box-sizing: border-box;
    }
    .field input::placeholder { color: transparent; }

    .field label {
      position: absolute;
      left: 46px; top: 50%;
      transform: translateY(-50%);
      font-size: 14px; font-weight: 500;
      color: var(--n-400, #9EA3AE);
      pointer-events: none;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: left center;
    }

    .field input:focus + label,
    .field input:not(:placeholder-shown) + label {
      top: 12px;
      transform: translateY(0) scale(0.80);
      color: var(--rr-red);
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .field input:focus {
      border-color: var(--rr-red);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(198, 29, 38, 0.10);
    }
    .field input:focus ~ .field-icon {
      color: var(--rr-red);
      transform: translateY(-50%) scale(1.08);
    }

    .toggle-pass {
      position: absolute;
      right: 13px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: var(--n-400, #9EA3AE);
      padding: 8px;
      display: flex; align-items: center;
      transition: color 0.2s, transform 0.2s;
      z-index: 3;
      svg { width: 17px; height: 17px; }
    }
    .toggle-pass:hover { color: var(--n-700, #333846); transform: translateY(-50%) scale(1.1); }

    /* ════════════════════════════════════════
       Tabs de modo (Contraseña / PIN)
    ════════════════════════════════════════ */

    .mode-tabs {
      display: flex;
      background: var(--n-100, #F3F4F6);
      border-radius: 11px;
      padding: 3px;
      margin-bottom: 16px;
    }
    .mode-tab {
      flex: 1;
      display: flex; align-items: center; justify-content: center;
      gap: 6px; padding: 8px 12px;
      border-radius: 9px; border: none; cursor: pointer;
      font-family: inherit; font-size: 12.5px; font-weight: 600;
      color: var(--n-500, #6B717F);
      background: transparent;
      transition: all 180ms ease;
    }
    .tab-icon { width: 13px; height: 13px; flex-shrink: 0; }
    .mode-tab.active {
      background: #fff;
      color: var(--n-800, #1E2330);
      box-shadow: 0 1px 3px rgba(13, 16, 23, 0.09), 0 1px 2px rgba(13, 16, 23, 0.05);
    }

    /* ════════════════════════════════════════
       Grupo de campo (label estática + OTP)
    ════════════════════════════════════════ */

    .field-group { margin-bottom: 18px; }

    .label-field {
      display: block;
      font-size: 12px; font-weight: 600;
      color: var(--n-600, #4B5162);
      margin-bottom: 7px; letter-spacing: 0.2px;
    }

    .pin-label-row {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 7px;
      .label-field { margin-bottom: 0; }
    }

    .link-btn {
      background: none; border: none; cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 600;
      color: var(--rr-red); padding: 0;
      text-decoration: underline; text-underline-offset: 3px;
      transition: color 160ms;
    }
    .link-btn:hover { color: var(--rr-red-dark); }

    /* ════════════════════════════════════════
       Cajas OTP / PIN
    ════════════════════════════════════════ */

    .otp-row { display: flex; gap: 8px; }

    .otp-box {
      width: 52px; height: 58px;
      border: 1.5px solid var(--border, #E4E7EC);
      border-radius: 12px;
      background: var(--n-50, #F9FAFB);
      color: var(--n-900, #0D1017);
      font-size: 22px; font-weight: 700;
      font-family: var(--font-mono, monospace);
      text-align: center; cursor: text;
      caret-color: var(--rr-red);
      outline: none;
      transition: border-color 160ms, background 160ms, box-shadow 160ms;
      -webkit-appearance: none;
    }
    .otp-box:hover:not(:disabled) { border-color: var(--border-strong, #CDD1DB); }
    .otp-box:focus {
      border-color: var(--rr-red);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(198, 29, 38, 0.10);
    }
    .otp-box:not(:placeholder-shown) {
      background: rgba(198, 29, 38, 0.05);
      border-color: rgba(198, 29, 38, 0.28);
    }
    .otp-box.otp-mismatch { border-color: #DC2626 !important; background: #FEE2E2 !important; }

    @media (max-width: 480px) {
      .otp-row { gap: 6px; }
      .otp-box { width: 46px; height: 52px; font-size: 20px; border-radius: 10px; }
    }
    @media (max-width: 360px) {
      .otp-box { width: 40px; height: 48px; font-size: 18px; }
    }

    .hint-error { font-size: 11.5px; color: #DC2626; margin-top: 6px; font-weight: 500; }

    /* ════════════════════════════════════════
       Botón principal
    ════════════════════════════════════════ */

    .btn {
      position: relative;
      width: 100%; height: 54px;
      margin-top: 6px;
      border: none; border-radius: 13px; cursor: pointer;
      font-family: inherit; font-size: 14.5px; font-weight: 700;
      letter-spacing: 0.1px; color: #fff;
      background: var(--rr-red);
      overflow: hidden;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s, background 0.2s;
    }
    .btn:hover:not(:disabled) {
      background: var(--rr-red-dark);
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(198, 29, 38, 0.38);
    }
    .btn:active:not(:disabled) { transform: translateY(-1px) scale(0.99); }
    .btn:disabled { opacity: 0.72; cursor: not-allowed; }

    .btn-shimmer {
      position: absolute;
      top: 0; left: -80%;
      width: 55%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.17), transparent);
      transform: skewX(-20deg);
      animation: btn-shimmer 3s ease-in-out infinite;
    }
    @keyframes btn-shimmer {
      0%        { left: -80%; }
      30%, 100% { left: 185%; }
    }

    .btn-content {
      position: relative; z-index: 1;
      display: flex; align-items: center; justify-content: center;
      height: 100%;
    }
    .btn-text-wrap {
      display: flex; align-items: center; gap: 9px;
      svg { width: 18px; height: 18px; transition: transform 0.25s; }
    }
    .btn:hover .btn-text-wrap svg { transform: translateX(4px); }

    .btn-dots { display: flex; gap: 5px; align-items: center; }
    .btn-dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #fff;
      animation: dot-bounce 1.2s ease-in-out infinite;
    }
    .btn-dots span:nth-child(2) { animation-delay: 0.18s; }
    .btn-dots span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes dot-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40%           { transform: scale(1.1); opacity: 1;   }
    }

    /* ════════════════════════════════════════
       Botones secundarios
    ════════════════════════════════════════ */

    .skip-btn {
      display: block; width: 100%; text-align: center;
      background: none; border: none; cursor: pointer; font-family: inherit;
      font-size: 13px; font-weight: 500;
      color: var(--n-400, #9EA3AE);
      padding: 10px 0 0;
      transition: color 160ms;
    }
    .skip-btn:hover { color: var(--n-600, #4B5162); }

    .back-link {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: none; cursor: pointer; font-family: inherit;
      font-size: 12.5px; font-weight: 600;
      color: var(--n-400, #9EA3AE);
      padding: 0 0 20px;
      transition: color 160ms;
    }
    .back-link:hover { color: var(--n-700, #333846); }
    .back-icon { width: 14px; height: 14px; }

    /* ════════════════════════════════════════
       Copyright y animaciones utilitarias
    ════════════════════════════════════════ */

    .copyright {
      font-size: 11.5px;
      color: var(--n-300, #C5C9D1);
      text-align: center;
      margin-top: 20px;
    }

    .animate-in {
      animation: fadeSlideIn 0.28s ease forwards;
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren(OTP_LOGIN)   otpLoginBoxes!:   QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren(OTP_NEW)     otpNewBoxes!:     QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren(OTP_CONFIRM) otpConfirmBoxes!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChild('brandCanvas')  brandCanvasRef!:  ElementRef<HTMLCanvasElement>;

  username       = '';
  password       = '';
  pinLogin       = '';
  pinNew         = '';
  pinConfirm     = '';
  forgotUsername = '';
  passShowing    = false;

  mode              = signal<AuthMode>('password');
  step              = signal<Step>('credentials');
  loading           = signal(false);
  savingPin         = signal(false);
  loadingForgot     = signal(false);
  error             = signal('');
  sessionExpiredToast = signal(false);
  forgotSent        = signal(false);

  readonly digits      = [0, 1, 2, 3, 4, 5] as const;
  readonly currentYear = new Date().getFullYear();

  private pendingUsername = '';

  // Canvas state
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: {
    x: number; y: number; vx: number; vy: number;
    size: number; alpha: number; layer: number;
    connDist: number; parallax: number; mouseLines: boolean;
  }[] = [];
  private animationFrameId = 0;
  private mouse = { x: -9999, y: -9999 };
  private panelOffset = { left: 0, top: 0 };

  private readonly LAYER_DEFS = [
    { frac: 0.50, minSz: 1.0, maxSz: 2.2, minSpd: 0.20, maxSpd: 0.55, alpha: 0.75, connDist: 120, parallax: 0.018, mouseLines: true  },
    { frac: 0.30, minSz: 0.5, maxSz: 1.3, minSpd: 0.08, maxSpd: 0.25, alpha: 0.40, connDist: 90,  parallax: 0.008, mouseLines: false },
    { frac: 0.20, minSz: 2.5, maxSz: 4.0, minSpd: 0.03, maxSpd: 0.10, alpha: 0.14, connDist: 70,  parallax: 0.003, mouseLines: false },
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.navigateHome();
      return;
    }
    const params = this.route.snapshot.queryParams;
    if (params['session'] === 'expired' || params['session_expired'] === 'true') {
      this.sessionExpiredToast.set(true);
      this.router.navigate(['/login'], { replaceUrl: true });
      setTimeout(() => this.sessionExpiredToast.set(false), 6000);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCanvas(), 120);
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
  }

  // ── Canvas ────────────────────────────────────────────────────

  private initCanvas(): void {
    if (!this.brandCanvasRef) return;
    const canvas = this.brandCanvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.resizeCanvas();
    this.animate();
  }

  private onWindowResize = (): void => { this.resizeCanvas(); };

  private resizeCanvas(): void {
    if (!this.brandCanvasRef) return;
    const canvas = this.brandCanvasRef.nativeElement;
    const panel  = canvas.parentElement!;
    const rect   = panel.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width  = rect.width;
    canvas.height = rect.height;
    this.panelOffset = { left: rect.left, top: rect.top };
    this.spawnParticles();
  }

  private spawnParticles(): void {
    if (!this.brandCanvasRef) return;
    const { width: W, height: H } = this.brandCanvasRef.nativeElement;
    this.particles = [];
    const baseCount = Math.max(40, Math.floor((W * H) / 10000));

    this.LAYER_DEFS.forEach((l, li) => {
      const n = Math.round(baseCount * l.frac);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = l.minSpd + Math.random() * (l.maxSpd - l.minSpd);
        this.particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size:  l.minSz + Math.random() * (l.maxSz - l.minSz),
          alpha: l.alpha  * (0.5 + Math.random() * 0.5),
          layer: li,
          connDist:   l.connDist,
          parallax:   l.parallax,
          mouseLines: l.mouseLines,
        });
      }
    });
  }

  private animate = (): void => {
    if (!this.ctx || !this.brandCanvasRef) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }
    const canvas = this.brandCanvasRef.nativeElement;
    const W = canvas.width, H = canvas.height;
    if (W === 0 || H === 0) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }

    this.ctx.clearRect(0, 0, W, H);

    const r = '198', g = '29', b = '38';
    const cx = W / 2, cy = H / 2;
    const mx = this.mouse.x - this.panelOffset.left;
    const my = this.mouse.y - this.panelOffset.top;
    const mox = (mx - cx) * 0.6;
    const moy = (my - cy) * 0.6;

    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      // Repulsión del cursor
      const rdx = mx - p.x, rdy = my - p.y;
      const rd  = Math.sqrt(rdx * rdx + rdy * rdy);
      if (rd < 120 && rd > 0) {
        const force = (120 - rd) / 120;
        p.x -= (rdx / rd) * force * 2.2;
        p.y -= (rdy / rd) * force * 2.2;
      }

      const rx = p.x + mox * p.parallax;
      const ry = p.y + moy * p.parallax;

      // Glow para partículas grandes
      if (p.size > 2) {
        this.ctx!.beginPath();
        this.ctx!.arc(rx, ry, p.size * 3, 0, Math.PI * 2);
        this.ctx!.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.07})`;
        this.ctx!.fill();
      }

      // Núcleo
      this.ctx!.beginPath();
      this.ctx!.arc(rx, ry, p.size, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      this.ctx!.fill();

      // Conexiones dentro de la misma capa
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        if (q.layer !== p.layer) continue;
        const qrx = q.x + mox * q.parallax;
        const qry = q.y + moy * q.parallax;
        const dx = rx - qrx, dy = ry - qry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.connDist) {
          const t = 1 - dist / p.connDist;
          this.ctx!.beginPath();
          this.ctx!.strokeStyle = `rgba(${r},${g},${b},${t * 0.24 * p.alpha})`;
          this.ctx!.lineWidth = 0.6;
          this.ctx!.moveTo(rx, ry);
          this.ctx!.lineTo(qrx, qry);
          this.ctx!.stroke();
        }
      }

      // Líneas hacia el cursor (capa frontal)
      if (p.mouseLines && rd < 150 && mx > 0 && my > 0 && mx < W && my < H) {
        const t = 1 - rd / 150;
        this.ctx!.beginPath();
        this.ctx!.strokeStyle = `rgba(${r},${g},${b},${t * 0.38})`;
        this.ctx!.lineWidth = 1.0;
        this.ctx!.moveTo(rx, ry);
        this.ctx!.lineTo(mx, my);
        this.ctx!.stroke();
      }
    });

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    if (this.brandCanvasRef) {
      const rect = this.brandCanvasRef.nativeElement.parentElement!.getBoundingClientRect();
      this.panelOffset = { left: rect.left, top: rect.top };
    }
  }

  @HostListener('window:mouseout')
  onMouseOut(): void {
    this.mouse.x = -9999;
    this.mouse.y = -9999;
  }

  // ── Helpers UI ────────────────────────────────────────────────

  togglePass(): void { this.passShowing = !this.passShowing; }

  // ── Cambio de modo ────────────────────────────────────────────

  setMode(m: AuthMode): void {
    this.mode.set(m);
    this.error.set('');
    this.password = '';
    this.pinLogin = '';
    this._clearOtp(this.otpLoginBoxes);
    if (m === 'pin') setTimeout(() => this._focusFirst(this.otpLoginBoxes), 60);
  }

  // ── OTP helpers ───────────────────────────────────────────────

  onOtpFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onOtpInput(
    event: Event, index: number,
    boxes: QueryList<ElementRef<HTMLInputElement>>,
    prop: 'pinLogin' | 'pinNew' | 'pinConfirm',
  ): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    input.value = digit;
    if (digit && index < 5) boxes.toArray()[index + 1]?.nativeElement.focus();
    (this as Record<string, unknown>)[prop] = this._collect(boxes);
  }

  onOtpKeyDown(
    event: KeyboardEvent, index: number,
    boxes: QueryList<ElementRef<HTMLInputElement>>,
    prop: 'pinLogin' | 'pinNew' | 'pinConfirm',
  ): void {
    const input = event.target as HTMLInputElement;
    const arr = boxes.toArray();
    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        const prev = arr[index - 1]?.nativeElement;
        if (prev) { prev.value = ''; prev.focus(); }
      }
      setTimeout(() => (this as Record<string, unknown>)[prop] = this._collect(boxes), 0);
    }
    if (event.key === 'ArrowLeft'  && index > 0) arr[index - 1]?.nativeElement.focus();
    if (event.key === 'ArrowRight' && index < 5) arr[index + 1]?.nativeElement.focus();
  }

  onOtpPaste(
    event: ClipboardEvent,
    boxes: QueryList<ElementRef<HTMLInputElement>>,
    prop: 'pinLogin' | 'pinNew' | 'pinConfirm',
  ): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    const arr = boxes.toArray();
    arr.forEach((b, i) => { b.nativeElement.value = digits[i] ?? ''; });
    arr[Math.min(digits.length, 5)]?.nativeElement.focus();
    (this as Record<string, unknown>)[prop] = this._collect(boxes);
  }

  private _collect(boxes: QueryList<ElementRef<HTMLInputElement>>): string {
    return boxes?.toArray().map(b => b.nativeElement.value).join('') ?? '';
  }
  private _clearOtp(boxes: QueryList<ElementRef<HTMLInputElement>>): void {
    boxes?.toArray().forEach(b => { b.nativeElement.value = ''; });
  }
  private _focusFirst(boxes: QueryList<ElementRef<HTMLInputElement>>): void {
    boxes?.toArray()[0]?.nativeElement.focus();
  }

  // ── Submit credenciales ───────────────────────────────────────

  onSubmit(): void {
    this.error.set('');
    const u = this.username.trim();
    if (!u) { this.error.set('Ingresa tu nombre de usuario'); return; }

    if (this.mode() === 'password') {
      if (!this.password) { this.error.set('Ingresa tu contraseña'); return; }
      this.loading.set(true);
      this.auth.login({ username: u, password: this.password }).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.needsSetPin) {
            this.pendingUsername = u;
            this.pinNew = ''; this.pinConfirm = '';
            this.step.set('pin-setup');
            setTimeout(() => this._focusFirst(this.otpNewBoxes), 60);
          } else {
            this.navigateHome();
          }
        },
        error: (err: Error) => { this.error.set(err.message); this.loading.set(false); },
      });
    } else {
      if (this.pinLogin.length !== 6) { this.error.set('Ingresa los 6 dígitos de tu PIN'); return; }
      this.loading.set(true);
      this.auth.pinLogin({ username: u, pin: this.pinLogin }).subscribe({
        next: () => { this.loading.set(false); this.navigateHome(); },
        error: (err: Error) => { this.error.set(err.message); this.loading.set(false); },
      });
    }
  }

  // ── Configurar PIN ────────────────────────────────────────────

  onPinSetup(): void {
    if (this.pinNew.length !== 6 || this.pinNew !== this.pinConfirm) return;
    this.error.set('');
    this.savingPin.set(true);
    this.auth.setInitialCampoPin(this.pendingUsername, this.pinNew).subscribe({
      next: () => { this.savingPin.set(false); this.navigateHome(); },
      error: (err: Error) => { this.error.set(err.message); this.savingPin.set(false); },
    });
  }

  skipPinSetup(): void { this.navigateHome(); }

  // ── Olvidé mi PIN ─────────────────────────────────────────────

  goForgotPin(): void {
    this.forgotUsername = this.username;
    this.error.set('');
    this.forgotSent.set(false);
    this.step.set('forgot-pin');
  }

  goCredentials(): void {
    this.error.set('');
    this.step.set('credentials');
  }

  onForgotPin(): void {
    const u = this.forgotUsername.trim();
    if (!u) { this.error.set('Ingresa tu nombre de usuario'); return; }
    this.loadingForgot.set(true);
    this.error.set('');
    this.auth.requestPinReset(u).subscribe({
      next: () => { this.loadingForgot.set(false); this.forgotSent.set(true); },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo enviar la solicitud');
        this.loadingForgot.set(false);
      },
    });
  }

  // ── Navegación post-login ─────────────────────────────────────

  private navigateHome(): void {
    if (this.auth.can('CAMPO_USAR') && !this.auth.isAdmin()) {
      this.router.navigate(['/campo']);
    } else {
      this.router.navigate(['/inicio']);
    }
  }
}
