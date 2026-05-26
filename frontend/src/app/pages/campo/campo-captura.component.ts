import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CampoService, TareaCampoDto } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

type CaptureState = 'loading' | 'ready' | 'sending' | 'error';
type CameraMode = 'photo' | 'vin';

interface LocalPhoto {
  id: string;
  dataUrl: string;
  uploading: boolean;
  uploaded: boolean;
  err: boolean;
}

interface CampoDraft {
  ubicacion: string;
  vinConfirmado: string;
  incidencia: string;
}

const MIN_PHOTOS = 3;

@Component({
  selector: 'app-campo-captura',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="shell">
      <!-- ═══ LOADING ═══════════════════════════════════════════════ -->
      @if (state() === 'loading') {
        <div class="screen-center">
          <div class="loader-ring"></div>
          <p class="loader-text">Cargando unidad…</p>
        </div>
      }

      <!-- ═══ ERROR ════════════════════════════════════════════════ -->
      @if (state() === 'error') {
        <div class="screen-center">
          <div class="err-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p class="err-title">No se pudo abrir la tarea</p>
          <p class="err-sub">Regresa a la lista e intenta de nuevo.</p>
          <button class="btn-primary" (click)="goBack()">← Volver a la lista</button>
        </div>
      }

      <!-- ═══ MAIN CONTENT ═════════════════════════════════════════ -->
      @if (state() === 'ready' || state() === 'sending') {
        @let t = tarea();

        <!-- TOP BAR ───────────────────────────────────────────── -->
        <header class="topbar">
          <button class="back-btn" (click)="goBack()" aria-label="Volver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div class="topbar-info">
            <span class="folio">{{ t?.numeroConsecutivo }}</span>
            <span class="vehicle-name">{{ t?.vehiculoResumen || 'Unidad' }}</span>
          </div>

          <span class="status-chip" [class]="'chip--' + (t?.estatus || 'abierta').toLowerCase()">
            {{ estadoLabel(t?.estatus || '') }}
          </span>
        </header>

        <!-- PROGRESS STEPS ────────────────────────────────────── -->
        <div class="steps-bar">
          <div
            class="step"
            [class.step--done]="totalPhotoCount() >= MIN_PHOTOS"
            [class.step--active]="totalPhotoCount() < MIN_PHOTOS"
          >
            <div class="step-circle">
              @if (totalPhotoCount() >= MIN_PHOTOS) {
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l3.5 3.5L13 5" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6.8 6.2A2.3 2.3 0 015.2 7.2l-1.1.2A2.3 2.3 0 002.3 9.6V18A2.3 2.3 0 004.5 20.3h15A2.3 2.3 0 0021.8 18V9.6c0-1.1-.8-2-1.8-2.2l-1.1-.2A2.3 2.3 0 0117.3 6l-.8-1.3a2.2 2.2 0 00-1.7-1 48.8 48.8 0 00-5.3 0 2.2 2.2 0 00-1.7 1l-.9 1.4z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.5 12.8a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
              }
            </div>
            <span
              >Fotos<br /><strong>{{ totalPhotoCount() }}/{{ MIN_PHOTOS }}</strong></span
            >
          </div>

          <div class="step-line" [class.line--done]="totalPhotoCount() >= MIN_PHOTOS"></div>

          <div
            class="step"
            [class.step--done]="!!vinConfirmado"
            [class.step--active]="totalPhotoCount() >= MIN_PHOTOS && !vinConfirmado"
          >
            <div class="step-circle">
              @if (vinConfirmado) {
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l3.5 3.5L13 5" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M7 9h3M7 13h2" stroke-linecap="round" />
                </svg>
              }
            </div>
            <span
              >VIN<br /><strong>{{ vinConfirmado || '——' }}</strong></span
            >
          </div>

          <div class="step-line" [class.line--done]="!!vinConfirmado"></div>

          <div
            class="step"
            [class.step--done]="!!ubicacion"
            [class.step--active]="!!vinConfirmado && !ubicacion"
          >
            <div class="step-circle">
              @if (ubicacion) {
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l3.5 3.5L13 5" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 21c-4-4-7-7.5-7-11a7 7 0 0114 0c0 3.5-3 7-7 11z"
                  />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              }
            </div>
            <span
              >Ubicación<br /><strong>{{ ubicacion || '——' }}</strong></span
            >
          </div>
        </div>

        <!-- VIN REFERENCE ─────────────────────────────────────── -->
        @if (t?.vin) {
          <div class="vin-ref">
            <span class="vin-ref__label">VIN del sistema</span>
            <span class="vin-ref__value">{{ t!.vin }}</span>
          </div>
        }

        <!-- ★ HERO CAMERA BUTTON ────────────────────────────── -->
        <button
          class="hero-cam"
          [class.hero-cam--has-photos]="totalPhotoCount() > 0"
          [class.hero-cam--complete]="totalPhotoCount() >= MIN_PHOTOS"
          (click)="openCamera()"
          [disabled]="state() === 'sending'"
          type="button"
        >
          <div class="hero-cam__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6.8 6.2A2.3 2.3 0 015.2 7.2c-.4.1-.8.1-1.1.2A2.3 2.3 0 002.3 9.6V18A2.3 2.3 0 004.5 20.3h15A2.3 2.3 0 0021.8 18V9.6c0-1.1-.8-2-1.8-2.2-.4-.1-.8-.1-1.1-.2a2.3 2.3 0 01-1.6-1.1l-.8-1.3a2.2 2.2 0 00-1.7-1 48.8 48.8 0 00-5.3 0 2.2 2.2 0 00-1.7 1l-.9 1.4z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.5 12.8a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
          </div>

          @if (totalPhotoCount() === 0) {
            <span class="hero-cam__title">TOMAR FOTOS</span>
            <span class="hero-cam__sub">Mínimo {{ MIN_PHOTOS }} fotos de la unidad</span>
          } @else if (totalPhotoCount() < MIN_PHOTOS) {
            <span class="hero-cam__title">AGREGAR MÁS FOTOS</span>
            <span class="hero-cam__sub"
              >Faltan {{ MIN_PHOTOS - totalPhotoCount() }} fotos para continuar</span
            >
          } @else {
            <span class="hero-cam__title">✓ FOTOS COMPLETAS</span>
            <span class="hero-cam__sub">{{ totalPhotoCount() }} fotos · Toca para agregar más</span>
          }

          <!-- Photo count badge -->
          @if (totalPhotoCount() > 0) {
            <div class="hero-cam__badge">{{ totalPhotoCount() }}</div>
          }
        </button>

        <!-- PHOTO STRIP ──────────────────────────────────────── -->
        @if (totalPhotoCount() > 0) {
          <div class="photo-strip">
            <!-- Already-uploaded thumbnails -->
            @for (url of t?.fotosUrls || []; track url) {
              <div class="thumb thumb--server">
                <img [src]="fileUrl(url)" alt="Foto guardada" />
                <span class="thumb-badge thumb-badge--ok">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2 6l2.5 2.5L10 3.5" />
                  </svg>
                </span>
              </div>
            }
            <!-- Local photos -->
            @for (photo of photos(); track photo.id) {
              <div
                class="thumb"
                [class.thumb--uploading]="photo.uploading"
                [class.thumb--ok]="photo.uploaded"
                [class.thumb--err]="photo.err"
              >
                <img [src]="photo.dataUrl" alt="Foto capturada" />
                @if (!photo.uploading && !photo.uploaded) {
                  <button
                    class="thumb-remove"
                    (click)="removePhoto(photo.id)"
                    [disabled]="state() === 'sending'"
                    aria-label="Eliminar"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                }
                @if (photo.uploading) {
                  <div class="thumb-spinner"></div>
                }
                @if (photo.uploaded) {
                  <span class="thumb-badge thumb-badge--ok">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M2 6l2.5 2.5L10 3.5"
                      />
                    </svg>
                  </span>
                }
                @if (photo.err) {
                  <span class="thumb-badge thumb-badge--err">!</span>
                }
              </div>
            }
          </div>
        }

        <!-- DATA FIELDS ──────────────────────────────────────── -->
        <div class="fields-card">
          <label class="field-row">
            <span class="field-label">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                class="field-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 18c-4-4-7-7-7-10a7 7 0 0114 0c0 3-3 6-7 10z"
                />
                <circle cx="10" cy="8" r="2.5" />
              </svg>
              Ubicación en yarda
            </span>
            <input
              [(ngModel)]="ubicacion"
              (ngModelChange)="persistDraft()"
              class="field-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              placeholder="Ej: Fila A, cajón 12"
            />
          </label>

          <div class="field-divider"></div>

          <label class="field-row">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
              <span class="field-label" style="margin-bottom: 0;">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" class="field-icon">
                  <rect x="2" y="4" width="16" height="12" rx="2" />
                  <path stroke-linecap="round" d="M5 8h5M5 12h3" />
                </svg>
                VIN confirmado (últimos 6)
              </span>
              <button class="btn-ghost" style="padding: 4px 8px; font-size: 12px; display: flex; gap: 4px; align-items: center; border: 1.5px solid var(--border); border-radius: var(--radius-sm); color: var(--text-2); background: white;" (click)="openVinScanner()" type="button">
                 <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M17 8v8M14 8v8"/></svg>
                 Escanear
              </button>
            </div>
            <input
              [(ngModel)]="vinConfirmado"
              (ngModelChange)="onVinChange($event)"
              class="field-input field-input--mono"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              spellcheck="false"
              maxlength="6"
              placeholder="{{ t?.vinCorto || 'XXXXXX' }}"
            />
            @if (vinConfirmado && t?.vinCorto) {
              <span
                class="vin-match"
                [class.vin-match--ok]="vinConfirmado.toUpperCase() === t!.vinCorto!.toUpperCase()"
                [class.vin-match--bad]="vinConfirmado.toUpperCase() !== t!.vinCorto!.toUpperCase()"
              >
                {{
                  vinConfirmado.toUpperCase() === t!.vinCorto!.toUpperCase()
                    ? '✓ Coincide con el sistema'
                    : '⚠ No coincide — verifica el VIN'
                }}
              </span>
            }
          </label>
        </div>

        <!-- INCIDENCIA TOGGLE ────────────────────────────────── -->
        @if (!showIncidencia()) {
          <button class="incidencia-toggle" (click)="showIncidencia.set(true)" type="button">
            <span class="incidencia-toggle__icon">⚠</span>
            Reportar incidencia o problema
          </button>
        } @else {
          <div class="incidencia-card">
            <div class="incidencia-card__head">
              <span class="incidencia-card__title">⚠ Incidencia</span>
              @if (!incidencia) {
                <button
                  class="incidencia-card__close"
                  (click)="showIncidencia.set(false)"
                  type="button"
                >
                  Quitar
                </button>
              }
            </div>
            <textarea
              [(ngModel)]="incidencia"
              (ngModelChange)="persistDraft()"
              class="incidencia-input"
              rows="3"
              placeholder="Describe el problema: daño visible, VIN no coincide, unidad no localizada..."
            ></textarea>
          </div>
        }

        <!-- ACTION BAR ───────────────────────────────────────── -->
        <div class="action-bar">
          @if (state() === 'sending') {
            <div class="send-progress">
              <div class="send-progress__bar" [style.width.%]="sendProgressPct()"></div>
              <span>Subiendo {{ uploadedCount() }} de {{ photos().length }} fotos…</span>
            </div>
          } @else {
            <button
              class="btn-primary btn-send"
              (click)="sendReport()"
              [disabled]="!canSend()"
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Guardar captura
            </button>
            <button class="btn-ghost" (click)="goBack()" type="button">Cancelar</button>
          }
        </div>
      }

      <!-- ═══ CAMERA OVERLAY ══════════════════════════════════════ -->
      @if (cameraOpen()) {
        <div class="camera-shell">
          <video #video autoplay playsinline muted class="camera-feed"></video>
          <canvas #canvas class="canvas-hidden"></canvas>

          @if (flash()) {
            <div class="flash-overlay"></div>
          }

          <!-- Camera top bar -->
          <div class="cam-top">
            <button class="cam-pill-btn" (click)="closeCamera()" type="button">✕ Cerrar</button>
            @if (cameraMode() === 'photo') {
              <div class="cam-counter">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.5 5.5A1.5 1.5 0 014 4h1.2L6 2.5A1.5 1.5 0 017.2 2h1.6A1.5 1.5 0 0110 2.5l.8 1.5H12a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0112 13H4a1.5 1.5 0 01-1.5-1.5v-6z"
                  />
                  <circle cx="8" cy="8.5" r="2" />
                </svg>
                {{ photos().length }} foto{{ photos().length !== 1 ? 's' : '' }}
              </div>
            } @else {
              <div class="cam-counter">Escaneando VIN...</div>
            }
            <button class="cam-pill-btn" (click)="flipCamera()" type="button">⟳ Girar</button>
          </div>

          @if (cameraError()) {
            <div class="cam-error">
              <p class="cam-error__title">Sin acceso a la cámara</p>
              <p class="cam-error__sub">{{ cameraError() }}</p>
              <button class="btn-primary" (click)="retryCamera()" type="button">Reintentar</button>
            </div>
          }

          <!-- Viewfinder guide -->
          <div class="cam-guide" [class.cam-guide--vin]="cameraMode() === 'vin'">
            <div class="corner corner--tl"></div>
            <div class="corner corner--tr"></div>
            <div class="corner corner--bl"></div>
            <div class="corner corner--br"></div>
            @if (cameraMode() === 'vin') {
              <div class="scan-line"></div>
              <p class="scan-text">Enfoca el código de barras del VIN</p>
            }
          </div>

          <!-- Shutter -->
          @if (cameraMode() === 'photo') {
            <div class="cam-bottom">
              <div class="cam-bottom__side">
                @if (photos().length > 0) {
                  <div class="last-thumb">
                    <img [src]="photos()[photos().length - 1].dataUrl" alt="Última foto" />
                  </div>
                }
              </div>

              <button
                class="shutter"
                (click)="capturePhoto()"
                [disabled]="!cameraReady() || state() === 'sending'"
                type="button"
                aria-label="Tomar foto"
              >
                <span class="shutter__inner"></span>
              </button>

              <div class="cam-bottom__side cam-bottom__side--right">
                @if (photos().length >= MIN_PHOTOS) {
                  <button class="cam-done-btn" (click)="closeCamera()" type="button">
                    Listo<br />
                    <small>{{ photos().length }} fotos</small>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </main>
  `,
  styles: [
    `
      /* ── Keyframes ──────────────────────────────────────────────────── */
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes flash {
        from {
          opacity: 0.85;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulse-ring {
        0% {
          box-shadow: 0 0 0 0 rgba(198, 29, 38, 0.35);
        }
        70% {
          box-shadow: 0 0 0 14px rgba(198, 29, 38, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(198, 29, 38, 0);
        }
      }
      @keyframes bar-enter {
        from {
          transform: scaleX(0);
        }
        to {
          transform: scaleX(1);
        }
      }

      /* ── Custom properties ──────────────────────────────────────────── */
      :host {
        --red: #c61d26;
        --red-dk: #a31820;
        --red-lt: #fee2e2;
        --green: #16a34a;
        --green-lt: #dcfce7;
        --amber: #d97706;
        --amber-lt: #fef3c7;

        --bg: #f4f5f7;
        --surface: #ffffff;
        --border: #e2e4ea;
        --text-1: #0d1017;
        --text-2: #4b5162;
        --text-3: #9ea3ae;

        --radius-sm: 10px;
        --radius-md: 16px;
        --radius-lg: 22px;

        --font: var(--font-body, 'Inter', system-ui, sans-serif);
        --font-mono: var(--font-mono, 'JetBrains Mono', monospace);

        display: block;
        min-height: 100dvh;
      }

      /* ── Shell ──────────────────────────────────────────────────────── */
      .shell {
        min-height: 100dvh;
        background: var(--bg);
        color: var(--text-1);
        font-family: var(--font);
        padding: max(12px, env(safe-area-inset-top, 12px)) 14px
          max(160px, calc(env(safe-area-inset-bottom, 0px) + 140px));
        max-width: 600px;
        margin: 0 auto;
      }

      /* ── Loading / Error screens ────────────────────────────────────── */
      .screen-center {
        min-height: 80dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: center;
        padding: 32px;
      }
      .loader-ring {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 4px solid var(--border);
        border-top-color: var(--red);
        animation: spin 0.8s linear infinite;
      }
      .loader-text {
        color: var(--text-2);
        font-size: 15px;
        margin: 0;
      }
      .err-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--red-lt);
        color: var(--red);
        display: grid;
        place-items: center;
      }
      .err-icon svg {
        width: 28px;
        height: 28px;
      }
      .err-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--text-1);
        margin: 0;
      }
      .err-sub {
        font-size: 14px;
        color: var(--text-2);
        margin: 0;
      }

      @keyframes scan {
        0% { transform: translateY(-50px); }
        100% { transform: translateY(50px); }
      }
      .cam-guide--vin {
        height: 140px !important;
      }
      .scan-line {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: #ef4444;
        box-shadow: 0 0 6px #ef4444;
        animation: scan 2s infinite linear alternate;
      }
      .scan-text {
        position: absolute;
        bottom: -40px;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      }

      /* ── Top bar ────────────────────────────────────────────────────── */
      .topbar {
        display: grid;
        grid-template-columns: 52px 1fr auto;
        gap: 10px;
        align-items: center;
        padding: 4px 0 14px;
      }
      .back-btn {
        width: 48px;
        height: 48px;
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--text-1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      }
      .back-btn svg {
        width: 22px;
        height: 22px;
      }
      .topbar-info {
        min-width: 0;
      }
      .folio {
        display: block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--text-3);
        text-transform: uppercase;
        margin-bottom: 1px;
        font-family: var(--font-mono);
      }
      .vehicle-name {
        display: block;
        font-size: 17px;
        font-weight: 700;
        color: var(--text-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
      }
      .status-chip {
        font-size: 11px;
        font-weight: 800;
        border-radius: 999px;
        padding: 5px 11px;
        white-space: nowrap;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .chip--abierta {
        background: var(--amber-lt);
        color: var(--amber);
        border: 1.5px solid #fcd34d;
      }
      .chip--tomada {
        background: #ede9fe;
        color: #7c3aed;
        border: 1.5px solid #c4b5fd;
      }
      .chip--en_yarda {
        background: #dbeafe;
        color: #1d4ed8;
        border: 1.5px solid #93c5fd;
      }
      .chip--completada {
        background: var(--green-lt);
        color: var(--green);
        border: 1.5px solid #86efac;
      }
      .chip--incidencia {
        background: var(--red-lt);
        color: var(--red);
        border: 1.5px solid #fca5a5;
      }

      /* ── Progress steps ─────────────────────────────────────────────── */
      .steps-bar {
        display: flex;
        align-items: center;
        gap: 0;
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-md);
        padding: 12px 14px;
        margin-bottom: 10px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        animation: slideUp 0.2s ease-out;
      }
      .step {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .step-circle {
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #f3f4f6;
        border: 2px solid var(--border);
        color: var(--text-3);
        display: grid;
        place-items: center;
        transition: all 0.2s;
      }
      .step-circle svg {
        width: 16px;
        height: 16px;
      }
      .step--active .step-circle {
        background: #fef2f2;
        border-color: var(--red);
        color: var(--red);
      }
      .step--done .step-circle {
        background: var(--green-lt);
        border-color: var(--green);
        color: var(--green);
      }
      .step > span {
        font-size: 11px;
        color: var(--text-3);
        line-height: 1.3;
        min-width: 0;
        overflow: hidden;
      }
      .step--active > span {
        color: var(--text-2);
      }
      .step--done > span {
        color: var(--green);
      }
      .step > span strong {
        display: block;
        font-size: 12px;
        font-weight: 700;
        font-family: var(--font-mono);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .step-line {
        height: 2px;
        width: 20px;
        flex-shrink: 0;
        background: var(--border);
        border-radius: 2px;
        margin: 0 4px;
        transition: background 0.3s;
      }
      .line--done {
        background: var(--green);
      }

      /* ── VIN reference ──────────────────────────────────────────────── */
      .vin-ref {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #eff6ff;
        border: 1.5px solid #bfdbfe;
        border-radius: var(--radius-sm);
        padding: 8px 12px;
        margin-bottom: 10px;
        font-size: 13px;
      }
      .vin-ref__label {
        color: #1d4ed8;
        font-weight: 600;
      }
      .vin-ref__value {
        font-family: var(--font-mono);
        font-weight: 700;
        color: #1e40af;
        letter-spacing: 0.04em;
      }

      /* ── Hero Camera Button ─────────────────────────────────────────── */
      .hero-cam {
        position: relative;
        width: 100%;
        background: var(--red);
        border: none;
        border-radius: var(--radius-lg);
        padding: 28px 20px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        transition:
          transform 0.15s,
          filter 0.15s;
        box-shadow:
          0 6px 24px rgba(198, 29, 38, 0.3),
          0 2px 6px rgba(198, 29, 38, 0.2);
        animation:
          slideUp 0.22s ease-out,
          pulse-ring 2.5s ease-out 1s 2;
        overflow: hidden;
      }
      .hero-cam::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
        pointer-events: none;
      }
      .hero-cam:active:not(:disabled) {
        transform: scale(0.98);
        filter: brightness(0.94);
      }
      .hero-cam:disabled {
        opacity: 0.55;
        cursor: default;
        animation: none;
      }

      .hero-cam--has-photos {
        background: var(--red-dk);
        animation: none;
      }
      .hero-cam--complete {
        background: linear-gradient(135deg, var(--green) 0%, #15803d 100%);
        box-shadow: 0 6px 24px rgba(22, 163, 74, 0.3);
        animation: none;
      }

      .hero-cam__icon {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.18);
        display: grid;
        place-items: center;
        border: 2px solid rgba(255, 255, 255, 0.25);
      }
      .hero-cam__icon svg {
        width: 38px;
        height: 38px;
        stroke: #fff;
      }
      .hero-cam__title {
        font-size: 20px;
        font-weight: 800;
        color: #fff;
        letter-spacing: 0.03em;
      }
      .hero-cam__sub {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.75);
        text-align: center;
      }
      .hero-cam__badge {
        position: absolute;
        top: 14px;
        right: 16px;
        min-width: 30px;
        height: 30px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.25);
        border: 2px solid rgba(255, 255, 255, 0.4);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        display: grid;
        place-items: center;
        padding: 0 6px;
      }

      /* ── Photo strip ────────────────────────────────────────────────── */
      .photo-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 0 0 4px;
        margin-bottom: 10px;
        scrollbar-width: none;
        animation: slideUp 0.18s ease-out;
      }
      .photo-strip::-webkit-scrollbar {
        display: none;
      }
      .thumb {
        position: relative;
        flex-shrink: 0;
        width: 76px;
        height: 76px;
        border-radius: var(--radius-sm);
        overflow: hidden;
        border: 2px solid var(--border);
        background: #e5e7eb;
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .thumb--server {
        border-color: var(--green);
      }
      .thumb--ok {
        border-color: var(--green);
      }
      .thumb--err {
        border-color: var(--red);
      }
      .thumb--uploading img {
        opacity: 0.5;
      }
      .thumb-remove {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.65);
        color: #fff;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
      }
      .thumb-remove svg {
        width: 10px;
        height: 10px;
      }
      .thumb-badge {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 800;
      }
      .thumb-badge--ok {
        background: var(--green);
        color: #fff;
      }
      .thumb-badge--err {
        background: var(--red);
        color: #fff;
      }
      .thumb-badge svg {
        width: 10px;
        height: 10px;
      }
      .thumb-spinner {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        display: grid;
        place-items: center;
      }
      .thumb-spinner::after {
        content: '';
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.4);
        border-top-color: #fff;
        animation: spin 0.7s linear infinite;
      }

      /* ── Data fields card ───────────────────────────────────────────── */
      .fields-card {
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-md);
        padding: 4px 0;
        margin-bottom: 10px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        animation: slideUp 0.24s ease-out;
      }
      .field-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 16px;
        cursor: text;
      }
      .field-divider {
        height: 1px;
        background: var(--border);
        margin: 0 16px;
      }
      .field-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-2);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .field-icon {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
      }
      .field-input {
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text-1);
        font-family: var(--font);
        font-size: 18px;
        font-weight: 600;
        padding: 14px 14px;
        outline: none;
        transition:
          border-color 0.15s,
          background 0.15s;
        width: 100%;
        box-sizing: border-box;
        -webkit-appearance: none;
      }
      .field-input:focus {
        border-color: var(--red);
        background: #fff5f5;
      }
      .field-input--mono {
        font-family: var(--font-mono);
        letter-spacing: 0.12em;
        font-size: 20px;
        text-transform: uppercase;
      }
      .vin-match {
        font-size: 12px;
        font-weight: 700;
        border-radius: 999px;
        padding: 4px 10px;
        align-self: flex-start;
      }
      .vin-match--ok {
        background: var(--green-lt);
        color: var(--green);
      }
      .vin-match--bad {
        background: var(--amber-lt);
        color: var(--amber);
      }

      /* ── Incidencia ─────────────────────────────────────────────────── */
      .incidencia-toggle {
        width: 100%;
        border: 2px dashed #fbbf24;
        border-radius: var(--radius-md);
        background: var(--amber-lt);
        color: var(--amber);
        font-size: 15px;
        font-weight: 700;
        padding: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
        transition:
          background 0.15s,
          border-color 0.15s;
      }
      .incidencia-toggle:hover {
        background: #fde68a;
        border-color: #f59e0b;
      }
      .incidencia-toggle__icon {
        font-size: 20px;
      }
      .incidencia-card {
        background: var(--surface);
        border: 2px solid #fbbf24;
        border-radius: var(--radius-md);
        padding: 14px 16px;
        margin-bottom: 10px;
        animation: slideUp 0.18s ease-out;
      }
      .incidencia-card__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .incidencia-card__title {
        font-size: 14px;
        font-weight: 800;
        color: var(--amber);
      }
      .incidencia-card__close {
        font-size: 12px;
        color: var(--text-3);
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 999px;
      }
      .incidencia-card__close:hover {
        background: var(--border);
      }
      .incidencia-input {
        width: 100%;
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text-1);
        font-family: var(--font);
        font-size: 15px;
        padding: 12px;
        outline: none;
        resize: none;
        box-sizing: border-box;
        line-height: 1.5;
        transition: border-color 0.15s;
      }
      .incidencia-input:focus {
        border-color: var(--amber);
        background: var(--amber-lt);
      }

      /* ── Action bar ─────────────────────────────────────────────────── */
      .action-bar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 50;
        background: var(--surface);
        border-top: 1.5px solid var(--border);
        padding: 12px 16px max(16px, env(safe-area-inset-bottom, 16px));
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
        max-width: 600px;
        margin: 0 auto;
      }

      /* ── Buttons ────────────────────────────────────────────────────── */
      .btn-primary {
        border: none;
        border-radius: var(--radius-md);
        background: var(--red);
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        min-height: 56px;
        padding: 0 24px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition:
          transform 0.12s,
          filter 0.15s;
        -webkit-appearance: none;
      }
      .btn-primary:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      .btn-primary:active:not(:disabled) {
        transform: scale(0.98);
      }
      .btn-primary:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .btn-primary svg {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }

      .btn-send {
        width: 100%;
        font-size: 17px;
        box-shadow: 0 4px 16px rgba(198, 29, 38, 0.3);
      }

      .btn-ghost {
        background: none;
        border: none;
        color: var(--text-3);
        font-size: 14px;
        font-weight: 600;
        min-height: 40px;
        cursor: pointer;
        width: 100%;
        -webkit-appearance: none;
      }
      .btn-ghost:hover {
        color: var(--text-2);
      }

      /* ── Send progress bar ──────────────────────────────────────────── */
      .send-progress {
        background: #f3f4f6;
        border-radius: var(--radius-sm);
        padding: 14px 16px;
        position: relative;
        overflow: hidden;
      }
      .send-progress span {
        position: relative;
        z-index: 1;
        font-size: 14px;
        font-weight: 700;
        color: var(--text-2);
      }
      .send-progress__bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: var(--green-lt);
        border-radius: var(--radius-sm);
        transition: width 0.4s ease;
        transform-origin: left;
      }

      /* ── Camera overlay ─────────────────────────────────────────────── */
      .camera-shell {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: #000;
        overflow: hidden;
      }
      .camera-feed {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .canvas-hidden {
        display: none;
      }
      .flash-overlay {
        position: absolute;
        inset: 0;
        background: #fff;
        pointer-events: none;
        animation: flash 0.22s ease-out forwards;
      }

      /* Camera top bar */
      .cam-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: max(16px, env(safe-area-inset-top, 16px)) 16px 16px;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
      }
      .cam-pill-btn {
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        backdrop-filter: blur(8px);
        border-radius: 999px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        min-height: 40px;
      }
      .cam-counter {
        display: flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        backdrop-filter: blur(8px);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 700;
      }
      .cam-counter svg {
        width: 16px;
        height: 16px;
      }

      /* Camera error */
      .cam-error {
        position: absolute;
        top: 50%;
        left: 20px;
        right: 20px;
        transform: translateY(-50%);
        background: rgba(15, 17, 25, 0.92);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius-lg);
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        text-align: center;
      }
      .cam-error__title {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        margin: 0;
      }
      .cam-error__sub {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        margin: 0;
        line-height: 1.45;
      }

      /* Viewfinder guide corners */
      .cam-guide {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(76vw, 320px);
        aspect-ratio: 4/3;
        pointer-events: none;
      }
      .corner {
        position: absolute;
        width: 24px;
        height: 24px;
        border-color: rgba(255, 255, 255, 0.75);
        border-style: solid;
      }
      .corner--tl {
        top: 0;
        left: 0;
        border-width: 3px 0 0 3px;
        border-radius: 4px 0 0 0;
      }
      .corner--tr {
        top: 0;
        right: 0;
        border-width: 3px 3px 0 0;
        border-radius: 0 4px 0 0;
      }
      .corner--bl {
        bottom: 0;
        left: 0;
        border-width: 0 0 3px 3px;
        border-radius: 0 0 0 4px;
      }
      .corner--br {
        bottom: 0;
        right: 0;
        border-width: 0 3px 3px 0;
        border-radius: 0 0 4px 0;
      }

      /* Camera bottom controls */
      .cam-bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        padding: 20px 24px max(32px, env(safe-area-inset-bottom, 32px));
        background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
      }
      .cam-bottom__side {
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
      .cam-bottom__side--right {
        justify-content: flex-end;
      }

      /* Last photo mini thumbnail */
      .last-thumb {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.5);
      }
      .last-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      /* Shutter button */
      .shutter {
        width: 82px;
        height: 82px;
        border-radius: 50%;
        border: 4px solid rgba(255, 255, 255, 0.85);
        background: transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
        transition: transform 0.1s;
      }
      .shutter:active:not(:disabled) {
        transform: scale(0.92);
      }
      .shutter:disabled {
        opacity: 0.4;
      }
      .shutter__inner {
        width: 66px;
        height: 66px;
        border-radius: 50%;
        background: #fff;
        display: block;
        transition: transform 0.1s;
      }
      .shutter:active:not(:disabled) .shutter__inner {
        transform: scale(0.9);
      }

      /* Done button inside camera */
      .cam-done-btn {
        border: 2px solid rgba(255, 255, 255, 0.5);
        background: rgba(22, 163, 74, 0.85);
        backdrop-filter: blur(8px);
        color: #fff;
        border-radius: var(--radius-sm);
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        text-align: center;
        line-height: 1.3;
        min-height: 52px;
      }
      .cam-done-btn small {
        font-size: 10px;
        font-weight: 500;
        opacity: 0.8;
      }

      /* ── Responsive ─────────────────────────────────────────────────── */
      @media (max-width: 400px) {
        .hero-cam {
          padding: 24px 16px;
        }
        .hero-cam__icon {
          width: 60px;
          height: 60px;
        }
        .hero-cam__icon svg {
          width: 30px;
          height: 30px;
        }
        .hero-cam__title {
          font-size: 17px;
        }
        .vehicle-name {
          font-size: 15px;
        }
        .steps-bar {
          padding: 10px;
          gap: 0;
        }
        .step > span {
          display: none;
        }
        .step--active > span,
        .step--done > span {
          display: block;
        }
      }

      @media (min-width: 601px) {
        .action-bar {
          left: 50%;
          right: auto;
          transform: translateX(-50%);
          width: 600px;
          border-left: 1.5px solid var(--border);
          border-right: 1.5px solid var(--border);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }
      }

      @media (orientation: landscape) and (max-height: 520px) {
        .cam-guide--vin {
          width: min(80vw, 500px) !important;
          height: 110px !important;
        }
        .scan-line {
          animation: scan-ls 2s infinite linear alternate;
        }
      }
      @keyframes scan-ls {
        0% { transform: translateY(-38px); }
        100% { transform: translateY(38px); }
      }
    `,
  ],
})
export class CampoCapturaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private campoService = inject(CampoService);
  private notifications = inject(NotificationService);
  private realtime = inject(RealtimeService);
  private sub?: Subscription;

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly MIN_PHOTOS = MIN_PHOTOS;

  readonly state = signal<CaptureState>('loading');
  readonly tarea = signal<TareaCampoDto | null>(null);
  readonly photos = signal<LocalPhoto[]>([]);
  readonly cameraOpen = signal(false);
  readonly cameraReady = signal(false);
  readonly cameraMode = signal<CameraMode>('photo');
  private zxingReader: BrowserMultiFormatReader | null = null;
  private scanControls: any = null;
  readonly cameraError = signal('');
  readonly flash = signal(false);
  readonly facingMode = signal<'environment' | 'user'>('environment');
  readonly showIncidencia = signal(false);

  ubicacion = '';
  vinConfirmado = '';
  incidencia = '';

  private stream: MediaStream | null = null;
  private taskId = '';

  readonly uploadedCount = computed(() => this.photos().filter(p => p.uploaded).length);
  readonly totalPhotoCount = computed(
    () => this.photos().length + (this.tarea()?.fotosUrls?.length ?? 0)
  );
  readonly canSend = computed(() => this.totalPhotoCount() > 0 && this.state() !== 'sending');
  readonly sendProgressPct = computed(() => {
    const total = this.photos().length;
    return total === 0 ? 0 : Math.round((this.uploadedCount() / total) * 100);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.taskId = id;
    this.loadDraft(id);
    this.load(id);
    this.realtime.start();
    this.sub = this.realtime.campoActualizado$.subscribe(ev => {
      if (ev.tareaCampoId === id && this.state() !== 'sending') this.load(id, false);
    });
  }

  ngOnDestroy(): void {
    this.closeCamera();
    this.sub?.unsubscribe();
  }

  load(id: string, markTaken = true): void {
    this.campoService.getById(id).subscribe({
      next: t => {
        this.tarea.set(t);
        this.ubicacion ||= t.ubicacion || '';
        this.vinConfirmado ||= this.normalizeVin(t.vinConfirmado || t.vinCorto || t.vin || '');
        this.incidencia ||= t.incidencia || '';
        if (this.incidencia) this.showIncidencia.set(true);
        this.loadLocalPhotos(id);
        this.persistDraft();
        this.state.set('ready');

        if (markTaken && t.estatus === 'ABIERTA') {
          this.campoService.tomar(t.id).subscribe({
            next: updated => this.tarea.set(updated),
            error: err => this.notifications.fromHttpError(err, 'No se pudo tomar la tarea'),
          });
        }
      },
      error: err => {
        this.state.set('error');
        this.notifications.fromHttpError(err, 'No se pudo abrir la tarea de campo');
      },
    });
  }

  openVinScanner(): void {
    if (this.state() === 'sending') return;
    this.cameraMode.set('vin');
    this.cameraOpen.set(true);
    this.cameraError.set('');
    this.cameraReady.set(false);
    window.setTimeout(() => void this.startCamera(), 0);
  }

  openCamera(): void {
    if (this.state() === 'sending') return;
    this.cameraMode.set('photo');
    this.cameraOpen.set(true);
    this.cameraError.set('');
    this.cameraReady.set(false);
    window.setTimeout(() => void this.startCamera(), 0);
  }

  closeCamera(): void {
    this.stopCamera();
    this.cameraOpen.set(false);
  }

  retryCamera(): void {
    void this.startCamera();
  }

  flipCamera(): void {
    this.facingMode.update(m => (m === 'environment' ? 'user' : 'environment'));
    void this.startCamera();
  }

  async capturePhoto(): Promise<void> {
    if (!this.videoRef || !this.canvasRef || !this.cameraReady()) return;
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    if (!video.videoWidth || !video.videoHeight) return;

    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    this.photos.update(items => [
      ...items,
      { id: crypto.randomUUID(), dataUrl, uploading: false, uploaded: false, err: false },
    ]);
    this.persistLocalPhotos();
    this.triggerFlash();
    this.vibrate([18, 28, 18]);
  }

  removePhoto(id: string): void {
    if (this.state() === 'sending') return;
    this.photos.update(items => items.filter(p => p.id !== id));
    this.persistLocalPhotos();
    this.vibrate([8]);
  }

  async sendReport(): Promise<void> {
    const task = this.tarea();
    if (!task || !this.canSend()) return;

    this.state.set('sending');
    this.closeCamera();

    try {
      let current = task;

      for (const photo of this.photos()) {
        if (photo.uploaded) continue;
        this.photos.update(items =>
          items.map(p => (p.id === photo.id ? { ...p, uploading: true, err: false } : p))
        );

        const file = this.dataUrlToFile(
          photo.dataUrl,
          `campo-${current.numeroConsecutivo}-${photo.id}.jpg`
        );
        const response = await firstValueFrom(this.campoService.uploadFoto(current.id, file));
        current = response.tarea;

        this.photos.update(items =>
          items.map(p => (p.id === photo.id ? { ...p, uploading: false, uploaded: true } : p))
        );
      }

      await firstValueFrom(
        this.campoService.completar(current.id, {
          ubicacion: this.ubicacion || null,
          vinConfirmado: this.vinConfirmado || null,
          fotosUrls: current.fotosUrls,
          incidencia: this.incidencia || null,
        })
      );

      this.clearLocalState();
      this.vibrate([60, 40, 120]);
      this.notifications.success('¡Captura guardada!');
      this.goBack();
    } catch (err) {
      this.photos.update(items =>
        items.map(p => (p.uploading ? { ...p, uploading: false, err: true } : p))
      );
      this.state.set('ready');
      this.notifications.fromHttpError(err, 'No se pudo guardar la captura');
    }
  }

  onVinChange(value: string): void {
    this.vinConfirmado = this.normalizeVin(value);
    this.persistDraft();
  }

  persistDraft(): void {
    if (!this.taskId) return;
    localStorage.setItem(
      this.draftKey(this.taskId),
      JSON.stringify({
        ubicacion: this.ubicacion,
        vinConfirmado: this.vinConfirmado,
        incidencia: this.incidencia,
      } satisfies CampoDraft)
    );
  }

  goBack(): void {
    this.closeCamera();
    void this.router.navigate(['/campo']);
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  estadoLabel(value: string): string {
    const map: Record<string, string> = {
      ABIERTA: 'Abierta',
      TOMADA: 'Tomada',
      EN_YARDA: 'En yarda',
      INCIDENCIA: 'Incidencia',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return map[value] ?? value;
  }

  private async startCamera(): Promise<void> {
    this.stopCamera();
    this.cameraError.set('');
    this.cameraReady.set(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no soporta la cámara.');
      return;
    }

    try {
      const videoConstraints: MediaTrackConstraints = {
        facingMode: { ideal: this.facingMode() },
      };
      if (this.cameraMode() === 'vin') {
        videoConstraints.width = { ideal: 640 };
        videoConstraints.height = { ideal: 480 };
      } else {
        videoConstraints.width = { ideal: 1600 };
        videoConstraints.height = { ideal: 1200 };
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play().catch(() => undefined);
      }
      this.cameraReady.set(true);
      
      if (this.cameraMode() === 'vin' && video) {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
        this.zxingReader = new BrowserMultiFormatReader(hints);
        
        this.zxingReader.decodeFromVideoElement(video, (result: any, error: any, controls?: any) => {
          if (controls) this.scanControls = controls;
          if (result) {
            const text = result.getText();
            const matches = text.match(/[A-HJ-NPR-Z0-9]{17}/gi);
            if (matches && matches.length > 0) {
              const vin = matches[0];
              this.vinConfirmado = this.normalizeVin(vin);
              this.persistDraft();
              this.notifications.success('VIN escaneado: ' + vin);
              this.vibrate([40, 40, 40]);
              this.closeCamera();
            }
          }
        });
      }
    } catch {
      this.cameraError.set('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  private stopCamera(): void {
    this.scanControls?.stop();
    this.scanControls = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraReady.set(false);
    this.zxingReader = null;
  }

  private normalizeVin(value: string): string {
    return value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(-6);
  }

  private loadDraft(id: string): void {
    const raw = localStorage.getItem(this.draftKey(id));
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as CampoDraft;
      this.ubicacion = d.ubicacion || '';
      this.vinConfirmado = this.normalizeVin(d.vinConfirmado || '');
      this.incidencia = d.incidencia || '';
      if (this.incidencia) this.showIncidencia.set(true);
    } catch {
      localStorage.removeItem(this.draftKey(id));
    }
  }

  private loadLocalPhotos(id: string): void {
    const raw = localStorage.getItem(this.photosKey(id));
    if (!raw) {
      this.photos.set([]);
      return;
    }
    try {
      const saved = JSON.parse(raw) as Array<{ id: string; dataUrl: string }>;
      this.photos.set(
        saved
          .filter(p => p.id && p.dataUrl?.startsWith('data:image/'))
          .map(p => ({
            id: p.id,
            dataUrl: p.dataUrl,
            uploading: false,
            uploaded: false,
            err: false,
          }))
      );
    } catch {
      this.photos.set([]);
      localStorage.removeItem(this.photosKey(id));
    }
  }

  private persistLocalPhotos(): void {
    if (!this.taskId) return;
    localStorage.setItem(
      this.photosKey(this.taskId),
      JSON.stringify(this.photos().map(p => ({ id: p.id, dataUrl: p.dataUrl })))
    );
  }

  private clearLocalState(): void {
    localStorage.removeItem(this.photosKey(this.taskId));
    localStorage.removeItem(this.draftKey(this.taskId));
    this.photos.set([]);
  }

  private readonly photosKey = (id: string) => `rr_campo_fotos_${id}`;
  private readonly draftKey = (id: string) => `rr_campo_draft_${id}`;

  private dataUrlToFile(dataUrl: string, fileName: string): File {
    const [header, content] = dataUrl.split(',');
    const mime = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg';
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mime });
  }

  private triggerFlash(): void {
    this.flash.set(true);
    window.setTimeout(() => this.flash.set(false), 240);
  }

  private vibrate(pattern: number[]): void {
    navigator.vibrate?.(pattern);
  }
}
