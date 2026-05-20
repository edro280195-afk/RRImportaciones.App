import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  HostListener,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { gsap } from 'gsap';

type AuthMode = 'password' | 'pin';
type Step = 'credentials' | 'pin-setup' | 'forgot-pin';
type PinSetupSubStep = 'new' | 'confirm';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="login-container">
  <!-- Canvas para el fondo dinámico de orbes fluidos -->
  <canvas class="mesh-canvas" #brandCanvas></canvas>
  
  <!-- Efectos decorativos de fondo -->
  <div class="bg-glow bg-glow-1"></div>
  <div class="bg-glow bg-glow-2"></div>

  <!-- Contenedor principal de la tarjeta -->
  <div class="card-wrapper">
    <div class="login-card" [class.pin-active]="mode() === 'pin' && step() === 'credentials'">
      
      <!-- Cabecera de la tarjeta: Logo + Marca -->
      <header class="card-header">
        <div class="logo-area">
          <div class="logo-glow"></div>
          <div class="logo-inner">
            <img src="assets/imagenes/rr_logo.png" class="logo-img" alt="R&R Logo" />
          </div>
        </div>
        <h1 class="brand-title">R&amp;R Importaciones</h1>
        <p class="brand-subtitle">Gestión Aduanal · Operaciones de Patio</p>
      </header>

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

      <!-- Contenedor deslizante para los diferentes pasos de autenticación -->
      <div class="steps-viewport">
        <div class="steps-wrapper">
          
          <!-- PASO 1: Credenciales (Usuario + Contraseña) -->
          <div class="step-pane step-pane-credentials" [class.active]="step() === 'credentials'">
            
            <div class="pane-header">
              <h2 class="step-title">Bienvenido</h2>
              <p class="step-sub">Ingresa tus credenciales para acceder al sistema.</p>
            </div>

            @if (error() && step() === 'credentials' && mode() === 'password') {
              <div class="alert alert-error" role="alert">
                <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{{ error() }}</span>
              </div>
            }

            <form (ngSubmit)="onSubmit()" autocomplete="on" novalidate>
              <!-- Usuario -->
              <div class="field-container">
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
              </div>

              <!-- Contraseña -->
              <div class="field-container">
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
              </div>

              <!-- Botón Ingresar -->
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

              <!-- Botón de PIN de acceso -->
              <div class="mode-toggle-container">
                <button type="button" class="mode-toggle-btn" (click)="setMode('pin')">
                  <svg class="mode-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 11l2 2 4-4"/>
                  </svg>
                  Ingresar usando PIN de acceso
                </button>
              </div>
            </form>
          </div>

          <!-- PASO 2: Configurar PIN -->
          <div class="step-pane step-pane-pin-setup" [class.active]="step() === 'pin-setup'">
            <div class="pane-header" style="margin-bottom: 12px;">
              <div class="step-badge">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="step-badge-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Primer acceso
              </div>
              <h2 class="step-title">Configura tu PIN</h2>
            </div>

            @if (error() && step() === 'pin-setup') {
              <div class="alert alert-error" role="alert">
                <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{{ error() }}</span>
              </div>
            }

            <!-- Slider multipaso para configurar PIN estilo iOS -->
            <div class="pin-setup-slider-wrapper">
              <div class="pin-setup-slider">
                
                <!-- Sub-paso A: PIN nuevo -->
                <div class="pin-setup-pane" [class.active]="pinSetupStep() === 'new'">
                  <p class="step-sub text-center" style="margin-bottom: 12px;">
                    Elige 6 dígitos para tu acceso rápido.
                  </p>
                  <div class="passcode-dots-wrapper">
                    <span class="label-field text-center block mb-2" style="display: block; text-align: center; margin-bottom: 6px;">Nuevo PIN</span>
                    <div class="passcode-dots">
                      <div class="dot" [class.filled]="pinNew.length > 0"></div>
                      <div class="dot" [class.filled]="pinNew.length > 1"></div>
                      <div class="dot" [class.filled]="pinNew.length > 2"></div>
                      <div class="dot" [class.filled]="pinNew.length > 3"></div>
                      <div class="dot" [class.filled]="pinNew.length > 4"></div>
                      <div class="dot" [class.filled]="pinNew.length > 5"></div>
                    </div>
                  </div>
                </div>

                <!-- Sub-paso B: Confirmar PIN -->
                <div class="pin-setup-pane" [class.active]="pinSetupStep() === 'confirm'">
                  <p class="step-sub text-center" style="margin-bottom: 12px;">
                    Escribe de nuevo los 6 dígitos para verificar que coincidan.
                  </p>
                  <div class="passcode-dots-wrapper">
                    <span class="label-field text-center block mb-2" style="display: block; text-align: center; margin-bottom: 6px;">Confirma tu PIN</span>
                    <div class="passcode-dots">
                      <div class="dot" [class.filled]="pinConfirm.length > 0" [class.dot-error]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"></div>
                      <div class="dot" [class.filled]="pinConfirm.length > 1" [class.dot-error]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"></div>
                      <div class="dot" [class.filled]="pinConfirm.length > 2" [class.dot-error]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"></div>
                      <div class="dot" [class.filled]="pinConfirm.length > 3" [class.dot-error]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"></div>
                      <div class="dot" [class.filled]="pinConfirm.length > 4" [class.dot-error]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"></div>
                      <div class="dot" [class.filled]="pinConfirm.length > 5" [class.dot-error]="pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm"></div>
                    </div>
                    @if (pinNew.length === 6 && pinConfirm.length === 6 && pinNew !== pinConfirm) {
                      <p class="hint-error text-center" style="text-align: center;">Los PINs no coinciden</p>
                    }
                  </div>
                </div>

              </div>
            </div>

            <!-- Teclado iOS para configuración -->
            <div class="ios-keypad-container">
              <div class="ios-keypad">
                @for (num of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track num) {
                  <button type="button" class="keypad-key" (click)="onKeypadTap(num)">
                    <span class="key-val">{{ num }}</span>
                  </button>
                }
                <button type="button" class="keypad-key key-clear" (click)="onKeypadClear()">
                  <span class="key-label-text">Borrar</span>
                </button>
                <button type="button" class="keypad-key" (click)="onKeypadTap(0)">
                  <span class="key-val">0</span>
                </button>
                <button type="button" class="keypad-key key-backspace" (click)="onKeypadBackspace()" aria-label="Borrar último dígito">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                    <line x1="18" y1="9" x2="12" y2="15"/>
                    <line x1="12" y1="9" x2="18" y2="15"/>
                  </svg>
                </button>
              </div>
            </div>

            <button type="button" class="skip-btn" (click)="skipPinSetup()" [disabled]="savingPin()">
              Ahora no — entrar sin PIN
            </button>
          </div>

          <!-- PASO 3: Olvidé mi PIN -->
          <div class="step-pane step-pane-forgot-pin" [class.active]="step() === 'forgot-pin'">
            <div class="pane-header">
              <button type="button" class="back-link" (click)="goCredentials()">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" class="back-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                </svg>
                Volver al acceso
              </button>
              <h2 class="step-title">¿Olvidaste tu PIN?</h2>
              <p class="step-sub">Escribe tu usuario y notificaremos a un administrador para que te asigne uno nuevo.</p>
            </div>

            @if (forgotSent()) {
              <div class="alert alert-ok animate-in" role="status">
                <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Solicitud enviada. Un administrador te asignará un PIN nuevo pronto.</span>
              </div>
            } @else {
              @if (error() && step() === 'forgot-pin') {
                <div class="alert alert-error animate-in" role="alert">
                  <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{{ error() }}</span>
                </div>
              }
              <div class="field-container">
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
              </div>
              
              <button type="button" class="btn"
                [disabled]="loadingForgot()"
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

        </div>
      </div>

      <!-- Copyright -->
      <footer class="card-footer">
        <p class="copyright">© {{ currentYear }} Importadora R&amp;R</p>
      </footer>

      <!-- CAPA SOBREPUESTA (PIN Overlay) Estilo iOS Drawer -->
      <div class="pin-overlay" [class.active]="mode() === 'pin' && step() === 'credentials'">
        
        <button type="button" class="back-to-pass-btn" (click)="setMode('password')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Usar Contraseña
        </button>
        
        <div class="pin-overlay-header">
          <h3 class="pin-overlay-title">Acceso rápido con PIN</h3>
          <p class="pin-overlay-user">Usuario: <strong>{{ username }}</strong></p>
        </div>

        @if (error() && step() === 'credentials' && mode() === 'pin') {
          <div class="alert alert-error animate-in" role="alert" style="margin: 4px 0; padding: 10px 12px; font-size: 12px; width: 100%;">
            <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width: 14px; height: 14px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{{ error() }}</span>
          </div>
        }
        
        <!-- Puntos de contraseña -->
        <div class="passcode-dots-wrapper">
          <div class="passcode-dots">
            <div class="dot" [class.filled]="pinLogin.length > 0"></div>
            <div class="dot" [class.filled]="pinLogin.length > 1"></div>
            <div class="dot" [class.filled]="pinLogin.length > 2"></div>
            <div class="dot" [class.filled]="pinLogin.length > 3"></div>
            <div class="dot" [class.filled]="pinLogin.length > 4"></div>
            <div class="dot" [class.filled]="pinLogin.length > 5"></div>
          </div>
        </div>

        <!-- Teclado en pantalla estilo iOS -->
        <div class="ios-keypad-container">
          <div class="ios-keypad">
            @for (num of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track num) {
              <button type="button" class="keypad-key" (click)="onKeypadTap(num)">
                <span class="key-val">{{ num }}</span>
              </button>
            }
            <button type="button" class="keypad-key key-clear" (click)="onKeypadClear()">
              <span class="key-label-text">Borrar</span>
            </button>
            <button type="button" class="keypad-key" (click)="onKeypadTap(0)">
              <span class="key-val">0</span>
            </button>
            <button type="button" class="keypad-key key-backspace" (click)="onKeypadBackspace()" aria-label="Borrar último dígito">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                <line x1="18" y1="9" x2="12" y2="15"/>
                <line x1="12" y1="9" x2="18" y2="15"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="button" class="forgot-pin-link" (click)="goForgotPin()">¿Olvidaste tu PIN?</button>
      </div>

    </div>
  </div>
</div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      --rr-red:      #C61D26;
      --rr-red-light:#E53E3E;
      --rr-red-dark: #A31820;
      --rr-rgb:      198, 29, 38;
      overflow-x: hidden;
    }

    .login-container {
      position: relative;
      width: 100%;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #FAF8FB 0%, #E8E5EA 100%);
      font-family: var(--font-sans, 'Onest', sans-serif);
      padding: 24px 16px;
      box-sizing: border-box;
      overflow: hidden;
    }

    .mesh-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      filter: blur(40px);
    }

    .bg-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 1;
      opacity: 0.6;
    }
    .bg-glow-1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(198, 29, 38, 0.12) 0%, transparent 70%);
      top: -100px;
      left: -100px;
    }
    .bg-glow-2 {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
      bottom: -150px;
      right: -100px;
    }

    .card-wrapper {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 440px;
    }

    .login-card {
      position: relative;
      width: 100%;
      min-height: 440px;
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 
        0 4px 30px rgba(0, 0, 0, 0.02),
        0 20px 50px rgba(18, 16, 18, 0.08),
        inset 0 1px 1px rgba(255, 255, 255, 0.8);
      padding: 32px 28px 24px;
      box-sizing: border-box;
      overflow: hidden;
      transition: min-height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .login-card.pin-active {
      min-height: 510px;
    }

    .card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 20px;
    }

    .logo-area {
      position: relative;
      width: 64px;
      height: 64px;
      margin-bottom: 12px;
    }

    .logo-glow {
      position: absolute;
      inset: -4px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--rr-red), #F59E0B);
      opacity: 0.35;
      filter: blur(6px);
      animation: logo-pulse 4s ease-in-out infinite alternate;
    }

    @keyframes logo-pulse {
      0% { transform: scale(0.95); opacity: 0.25; }
      100% { transform: scale(1.05); opacity: 0.45; }
    }

    .logo-inner {
      position: absolute;
      inset: 0;
      border-radius: 14px;
      background: #ffffff;
      border: 1.5px solid rgba(198, 29, 38, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .logo-img {
      width: 38px;
      height: 38px;
      object-fit: contain;
    }

    .brand-title {
      font-size: 21px;
      font-weight: 800;
      color: var(--color-n-900, #121012);
      letter-spacing: -0.5px;
      line-height: 1.15;
      margin: 0;
    }

    .brand-subtitle {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-n-500, #7D797F);
      margin-top: 4px;
      margin-bottom: 0;
    }

    .steps-viewport {
      position: relative;
      overflow: hidden;
      width: 100%;
    }

    .steps-wrapper {
      display: flex;
      width: 300%;
      align-items: flex-start;
      will-change: transform;
    }

    .step-pane {
      width: 33.3333%;
      flex-shrink: 0;
      box-sizing: border-box;
      visibility: hidden;
      pointer-events: none;
      transition: visibility 0.4s;
    }
    .step-pane.active {
      visibility: visible;
      pointer-events: auto;
    }

    .pane-header {
      margin-bottom: 16px;
    }

    .step-title {
      font-size: 19px;
      font-weight: 800;
      color: var(--color-n-900, #121012);
      letter-spacing: -0.3px;
      margin-top: 0;
      margin-bottom: 4px;
    }

    .step-sub {
      font-size: 13px;
      color: var(--color-n-500, #7D797F);
      line-height: 1.45;
      margin-top: 0;
      margin-bottom: 0;
    }

    .field-container {
      margin-bottom: 14px;
      width: 100%;
    }

    .field {
      position: relative;
      width: 100%;
    }

    .field input {
      width: 100%;
      height: 52px;
      padding: 18px 16px 6px 46px;
      font-family: inherit;
      font-size: 14.5px;
      font-weight: 500;
      color: var(--color-n-900, #121012);
      background: rgba(255, 255, 255, 0.5);
      border: 1.5px solid rgba(229, 225, 230, 0.8);
      border-radius: 12px;
      outline: none;
      transition: all 0.25s ease;
      caret-color: var(--rr-red);
      box-sizing: border-box;
    }

    .field input::placeholder {
      color: transparent;
    }

    .field label {
      position: absolute;
      left: 46px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      font-weight: 500;
      color: var(--color-n-500, #7D797F);
      pointer-events: none;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: left center;
    }

    .field input:focus + label,
    .field input:not(:placeholder-shown) + label {
      top: 8px;
      transform: translateY(0) scale(0.80);
      color: var(--rr-red);
      font-weight: 700;
    }

    .field input:focus {
      background: #ffffff;
      border-color: var(--rr-red);
      box-shadow: 0 0 0 4px rgba(198, 29, 38, 0.08);
    }

    .field-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--color-n-400, #A4A0A5);
      pointer-events: none;
      transition: all 0.25s ease;
      z-index: 2;
    }

    .field input:focus ~ .field-icon {
      color: var(--rr-red);
      transform: translateY(-50%) scale(1.08);
    }

    .toggle-pass {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-n-400, #A4A0A5);
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 3;
    }
    .toggle-pass:hover {
      color: var(--color-n-700, #383438);
      transform: translateY(-50%) scale(1.1);
    }
    .toggle-pass svg {
      width: 18px;
      height: 18px;
    }

    .mode-toggle-container {
      display: flex;
      justify-content: center;
      margin-top: 14px;
      width: 100%;
    }

    .mode-toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--color-n-500, #7D797F);
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .mode-toggle-btn:hover {
      color: var(--rr-red);
      background: rgba(198, 29, 38, 0.05);
    }
    .mode-toggle-icon {
      width: 15px;
      height: 15px;
    }

    .label-field {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--color-n-600, #585459);
    }

    /* PUNTOS CONTRASEÑA ESTILO IOS */
    .passcode-dots-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 8px 0;
      width: 100%;
    }

    .passcode-dots {
      display: flex;
      justify-content: center;
      gap: 18px;
      margin: 4px 0;
    }

    .dot {
      width: 13px;
      height: 13px;
      border: 2px solid var(--color-n-300, #C8C5C9);
      border-radius: 50%;
      background: transparent;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .dot.filled {
      background: var(--rr-red);
      border-color: var(--rr-red);
      transform: scale(1.15);
    }

    .dot.dot-error {
      background: #EF4444 !important;
      border-color: #EF4444 !important;
    }

    /* TECLADO ESTILO IOS */
    .ios-keypad-container {
      width: 100%;
      display: flex;
      justify-content: center;
      margin: 8px 0;
    }

    .ios-keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px 24px;
      justify-items: center;
      width: 100%;
      max-width: 250px;
    }

    .keypad-key {
      position: relative;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 1.5px solid rgba(18, 16, 18, 0.08);
      background: rgba(255, 255, 255, 0.4);
      color: var(--color-n-900, #121012);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .keypad-key:hover:not(:disabled) {
      background: rgba(198, 29, 38, 0.06);
      border-color: rgba(198, 29, 38, 0.2);
      color: var(--rr-red);
      transform: scale(1.06);
    }

    .keypad-key:active:not(:disabled) {
      background: var(--rr-red);
      border-color: var(--rr-red);
      color: #ffffff;
      transform: scale(0.94);
      transition: all 0.05s;
    }

    .key-val {
      font-size: 21px;
      font-weight: 600;
      line-height: 1;
    }

    .keypad-key.key-clear,
    .keypad-key.key-backspace {
      border-color: transparent;
      background: transparent;
      color: var(--color-n-500, #7D797F);
    }

    .keypad-key.key-clear:hover,
    .keypad-key.key-backspace:hover {
      background: rgba(18, 16, 18, 0.04);
      color: var(--color-n-800, #383438);
      border-color: transparent;
    }

    .keypad-key.key-clear:active,
    .keypad-key.key-backspace:active {
      background: rgba(18, 16, 18, 0.08);
      color: var(--color-n-900, #121012);
      border-color: transparent;
      transform: scale(0.94);
    }

    .key-label-text {
      font-size: 11px;
      font-weight: 700;
    }

    .keypad-key.key-backspace svg {
      width: 18px;
      height: 18px;
    }

    /* SLIDER MULTIPASO CONFIGURACION PIN */
    .pin-setup-slider-wrapper {
      position: relative;
      overflow: hidden;
      width: 100%;
      margin-bottom: 6px;
    }

    .pin-setup-slider {
      display: flex;
      width: 200%;
      align-items: flex-start;
      will-change: transform;
    }

    .pin-setup-pane {
      width: 50%;
      flex-shrink: 0;
      box-sizing: border-box;
      visibility: hidden;
      pointer-events: none;
      transition: visibility 0.4s;
    }

    .pin-setup-pane.active {
      visibility: visible;
      pointer-events: auto;
    }

    /* CAPA PIN SOBREPUESTA (ESTILO IOS LOCKSCREEN) */
    .pin-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(28px) saturate(190%);
      -webkit-backdrop-filter: blur(28px) saturate(190%);
      z-index: 50;
      border-radius: 24px;
      padding: 24px 28px 18px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      transform: translateY(100%);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
    }

    .pin-overlay.active {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .back-to-pass-btn {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-n-500, #7D797F);
      padding: 4px 8px;
      margin-top: -4px;
      margin-left: -8px;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .back-to-pass-btn:hover {
      color: var(--color-n-800, #383438);
      background: rgba(18, 16, 18, 0.04);
    }
    .back-to-pass-btn svg {
      width: 16px;
      height: 16px;
    }

    .pin-overlay-header {
      text-align: center;
      margin-top: 2px;
      margin-bottom: 2px;
    }

    .pin-overlay-title {
      font-size: 17px;
      font-weight: 800;
      color: var(--color-n-900, #121012);
      margin: 0 0 2px;
      letter-spacing: -0.3px;
    }

    .pin-overlay-user {
      font-size: 13px;
      color: var(--color-n-500, #7D797F);
      margin: 0;
    }

    .forgot-pin-link {
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--rr-red);
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .forgot-pin-link:hover {
      color: var(--rr-red-dark);
      background: rgba(198, 29, 38, 0.05);
      text-decoration: underline;
    }

    .btn {
      position: relative;
      width: 100%;
      height: 50px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14.5px;
      font-weight: 700;
      color: #ffffff;
      background: var(--rr-red);
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(198, 29, 38, 0.2);
      transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .btn:hover:not(:disabled) {
      background: var(--rr-red-dark);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(198, 29, 38, 0.35);
    }

    .btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-shimmer {
      position: absolute;
      top: 0;
      left: -80%;
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transform: skewX(-25deg);
      animation: btn-shimmer 3s ease-in-out infinite;
    }

    @keyframes btn-shimmer {
      0% { left: -80%; }
      30%, 100% { left: 180%; }
    }

    .btn-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .btn-text-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-text-wrap svg {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
    }

    .btn:hover .btn-text-wrap svg {
      transform: translateX(4px);
    }

    .btn-dots {
      display: flex;
      gap: 5px;
      align-items: center;
    }

    .btn-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffffff;
      animation: dot-bounce 1.2s infinite ease-in-out;
    }
    .btn-dots span:nth-child(2) { animation-delay: 0.15s; }
    .btn-dots span:nth-child(3) { animation-delay: 0.3s; }

    @keyframes dot-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 16px;
      box-sizing: border-box;
      width: 100%;
    }

    .alert-warn {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #78350F;
    }

    .alert-error {
      background: #FEF2F2;
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #991B1B;
    }

    .alert-ok {
      background: #F0FDF4;
      border: 1px solid rgba(34, 197, 94, 0.2);
      color: #166534;
    }

    .alert-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .alert span {
      flex: 1;
    }

    .alert-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: inherit;
      opacity: 0.6;
      display: flex;
      align-items: center;
      transition: opacity 0.15s;
    }
    .alert-close:hover {
      opacity: 1;
    }
    .alert-close svg {
      width: 14px;
      height: 14px;
    }

    .step-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(198, 29, 38, 0.08);
      border: 1px solid rgba(198, 29, 38, 0.15);
      color: var(--rr-red);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }

    .step-badge-icon {
      width: 13px;
      height: 13px;
    }

    .skip-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-n-400, #A4A0A5);
      padding: 10px 0 0;
      transition: color 0.15s ease;
    }
    .skip-btn:hover {
      color: var(--color-n-600, #585459);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-n-400, #A4A0A5);
      padding: 0 0 12px;
      transition: color 0.15s ease;
    }
    .back-link:hover {
      color: var(--color-n-600, #585459);
    }

    .back-icon {
      width: 14px;
      height: 14px;
    }

    .card-footer {
      margin-top: 18px;
      border-top: 1px solid rgba(18, 16, 18, 0.05);
      padding-top: 12px;
    }

    .copyright {
      font-size: 11px;
      color: var(--color-n-400, #A4A0A5);
      text-align: center;
      margin: 0;
    }

    .hint-error {
      font-size: 12px;
      color: #EF4444;
      margin-top: 4px;
      font-weight: 500;
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
  @ViewChild('brandCanvas') brandCanvasRef!: ElementRef<HTMLCanvasElement>;

  username       = '';
  password       = '';
  pinLogin       = '';
  pinNew         = '';
  pinConfirm     = '';
  forgotUsername = '';
  passShowing    = false;

  mode              = signal<AuthMode>('password');
  step              = signal<Step>('credentials');
  pinSetupStep      = signal<PinSetupSubStep>('new');
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
  private animationFrameId = 0;
  private mouse = { x: -9999, y: -9999 };
  private panelOffset = { left: 0, top: 0 };
  private orbs: {
    x: number;
    y: number;
    radius: number;
    color: string;
    speed: number;
  }[] = [];

  private domReady = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // Effect to animate step changes
    effect(() => {
      const s = this.step();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const err = this.error(); // trigger on error change as well
      if (!this.domReady) return;
      
      const activePane = document.querySelector(`.step-pane-${s}`);
      const viewport = document.querySelector('.steps-viewport');
      const wrapper = document.querySelector('.steps-wrapper');

      if (wrapper) {
        let targetX = 0;
        if (s === 'credentials') targetX = 0;
        else if (s === 'pin-setup') targetX = -33.333;
        else if (s === 'forgot-pin') targetX = -66.666;
        
        gsap.to(wrapper, { xPercent: targetX, duration: 0.5, ease: 'power3.out' });
      }

      if (activePane && viewport) {
        setTimeout(() => {
          const height = activePane.getBoundingClientRect().height;
          gsap.to(viewport, { height: height, duration: 0.4, ease: 'power3.out' });
        }, 30);
      }
    });

    // Effect to slide configuration steps inside pin-setup
    effect(() => {
      const ps = this.pinSetupStep();
      if (!this.domReady) return;

      const wrapper = document.querySelector('.pin-setup-slider');
      if (wrapper) {
        const targetX = ps === 'confirm' ? -50 : 0;
        gsap.to(wrapper, { xPercent: targetX, duration: 0.4, ease: 'power3.out' });
      }

      const activePane = document.querySelector(`.step-pane-pin-setup`);
      const viewport = document.querySelector('.steps-viewport');
      if (activePane && viewport && this.step() === 'pin-setup') {
        setTimeout(() => {
          const height = activePane.getBoundingClientRect().height;
          gsap.to(viewport, { height: height, duration: 0.4, ease: 'power3.out' });
        }, 30);
      }
    });
  }

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
    setTimeout(() => {
      this.initCanvas();
      this.domReady = true;
      this.initGsapLayout();
      this.playIntroAnimation();
    }, 120);
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
  }

  // ── GSAP Layout Init & Intro ───────────────────────────────────

  private initGsapLayout(): void {
    const stepsWrapper = document.querySelector('.steps-wrapper');
    const viewport = document.querySelector('.steps-viewport');

    if (stepsWrapper) {
      let targetX = 0;
      if (this.step() === 'pin-setup') targetX = -33.333;
      else if (this.step() === 'forgot-pin') targetX = -66.666;
      gsap.set(stepsWrapper, { xPercent: targetX });
    }

    const activePane = document.querySelector(`.step-pane-${this.step()}`);
    if (activePane && viewport) {
      const height = activePane.getBoundingClientRect().height;
      gsap.set(viewport, { height: height });
    }
  }

  private playIntroAnimation(): void {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    gsap.set('.login-card', { y: 40, opacity: 0 });
    gsap.set('.logo-area', { scale: 0.8, opacity: 0 });
    gsap.set('.brand-title, .brand-subtitle', { y: 15, opacity: 0 });
    gsap.set('.field-container', { y: 20, opacity: 0 });
    gsap.set('.btn', { y: 15, opacity: 0 });
    gsap.set('.mode-toggle-container', { y: 15, opacity: 0 });

    tl.to('.login-card', { y: 0, opacity: 1, duration: 0.8 })
      .to('.logo-area', { scale: 1, opacity: 1, duration: 0.5 }, '-=0.4')
      .to('.brand-title, .brand-subtitle', { y: 0, opacity: 1, duration: 0.4, stagger: 0.1 }, '-=0.3')
      .to('.field-container', { y: 0, opacity: 1, duration: 0.4, stagger: 0.1 }, '-=0.2')
      .to('.btn', { y: 0, opacity: 1, duration: 0.4 }, '-=0.2')
      .to('.mode-toggle-container', { y: 0, opacity: 1, duration: 0.4 }, '-=0.3');
  }

  private showError(msg: string): void {
    this.error.set(msg);
    if (msg) {
      this.triggerErrorShake();
    }
  }

  private triggerErrorShake(): void {
    gsap.fromTo('.login-card',
      { x: -8 },
      {
        x: 8, duration: 0.08, repeat: 5, yoyo: true, ease: 'power1.inOut', onComplete: () => {
          gsap.set('.login-card', { x: 0 });
        }
      }
    );
  }

  // ── Canvas Fluid Background ────────────────────────────────────

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
    const container = canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    this.panelOffset = { left: rect.left, top: rect.top };
    this.spawnOrbs();
  }

  private spawnOrbs(): void {
    if (!this.brandCanvasRef) return;
    const canvas = this.brandCanvasRef.nativeElement;
    const W = canvas.width;
    const H = canvas.height;

    // Kill existing orb animations
    gsap.killTweensOf(this.orbs);

    this.orbs = [
      {
        x: W * 0.25,
        y: H * 0.25,
        radius: Math.min(W, H) * 0.45,
        color: 'rgba(198, 29, 38, 0.24)', // R&R Red
        speed: 0.005
      },
      {
        x: W * 0.75,
        y: H * 0.3,
        radius: Math.min(W, H) * 0.38,
        color: 'rgba(245, 158, 11, 0.18)', // Amber
        speed: 0.003
      },
      {
        x: W * 0.3,
        y: H * 0.75,
        radius: Math.min(W, H) * 0.48,
        color: 'rgba(99, 102, 241, 0.16)', // Indigo
        speed: 0.004
      },
      {
        x: W * 0.7,
        y: H * 0.7,
        radius: Math.min(W, H) * 0.44,
        color: 'rgba(239, 68, 68, 0.22)', // Coral
        speed: 0.006
      }
    ];

    this.orbs.forEach((orb) => {
      this.animateOrb(orb, W, H);
    });
  }

  private animateOrb(orb: any, W: number, H: number): void {
    const rangeX = W * 0.25;
    const rangeY = H * 0.25;

    gsap.to(orb, {
      x: orb.x + (Math.random() - 0.5) * rangeX,
      y: orb.y + (Math.random() - 0.5) * rangeY,
      radius: orb.radius * (0.85 + Math.random() * 0.3),
      duration: 8 + Math.random() * 8,
      ease: 'sine.inOut',
      onComplete: () => {
        this.animateOrb(orb, W, H);
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

    this.orbs.forEach(orb => {
      let drawX = orb.x;
      let drawY = orb.y;

      const mx = this.mouse.x;
      const my = this.mouse.y;

      if (mx !== -9999 && my !== -9999) {
        const canvasMx = mx - this.panelOffset.left;
        const canvasMy = my - this.panelOffset.top;

        const dx = canvasMx - orb.x;
        const dy = canvasMy - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 400) {
          const pull = (1 - dist / 400) * 45;
          drawX += (dx / dist) * pull;
          drawY += (dy / dist) * pull;
        }
      }

      const grad = this.ctx!.createRadialGradient(
        drawX, drawY, 0,
        drawX, drawY, orb.radius
      );
      grad.addColorStop(0, orb.color);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx!.beginPath();
      this.ctx!.arc(drawX, drawY, orb.radius, 0, Math.PI * 2);
      this.ctx!.fillStyle = grad;
      this.ctx!.fill();
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
    if (m === 'pin') {
      const u = this.username.trim();
      if (!u) {
        this.showError('Ingresa tu nombre de usuario para ingresar con PIN');
        return;
      }
    }
    this.mode.set(m);
    this.error.set('');
    this.password = '';
    this.pinLogin = '';
    
    if (m === 'pin') {
      // Blur username field to allow keydown listener to work globally for PIN
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }

  // ── Teclado iOS e Interacciones de PIN ───────────────────────────

  onKeypadTap(num: number): void {
    const digit = num.toString();

    if (this.step() === 'credentials' && this.mode() === 'pin') {
      if (this.pinLogin.length < 6) {
        this.pinLogin += digit;
        if (this.pinLogin.length === 6) {
          setTimeout(() => this.onSubmit(), 200);
        }
      }
    } else if (this.step() === 'pin-setup') {
      if (this.pinSetupStep() === 'new') {
        if (this.pinNew.length < 6) {
          this.pinNew += digit;
          if (this.pinNew.length === 6) {
            setTimeout(() => this.pinSetupStep.set('confirm'), 300);
          }
        }
      } else {
        if (this.pinConfirm.length < 6) {
          this.pinConfirm += digit;
          if (this.pinConfirm.length === 6) {
            setTimeout(() => this.onPinSetup(), 350);
          }
        }
      }
    }
  }

  onKeypadBackspace(): void {
    if (this.step() === 'credentials' && this.mode() === 'pin') {
      this.pinLogin = this.pinLogin.slice(0, -1);
    } else if (this.step() === 'pin-setup') {
      if (this.pinSetupStep() === 'new') {
        this.pinNew = this.pinNew.slice(0, -1);
      } else {
        this.pinConfirm = this.pinConfirm.slice(0, -1);
      }
    }
  }

  onKeypadClear(): void {
    if (this.step() === 'credentials' && this.mode() === 'pin') {
      this.pinLogin = '';
    } else if (this.step() === 'pin-setup') {
      if (this.pinSetupStep() === 'new') {
        this.pinNew = '';
      } else {
        this.pinConfirm = '';
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Si el usuario está escribiendo en el campo de texto de usuario o contraseña, no interfieras
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      return;
    }

    if (event.key >= '0' && event.key <= '9') {
      const num = parseInt(event.key, 10);
      this.onKeypadTap(num);
    } else if (event.key === 'Backspace') {
      this.onKeypadBackspace();
    } else if (event.key === 'Escape' || event.key === 'Delete') {
      this.onKeypadClear();
    }
  }

  // ── Submit credenciales ───────────────────────────────────────

  onSubmit(): void {
    this.error.set('');
    const u = this.username.trim();
    if (!u) { this.showError('Ingresa tu nombre de usuario'); return; }

    if (this.mode() === 'password') {
      if (!this.password) { this.showError('Ingresa tu contraseña'); return; }
      this.loading.set(true);
      this.auth.login({ username: u, password: this.password }).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.needsSetPin) {
            this.pendingUsername = u;
            this.pinNew = '';
            this.pinConfirm = '';
            this.pinSetupStep.set('new');
            this.step.set('pin-setup');
          } else {
            this.navigateHome();
          }
        },
        error: (err: Error) => { this.showError(err.message); this.loading.set(false); },
      });
    } else {
      if (this.pinLogin.length !== 6) { this.showError('Ingresa los 6 dígitos de tu PIN'); return; }
      this.loading.set(true);
      this.auth.pinLogin({ username: u, pin: this.pinLogin }).subscribe({
        next: () => { this.loading.set(false); this.navigateHome(); },
        error: (err: Error) => {
          this.showError(err.message);
          this.loading.set(false);
          // Reinicia el PIN ingresado ante un error
          this.pinLogin = '';
        },
      });
    }
  }

  // ── Configurar PIN ────────────────────────────────────────────

  onPinSetup(): void {
    if (this.pinNew.length !== 6 || this.pinNew !== this.pinConfirm) {
      this.showError('Los PINs no coinciden');
      this.pinConfirm = '';
      
      // Espera un segundo antes de limpiar el primer PIN y regresar al sub-paso de inicio
      setTimeout(() => {
        this.pinNew = '';
        this.pinSetupStep.set('new');
        this.error.set('');
      }, 1200);
      return;
    }
    
    this.error.set('');
    this.savingPin.set(true);
    this.auth.setInitialCampoPin(this.pendingUsername, this.pinNew).subscribe({
      next: () => { this.savingPin.set(false); this.navigateHome(); },
      error: (err: Error) => {
        this.showError(err.message);
        this.savingPin.set(false);
        this.pinNew = '';
        this.pinConfirm = '';
        this.pinSetupStep.set('new');
      },
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
    if (!u) { this.showError('Ingresa tu nombre de usuario'); return; }
    this.loadingForgot.set(true);
    this.error.set('');
    this.auth.requestPinReset(u).subscribe({
      next: () => { this.loadingForgot.set(false); this.forgotSent.set(true); },
      error: (err: Error) => {
        this.showError(err.message || 'No se pudo enviar la solicitud');
        this.loadingForgot.set(false);
      },
    });
  }

  // ── Navegación post-login ─────────────────────────────────────

  private navigateHome(): void {
    if (this.auth.can('CAMPO_USAR') && !this.auth.isAdmin()) {
      this.router.navigate(['/campo']);
    } else if (this.auth.isDueno()) {
      this.router.navigate(['/asistente-personal']);
    } else {
      this.router.navigate(['/inicio']);
    }
  }
}
