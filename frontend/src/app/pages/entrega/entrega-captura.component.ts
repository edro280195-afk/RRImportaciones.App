import {
  AfterViewInit,
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
import { EntregaTareaService, TareaEntregaDto } from '../../services/entrega-tarea.service';
import { NotificationService } from '../../services/notification.service';

type CaptureState = 'loading' | 'ready' | 'sending' | 'error';

interface LocalPhoto {
  id: string;
  dataUrl: string;
  uploading: boolean;
  uploaded: boolean;
  err: boolean;
}

interface EntregaDraft {
  nombreRecibe: string;
  ubicacionEntrega: string;
  notasChofer: string;
  incidencia: string;
}

const MIN_PHOTOS = 1;

@Component({
  selector: 'app-entrega-captura',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="shell">
      <!-- ═══ LOADING ═══════════════════════════════════════════════ -->
      @if (state() === 'loading') {
        <div class="screen-center">
          <div class="loader-ring"></div>
          <p class="loader-text">Cargando entrega…</p>
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
          <p class="err-title">No se pudo abrir la entrega</p>
          <p class="err-sub">Regresa a la lista e intenta de nuevo.</p>
          <button class="btn-primary" (click)="goBack()">← Volver</button>
        </div>
      }

      <!-- ═══ MAIN CONTENT ═════════════════════════════════════════ -->
      @if (state() === 'ready' || state() === 'sending') {
        @let t = tarea();

        <!-- TOP BAR -->
        <header class="topbar">
          <button class="back-btn" (click)="goBack()" aria-label="Volver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div class="topbar-info">
            <span class="folio">{{ t?.numeroConsecutivo }}</span>
            <span class="vehicle-name">{{ t?.vehiculoResumen || 'Entrega' }}</span>
          </div>
          <span class="status-chip chip--{{ (t?.estado || 'pendiente').toLowerCase() }}">
            {{ estadoLabel(t?.estado || '') }}
          </span>
        </header>

        <!-- CLIENTE INFO -->
        @if (t?.clienteNombre) {
          <div class="cliente-banner">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" class="cliente-icon">
              <circle cx="10" cy="6" r="3.5" />
              <path stroke-linecap="round" d="M3 18c0-4 3-7 7-7s7 3 7 7" />
            </svg>
            <div>
              <span class="cliente-label">Cliente</span>
              <span class="cliente-nombre">{{ t!.clienteNombre }}</span>
            </div>
          </div>
        }

        <!-- PROGRESS STEPS -->
        <div class="steps-bar">
          <div class="step" [class.step--done]="totalPhotoCount() >= MIN_PHOTOS" [class.step--active]="totalPhotoCount() < MIN_PHOTOS">
            <div class="step-circle">
              @if (totalPhotoCount() >= MIN_PHOTOS) {
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l3.5 3.5L13 5" /></svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.8 6.2A2.3 2.3 0 015.2 7.2l-1.1.2A2.3 2.3 0 002.3 9.6V18A2.3 2.3 0 004.5 20.3h15A2.3 2.3 0 0021.8 18V9.6c0-1.1-.8-2-1.8-2.2l-1.1-.2A2.3 2.3 0 0117.3 6l-.8-1.3a2.2 2.2 0 00-1.7-1 48.8 48.8 0 00-5.3 0 2.2 2.2 0 00-1.7 1l-.9 1.4z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.8a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              }
            </div>
            <span>Fotos<br /><strong>{{ totalPhotoCount() }}/{{ MIN_PHOTOS }}</strong></span>
          </div>

          <div class="step-line" [class.line--done]="totalPhotoCount() >= MIN_PHOTOS"></div>

          <div class="step" [class.step--done]="!!nombreRecibe" [class.step--active]="totalPhotoCount() >= MIN_PHOTOS && !nombreRecibe">
            <div class="step-circle">
              @if (nombreRecibe) {
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l3.5 3.5L13 5" /></svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4" /><path stroke-linecap="round" d="M4 20c0-5 3.5-8 8-8s8 3 8 8" /></svg>
              }
            </div>
            <span>Recibe<br /><strong>{{ nombreRecibe || '——' }}</strong></span>
          </div>

          <div class="step-line" [class.line--done]="!!nombreRecibe"></div>

          <div class="step" [class.step--done]="hasFirma()" [class.step--active]="!!nombreRecibe && !hasFirma()">
            <div class="step-circle">
              @if (hasFirma()) {
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l3.5 3.5L13 5" /></svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3 17c1-4 3-6 5-6s3 2 5-2M2 20h20" /></svg>
              }
            </div>
            <span>Firma<br /><strong>{{ hasFirma() ? 'Capturada' : 'Opcional' }}</strong></span>
          </div>
        </div>

        <!-- ★ HERO CAMERA BUTTON -->
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
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.8 6.2A2.3 2.3 0 015.2 7.2c-.4.1-.8.1-1.1.2A2.3 2.3 0 002.3 9.6V18A2.3 2.3 0 004.5 20.3h15A2.3 2.3 0 0021.8 18V9.6c0-1.1-.8-2-1.8-2.2-.4-.1-.8-.1-1.1-.2a2.3 2.3 0 01-1.6-1.1l-.8-1.3a2.2 2.2 0 00-1.7-1 48.8 48.8 0 00-5.3 0 2.2 2.2 0 00-1.7 1l-.9 1.4z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.8a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </div>
          @if (totalPhotoCount() === 0) {
            <span class="hero-cam__title">TOMAR FOTOS DE ENTREGA</span>
            <span class="hero-cam__sub">Foto del vehículo y momento de entrega</span>
          } @else if (totalPhotoCount() < MIN_PHOTOS) {
            <span class="hero-cam__title">AGREGAR MÁS FOTOS</span>
            <span class="hero-cam__sub">Faltan {{ MIN_PHOTOS - totalPhotoCount() }} fotos</span>
          } @else {
            <span class="hero-cam__title">✓ FOTOS COMPLETAS</span>
            <span class="hero-cam__sub">{{ totalPhotoCount() }} foto{{ totalPhotoCount() !== 1 ? 's' : '' }} · Toca para agregar más</span>
          }
          @if (totalPhotoCount() > 0) {
            <div class="hero-cam__badge">{{ totalPhotoCount() }}</div>
          }
        </button>

        <!-- PHOTO STRIP -->
        @if (totalPhotoCount() > 0) {
          <div class="photo-strip">
            @for (url of t?.fotosUrls || []; track url) {
              <div class="thumb thumb--server">
                <img [src]="fileUrl(url)" alt="Foto guardada" />
                <span class="thumb-badge thumb-badge--ok">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2 6l2.5 2.5L10 3.5" /></svg>
                </span>
              </div>
            }
            @for (photo of photos(); track photo.id) {
              <div class="thumb" [class.thumb--uploading]="photo.uploading" [class.thumb--ok]="photo.uploaded" [class.thumb--err]="photo.err">
                <img [src]="photo.dataUrl" alt="Foto capturada" />
                @if (!photo.uploading && !photo.uploaded) {
                  <button class="thumb-remove" (click)="removePhoto(photo.id)" [disabled]="state() === 'sending'" aria-label="Eliminar">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M4 4l8 8M12 4l-8 8" /></svg>
                  </button>
                }
                @if (photo.uploading) { <div class="thumb-spinner"></div> }
                @if (photo.uploaded) {
                  <span class="thumb-badge thumb-badge--ok">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2 6l2.5 2.5L10 3.5" /></svg>
                  </span>
                }
                @if (photo.err) { <span class="thumb-badge thumb-badge--err">!</span> }
              </div>
            }
          </div>
        }

        <!-- DATA FIELDS -->
        <div class="fields-card">
          <label class="field-row">
            <span class="field-label">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" class="field-icon">
                <circle cx="10" cy="6" r="3.5" />
                <path stroke-linecap="round" d="M3 18c0-4 3-7 7-7s7 3 7 7" />
              </svg>
              Nombre de quien recibe <span class="field-required">*</span>
            </span>
            <input
              [(ngModel)]="nombreRecibe"
              (ngModelChange)="persistDraft()"
              class="field-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              placeholder="Nombre completo"
            />
          </label>

          <div class="field-divider"></div>

          <label class="field-row">
            <span class="field-label">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" class="field-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 18c-4-4-7-7-7-10a7 7 0 0114 0c0 3-3 6-7 10z" />
                <circle cx="10" cy="8" r="2.5" />
              </svg>
              Ubicación de entrega
            </span>
            <input
              [(ngModel)]="ubicacionEntrega"
              (ngModelChange)="persistDraft()"
              class="field-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              placeholder="Ciudad, estado o dirección"
            />
          </label>

          <div class="field-divider"></div>

          <label class="field-row">
            <span class="field-label">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" class="field-icon">
                <path stroke-linecap="round" d="M4 6h12M4 10h9M4 14h6" />
              </svg>
              Notas del chofer
            </span>
            <textarea
              [(ngModel)]="notasChofer"
              (ngModelChange)="persistDraft()"
              class="field-input field-input--textarea"
              rows="2"
              placeholder="Observaciones de la entrega…"
            ></textarea>
          </label>
        </div>

        <!-- FIRMA PAD -->
        <div class="firma-section">
          <div class="firma-header">
            <span class="firma-title">Firma del receptor</span>
            <span class="firma-sub">Opcional</span>
            @if (hasFirma()) {
              <button class="firma-clear" (click)="clearFirma()" type="button">Borrar</button>
            }
          </div>
          <div class="firma-pad-wrapper">
            <canvas
              #firmaCanvas
              class="firma-pad"
              (touchstart)="firmaStart($event)"
              (touchmove)="firmaMove($event)"
              (touchend)="firmaEnd()"
              (mousedown)="firmaMouseStart($event)"
              (mousemove)="firmaMouseMove($event)"
              (mouseup)="firmaEnd()"
              (mouseleave)="firmaEnd()"
            ></canvas>
            @if (!hasFirma()) {
              <div class="firma-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" d="M3 17c1-4 3-6 5-6s3 2 5-2M2 20h20" />
                </svg>
                <span>Desliza aquí para firmar</span>
              </div>
            }
          </div>
        </div>

        <!-- INCIDENCIA TOGGLE -->
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
                <button class="incidencia-card__close" (click)="showIncidencia.set(false)" type="button">Quitar</button>
              }
            </div>
            <textarea
              [(ngModel)]="incidencia"
              (ngModelChange)="persistDraft()"
              class="incidencia-input"
              rows="3"
              placeholder="Describe el problema: daño en la unidad, cliente no disponible, dirección incorrecta…"
            ></textarea>
          </div>
        }

        <!-- ACTION BAR -->
        <div class="action-bar">
          @if (state() === 'sending') {
            <div class="send-progress">
              <div class="send-progress__bar" [style.width.%]="sendProgressPct()"></div>
              <span>Subiendo {{ uploadedCount() }} de {{ photos().length }} fotos…</span>
            </div>
          } @else {
            <button class="btn-primary btn-send" (click)="sendReport()" [disabled]="!canSend()" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Registrar entrega
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

          @if (flash()) { <div class="flash-overlay"></div> }

          <div class="cam-top">
            <button class="cam-pill-btn" (click)="closeCamera()" type="button">✕ Cerrar</button>
            <div class="cam-counter">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 5.5A1.5 1.5 0 014 4h1.2L6 2.5A1.5 1.5 0 017.2 2h1.6A1.5 1.5 0 0110 2.5l.8 1.5H12a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0112 13H4a1.5 1.5 0 01-1.5-1.5v-6z" />
                <circle cx="8" cy="8.5" r="2" />
              </svg>
              {{ photos().length }} foto{{ photos().length !== 1 ? 's' : '' }}
            </div>
            <button class="cam-pill-btn" (click)="flipCamera()" type="button">⟳ Girar</button>
          </div>

          @if (cameraError()) {
            <div class="cam-error">
              <p class="cam-error__title">Sin acceso a la cámara</p>
              <p class="cam-error__sub">{{ cameraError() }}</p>
              <button class="btn-primary" (click)="retryCamera()" type="button">Reintentar</button>
            </div>
          }

          <div class="cam-guide">
            <div class="corner corner--tl"></div>
            <div class="corner corner--tr"></div>
            <div class="corner corner--bl"></div>
            <div class="corner corner--br"></div>
          </div>

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
                  Listo<br /><small>{{ photos().length }} fotos</small>
                </button>
              }
            </div>
          </div>
        </div>
      }
    </main>
  `,
  styles: [`
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes flash { from { opacity:.85; } to { opacity:0; } }
    @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse-ring { 0% { box-shadow:0 0 0 0 rgba(29,78,216,.35); } 70% { box-shadow:0 0 0 14px rgba(29,78,216,0); } 100% { box-shadow:0 0 0 0 rgba(29,78,216,0); } }

    :host {
      --blue: #1d4ed8;
      --blue-dk: #1e40af;
      --blue-lt: #dbeafe;
      --green: #16a34a;
      --green-lt: #dcfce7;
      --amber: #d97706;
      --amber-lt: #fef3c7;
      --red: #c61d26;
      --red-lt: #fee2e2;
      --bg: #f4f5f7;
      --surface: #ffffff;
      --border: #e2e4ea;
      --text-1: #0d1017;
      --text-2: #4b5162;
      --text-3: #9ea3ae;
      --radius-sm: 10px;
      --radius-md: 16px;
      --radius-lg: 22px;
      --font: var(--font-body,'Inter',system-ui,sans-serif);
      --font-mono: var(--font-mono,'JetBrains Mono',monospace);
      display: block;
      min-height: 100dvh;
    }

    .shell {
      min-height: 100dvh;
      background: var(--bg);
      color: var(--text-1);
      font-family: var(--font);
      padding: max(12px, env(safe-area-inset-top,12px)) 14px max(180px, calc(env(safe-area-inset-bottom,0px) + 160px));
      max-width: 600px;
      margin: 0 auto;
    }

    .screen-center { min-height:80dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; text-align:center; padding:32px; }
    .loader-ring { width:48px; height:48px; border-radius:50%; border:4px solid var(--border); border-top-color:var(--blue); animation:spin .8s linear infinite; }
    .loader-text { color:var(--text-2); font-size:15px; margin:0; }
    .err-icon { width:56px; height:56px; border-radius:50%; background:var(--red-lt); color:var(--red); display:grid; place-items:center; }
    .err-icon svg { width:28px; height:28px; }
    .err-title { font-size:17px; font-weight:700; color:var(--text-1); margin:0; }
    .err-sub { font-size:14px; color:var(--text-2); margin:0; }

    .topbar { display:grid; grid-template-columns:52px 1fr auto; gap:10px; align-items:center; padding:4px 0 14px; }
    .back-btn { width:48px; height:48px; background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-sm); display:grid; place-items:center; cursor:pointer; color:var(--text-1); box-shadow:0 1px 3px rgba(0,0,0,.06); }
    .back-btn svg { width:22px; height:22px; }
    .topbar-info { min-width:0; }
    .folio { display:block; font-size:11px; font-weight:700; letter-spacing:.08em; color:var(--text-3); text-transform:uppercase; margin-bottom:1px; font-family:var(--font-mono); }
    .vehicle-name { display:block; font-size:17px; font-weight:700; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; }
    .status-chip { font-size:11px; font-weight:800; border-radius:999px; padding:5px 11px; white-space:nowrap; letter-spacing:.04em; text-transform:uppercase; }
    .chip--pendiente { background:var(--amber-lt); color:var(--amber); border:1.5px solid #fcd34d; }
    .chip--en_camino { background:var(--blue-lt); color:var(--blue); border:1.5px solid #93c5fd; }
    .chip--entregado { background:var(--green-lt); color:var(--green); border:1.5px solid #86efac; }
    .chip--incidencia { background:var(--red-lt); color:var(--red); border:1.5px solid #fca5a5; }

    .cliente-banner { display:flex; align-items:center; gap:10px; background:var(--blue-lt); border:1.5px solid #93c5fd; border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:10px; }
    .cliente-icon { width:20px; height:20px; color:var(--blue); flex-shrink:0; }
    .cliente-label { display:block; font-size:10px; font-weight:700; color:var(--blue); text-transform:uppercase; letter-spacing:.06em; }
    .cliente-nombre { display:block; font-size:14px; font-weight:700; color:var(--blue-dk); }

    .steps-bar { display:flex; align-items:center; background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:10px; box-shadow:0 1px 4px rgba(0,0,0,.05); animation:slideUp .2s ease-out; }
    .step { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
    .step-circle { flex-shrink:0; width:34px; height:34px; border-radius:50%; background:#f3f4f6; border:2px solid var(--border); color:var(--text-3); display:grid; place-items:center; transition:all .2s; }
    .step-circle svg { width:16px; height:16px; }
    .step--active .step-circle { background:#eff6ff; border-color:var(--blue); color:var(--blue); }
    .step--done .step-circle { background:var(--green-lt); border-color:var(--green); color:var(--green); }
    .step > span { font-size:11px; color:var(--text-3); line-height:1.3; min-width:0; overflow:hidden; }
    .step--active > span { color:var(--text-2); }
    .step--done > span { color:var(--green); }
    .step > span strong { display:block; font-size:12px; font-weight:700; font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .step-line { height:2px; width:20px; flex-shrink:0; background:var(--border); border-radius:2px; margin:0 4px; transition:background .3s; }
    .line--done { background:var(--green); }

    .hero-cam { position:relative; width:100%; background:var(--blue); border:none; border-radius:var(--radius-lg); padding:28px 20px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; margin-bottom:10px; transition:transform .15s,filter .15s; box-shadow:0 6px 24px rgba(29,78,216,.3),0 2px 6px rgba(29,78,216,.2); animation:slideUp .22s ease-out,pulse-ring 2.5s ease-out 1s 2; overflow:hidden; }
    .hero-cam::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.08) 0%,transparent 60%); pointer-events:none; }
    .hero-cam:active:not(:disabled) { transform:scale(.98); filter:brightness(.94); }
    .hero-cam:disabled { opacity:.55; cursor:default; animation:none; }
    .hero-cam--has-photos { background:var(--blue-dk); animation:none; }
    .hero-cam--complete { background:linear-gradient(135deg,var(--green) 0%,#15803d 100%); box-shadow:0 6px 24px rgba(22,163,74,.3); animation:none; }
    .hero-cam__icon { width:72px; height:72px; border-radius:50%; background:rgba(255,255,255,.18); display:grid; place-items:center; border:2px solid rgba(255,255,255,.25); }
    .hero-cam__icon svg { width:38px; height:38px; stroke:#fff; }
    .hero-cam__title { font-size:20px; font-weight:800; color:#fff; letter-spacing:.03em; }
    .hero-cam__sub { font-size:13px; color:rgba(255,255,255,.75); text-align:center; }
    .hero-cam__badge { position:absolute; top:14px; right:16px; min-width:30px; height:30px; border-radius:999px; background:rgba(255,255,255,.25); border:2px solid rgba(255,255,255,.4); color:#fff; font-size:14px; font-weight:800; display:grid; place-items:center; padding:0 6px; }

    .photo-strip { display:flex; gap:8px; overflow-x:auto; padding:0 0 4px; margin-bottom:10px; scrollbar-width:none; animation:slideUp .18s ease-out; }
    .photo-strip::-webkit-scrollbar { display:none; }
    .thumb { position:relative; flex-shrink:0; width:76px; height:76px; border-radius:var(--radius-sm); overflow:hidden; border:2px solid var(--border); background:#e5e7eb; }
    .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .thumb--server { border-color:var(--green); }
    .thumb--ok { border-color:var(--green); }
    .thumb--err { border-color:var(--red); }
    .thumb--uploading img { opacity:.5; }
    .thumb-remove { position:absolute; top:4px; right:4px; width:24px; height:24px; border-radius:50%; border:none; background:rgba(0,0,0,.65); color:#fff; cursor:pointer; display:grid; place-items:center; padding:0; }
    .thumb-remove svg { width:10px; height:10px; }
    .thumb-badge { position:absolute; bottom:4px; right:4px; width:20px; height:20px; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:800; }
    .thumb-badge--ok { background:var(--green); color:#fff; }
    .thumb-badge--err { background:var(--red); color:#fff; }
    .thumb-badge svg { width:10px; height:10px; }
    .thumb-spinner { position:absolute; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center; }
    .thumb-spinner::after { content:''; width:24px; height:24px; border-radius:50%; border:3px solid rgba(255,255,255,.4); border-top-color:#fff; animation:spin .7s linear infinite; }

    .fields-card { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:4px 0; margin-bottom:10px; box-shadow:0 1px 4px rgba(0,0,0,.05); animation:slideUp .24s ease-out; }
    .field-row { display:flex; flex-direction:column; gap:6px; padding:14px 16px; cursor:text; }
    .field-divider { height:1px; background:var(--border); margin:0 16px; }
    .field-label { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:.06em; }
    .field-required { color:var(--red); }
    .field-icon { width:15px; height:15px; flex-shrink:0; }
    .field-input { border:1.5px solid var(--border); border-radius:var(--radius-sm); background:var(--bg); color:var(--text-1); font-family:var(--font); font-size:18px; font-weight:600; padding:14px 14px; outline:none; transition:border-color .15s,background .15s; width:100%; box-sizing:border-box; -webkit-appearance:none; }
    .field-input:focus { border-color:var(--blue); background:#eff6ff; }
    .field-input--textarea { font-size:15px; resize:none; line-height:1.5; }

    .firma-section { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:14px 16px; margin-bottom:10px; box-shadow:0 1px 4px rgba(0,0,0,.05); animation:slideUp .26s ease-out; }
    .firma-header { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
    .firma-title { font-size:12px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:.06em; flex:1; }
    .firma-sub { font-size:11px; color:var(--text-3); font-weight:600; }
    .firma-clear { font-size:12px; color:var(--red); background:none; border:none; cursor:pointer; font-weight:700; padding:4px 8px; border-radius:6px; }
    .firma-clear:hover { background:var(--red-lt); }
    .firma-pad-wrapper { position:relative; border:1.5px dashed var(--border); border-radius:var(--radius-sm); background:#fafafa; overflow:hidden; }
    .firma-pad { display:block; width:100%; height:120px; touch-action:none; cursor:crosshair; }
    .firma-placeholder { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; pointer-events:none; color:var(--text-3); }
    .firma-placeholder svg { width:28px; height:28px; }
    .firma-placeholder span { font-size:13px; font-weight:600; }

    .incidencia-toggle { width:100%; border:2px dashed #fbbf24; border-radius:var(--radius-md); background:var(--amber-lt); color:var(--amber); font-size:15px; font-weight:700; padding:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px; transition:background .15s,border-color .15s; }
    .incidencia-toggle:hover { background:#fde68a; border-color:#f59e0b; }
    .incidencia-toggle__icon { font-size:20px; }
    .incidencia-card { background:var(--surface); border:2px solid #fbbf24; border-radius:var(--radius-md); padding:14px 16px; margin-bottom:10px; animation:slideUp .18s ease-out; }
    .incidencia-card__head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .incidencia-card__title { font-size:14px; font-weight:800; color:var(--amber); }
    .incidencia-card__close { font-size:12px; color:var(--text-3); background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:999px; }
    .incidencia-card__close:hover { background:var(--border); }
    .incidencia-input { width:100%; border:1.5px solid var(--border); border-radius:var(--radius-sm); background:var(--bg); color:var(--text-1); font-family:var(--font); font-size:15px; padding:12px; outline:none; resize:none; box-sizing:border-box; line-height:1.5; transition:border-color .15s; }
    .incidencia-input:focus { border-color:var(--amber); background:var(--amber-lt); }

    .action-bar { position:fixed; left:0; right:0; bottom:0; z-index:50; background:var(--surface); border-top:1.5px solid var(--border); padding:12px 16px max(16px,env(safe-area-inset-bottom,16px)); display:flex; flex-direction:column; gap:10px; box-shadow:0 -4px 20px rgba(0,0,0,.08); max-width:600px; margin:0 auto; }
    .btn-primary { border:none; border-radius:var(--radius-md); background:var(--blue); color:#fff; font-size:16px; font-weight:800; min-height:56px; padding:0 24px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:10px; transition:transform .12s,filter .15s; -webkit-appearance:none; }
    .btn-primary:hover:not(:disabled) { filter:brightness(1.08); }
    .btn-primary:active:not(:disabled) { transform:scale(.98); }
    .btn-primary:disabled { opacity:.45; cursor:default; }
    .btn-primary svg { width:22px; height:22px; flex-shrink:0; }
    .btn-send { width:100%; font-size:17px; box-shadow:0 4px 16px rgba(29,78,216,.3); }
    .btn-ghost { background:none; border:none; color:var(--text-3); font-size:14px; font-weight:600; min-height:40px; cursor:pointer; width:100%; -webkit-appearance:none; }
    .btn-ghost:hover { color:var(--text-2); }

    .send-progress { background:#f3f4f6; border-radius:var(--radius-sm); padding:14px 16px; position:relative; overflow:hidden; }
    .send-progress span { position:relative; z-index:1; font-size:14px; font-weight:700; color:var(--text-2); }
    .send-progress__bar { position:absolute; left:0; top:0; bottom:0; background:var(--green-lt); border-radius:var(--radius-sm); transition:width .4s ease; }

    .camera-shell { position:fixed; inset:0; z-index:100; background:#000; overflow:hidden; }
    .camera-feed { width:100%; height:100%; object-fit:cover; display:block; }
    .canvas-hidden { display:none; }
    .flash-overlay { position:absolute; inset:0; background:#fff; pointer-events:none; animation:flash .22s ease-out forwards; }
    .cam-top { position:absolute; top:0; left:0; right:0; display:flex; align-items:center; justify-content:space-between; padding:max(16px,env(safe-area-inset-top,16px)) 16px 16px; background:linear-gradient(to bottom,rgba(0,0,0,.6),transparent); }
    .cam-pill-btn { border:1px solid rgba(255,255,255,.3); background:rgba(0,0,0,.5); color:#fff; backdrop-filter:blur(8px); border-radius:999px; padding:8px 16px; font-size:13px; font-weight:700; cursor:pointer; min-height:40px; }
    .cam-counter { display:flex; align-items:center; gap:6px; border:1px solid rgba(255,255,255,.3); background:rgba(0,0,0,.5); color:#fff; backdrop-filter:blur(8px); border-radius:999px; padding:8px 14px; font-size:13px; font-weight:700; }
    .cam-counter svg { width:16px; height:16px; }
    .cam-error { position:absolute; top:50%; left:20px; right:20px; transform:translateY(-50%); background:rgba(15,17,25,.92); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.12); border-radius:var(--radius-lg); padding:28px 24px; display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; }
    .cam-error__title { font-size:18px; font-weight:700; color:#fff; margin:0; }
    .cam-error__sub { font-size:13px; color:rgba(255,255,255,.6); margin:0; line-height:1.45; }
    .cam-guide { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:min(76vw,320px); aspect-ratio:4/3; pointer-events:none; }
    .corner { position:absolute; width:24px; height:24px; border-color:rgba(255,255,255,.75); border-style:solid; }
    .corner--tl { top:0; left:0; border-width:3px 0 0 3px; border-radius:4px 0 0 0; }
    .corner--tr { top:0; right:0; border-width:3px 3px 0 0; border-radius:0 4px 0 0; }
    .corner--bl { bottom:0; left:0; border-width:0 0 3px 3px; border-radius:0 0 0 4px; }
    .corner--br { bottom:0; right:0; border-width:0 3px 3px 0; border-radius:0 0 4px 0; }
    .cam-bottom { position:absolute; left:0; right:0; bottom:0; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px; padding:20px 24px max(32px,env(safe-area-inset-bottom,32px)); background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 100%); }
    .cam-bottom__side { display:flex; align-items:center; justify-content:flex-start; }
    .cam-bottom__side--right { justify-content:flex-end; }
    .last-thumb { width:52px; height:52px; border-radius:10px; overflow:hidden; border:2px solid rgba(255,255,255,.5); }
    .last-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .shutter { width:82px; height:82px; border-radius:50%; border:4px solid rgba(255,255,255,.85); background:transparent; cursor:pointer; display:grid; place-items:center; transition:transform .1s; }
    .shutter:active:not(:disabled) { transform:scale(.92); }
    .shutter:disabled { opacity:.4; }
    .shutter__inner { width:66px; height:66px; border-radius:50%; background:#fff; display:block; transition:transform .1s; }
    .shutter:active:not(:disabled) .shutter__inner { transform:scale(.9); }
    .cam-done-btn { border:2px solid rgba(255,255,255,.5); background:rgba(22,163,74,.85); backdrop-filter:blur(8px); color:#fff; border-radius:var(--radius-sm); padding:8px 14px; font-size:12px; font-weight:800; cursor:pointer; text-align:center; line-height:1.3; min-height:52px; }
    .cam-done-btn small { font-size:10px; font-weight:500; opacity:.8; }

    @media (max-width:400px) { .hero-cam { padding:24px 16px; } .hero-cam__icon { width:60px; height:60px; } .hero-cam__icon svg { width:30px; height:30px; } .hero-cam__title { font-size:17px; } .vehicle-name { font-size:15px; } }
    @media (min-width:601px) { .action-bar { left:50%; right:auto; transform:translateX(-50%); width:600px; border-left:1.5px solid var(--border); border-right:1.5px solid var(--border); border-radius:var(--radius-md) var(--radius-md) 0 0; } }
  `],
})
export class EntregaCapturaComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private entregaService = inject(EntregaTareaService);
  private notifications = inject(NotificationService);
  private sub?: Subscription;

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('firmaCanvas') firmaCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly MIN_PHOTOS = MIN_PHOTOS;

  readonly state = signal<CaptureState>('loading');
  readonly tarea = signal<TareaEntregaDto | null>(null);
  readonly photos = signal<LocalPhoto[]>([]);
  readonly cameraOpen = signal(false);
  readonly cameraReady = signal(false);
  readonly cameraError = signal('');
  readonly flash = signal(false);
  readonly facingMode = signal<'environment' | 'user'>('environment');
  readonly showIncidencia = signal(false);
  readonly firmaDataUrl = signal<string | null>(null);

  nombreRecibe = '';
  ubicacionEntrega = '';
  notasChofer = '';
  incidencia = '';

  private stream: MediaStream | null = null;
  private taskId = '';
  private firmaCtx: CanvasRenderingContext2D | null = null;
  private firmaDrawing = false;

  readonly uploadedCount = computed(() => this.photos().filter(p => p.uploaded).length);
  readonly totalPhotoCount = computed(
    () => this.photos().length + (this.tarea()?.fotosUrls?.length ?? 0)
  );
  readonly canSend = computed(
    () => this.totalPhotoCount() >= MIN_PHOTOS && !!this.nombreRecibe.trim() && this.state() !== 'sending'
  );
  readonly sendProgressPct = computed(() => {
    const total = this.photos().length;
    return total === 0 ? 0 : Math.round((this.uploadedCount() / total) * 100);
  });
  readonly hasFirma = computed(() => !!this.firmaDataUrl());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.taskId = id;
    this.loadDraft(id);
    this.load(id);
  }

  ngAfterViewInit(): void {
    this.initFirmaCanvas();
  }

  ngOnDestroy(): void {
    this.closeCamera();
    this.sub?.unsubscribe();
  }

  load(id: string): void {
    this.entregaService.getById(id).subscribe({
      next: t => {
        this.tarea.set(t);
        this.nombreRecibe ||= t.nombreRecibe || '';
        this.ubicacionEntrega ||= t.ubicacionEntrega || '';
        this.notasChofer ||= t.notasChofer || '';
        this.incidencia ||= t.incidencia || '';
        if (this.incidencia) this.showIncidencia.set(true);
        this.loadLocalPhotos(id);
        this.persistDraft();
        this.state.set('ready');

        if (t.estado === 'PENDIENTE') {
          this.entregaService.tomar(t.id).subscribe({
            next: updated => this.tarea.set(updated),
            error: err => this.notifications.fromHttpError(err, 'No se pudo tomar la tarea'),
          });
        }
      },
      error: err => {
        this.state.set('error');
        this.notifications.fromHttpError(err, 'No se pudo abrir la entrega');
      },
    });
  }

  openCamera(): void {
    if (this.state() === 'sending') return;
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
    navigator.vibrate?.([18, 28, 18]);
  }

  removePhoto(id: string): void {
    if (this.state() === 'sending') return;
    this.photos.update(items => items.filter(p => p.id !== id));
    this.persistLocalPhotos();
    navigator.vibrate?.([8]);
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

        const file = this.dataUrlToFile(photo.dataUrl, `entrega-${current.numeroConsecutivo}-${photo.id}.jpg`);
        const response = await firstValueFrom(this.entregaService.uploadFoto(current.id, file));
        current = response.tarea;

        this.photos.update(items =>
          items.map(p => (p.id === photo.id ? { ...p, uploading: false, uploaded: true } : p))
        );
      }

      await firstValueFrom(
        this.entregaService.registrar(current.id, {
          fotosUrls: current.fotosUrls,
          ubicacionEntrega: this.ubicacionEntrega || null,
          nombreRecibe: this.nombreRecibe.trim() || null,
          firmaBase64: this.firmaDataUrl() || null,
          notasChofer: this.notasChofer || null,
          incidencia: this.incidencia || null,
        })
      );

      this.clearLocalState();
      navigator.vibrate?.([60, 40, 120]);
      this.notifications.success('¡Entrega registrada!');
      this.goBack();
    } catch (err) {
      this.photos.update(items =>
        items.map(p => (p.uploading ? { ...p, uploading: false, err: true } : p))
      );
      this.state.set('ready');
      this.notifications.fromHttpError(err, 'No se pudo registrar la entrega');
    }
  }

  persistDraft(): void {
    if (!this.taskId) return;
    localStorage.setItem(
      this.draftKey(this.taskId),
      JSON.stringify({
        nombreRecibe: this.nombreRecibe,
        ubicacionEntrega: this.ubicacionEntrega,
        notasChofer: this.notasChofer,
        incidencia: this.incidencia,
      } satisfies EntregaDraft)
    );
  }

  goBack(): void {
    this.closeCamera();
    void this.router.navigate(['/entrega']);
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  estadoLabel(value: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      EN_CAMINO: 'En camino',
      ENTREGADO: 'Entregado',
      INCIDENCIA: 'Incidencia',
    };
    return map[value] ?? value;
  }

  // ── Firma pad ──────────────────────────────────────────────────

  firmaStart(event: TouchEvent): void {
    event.preventDefault();
    this.firmaDrawing = true;
    const touch = event.touches[0];
    const pos = this.getTouchPos(touch);
    this.firmaCtx?.beginPath();
    this.firmaCtx?.moveTo(pos.x, pos.y);
  }

  firmaMove(event: TouchEvent): void {
    if (!this.firmaDrawing) return;
    event.preventDefault();
    const touch = event.touches[0];
    const pos = this.getTouchPos(touch);
    if (this.firmaCtx) {
      this.firmaCtx.lineTo(pos.x, pos.y);
      this.firmaCtx.stroke();
    }
    this.updateFirmaSignal();
  }

  firmaMouseStart(event: MouseEvent): void {
    this.firmaDrawing = true;
    const pos = this.getMousePos(event);
    this.firmaCtx?.beginPath();
    this.firmaCtx?.moveTo(pos.x, pos.y);
  }

  firmaMouseMove(event: MouseEvent): void {
    if (!this.firmaDrawing) return;
    const pos = this.getMousePos(event);
    if (this.firmaCtx) {
      this.firmaCtx.lineTo(pos.x, pos.y);
      this.firmaCtx.stroke();
    }
    this.updateFirmaSignal();
  }

  firmaEnd(): void {
    this.firmaDrawing = false;
  }

  clearFirma(): void {
    if (!this.firmaCanvasRef) return;
    const canvas = this.firmaCanvasRef.nativeElement;
    this.firmaCtx?.clearRect(0, 0, canvas.width, canvas.height);
    this.firmaDataUrl.set(null);
  }

  private initFirmaCanvas(): void {
    if (!this.firmaCanvasRef) return;
    const canvas = this.firmaCanvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width = rect.width * dpr;
    canvas.height = 120 * dpr;
    this.firmaCtx = canvas.getContext('2d');
    if (this.firmaCtx) {
      this.firmaCtx.scale(dpr, dpr);
      this.firmaCtx.strokeStyle = '#0d1017';
      this.firmaCtx.lineWidth = 2.5;
      this.firmaCtx.lineCap = 'round';
      this.firmaCtx.lineJoin = 'round';
    }
  }

  private getTouchPos(touch: Touch): { x: number; y: number } {
    const canvas = this.firmaCanvasRef!.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } {
    const canvas = this.firmaCanvasRef!.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private updateFirmaSignal(): void {
    if (!this.firmaCanvasRef) return;
    this.firmaDataUrl.set(this.firmaCanvasRef.nativeElement.toDataURL('image/png'));
  }

  // ── Camera ────────────────────────────────────────────────────

  private async startCamera(): Promise<void> {
    this.stopCamera();
    this.cameraError.set('');
    this.cameraReady.set(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no soporta la cámara.');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.facingMode() }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play().catch(() => undefined);
      }
      this.cameraReady.set(true);
    } catch {
      this.cameraError.set('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraReady.set(false);
  }

  // ── Persistence ───────────────────────────────────────────────

  private loadDraft(id: string): void {
    const raw = localStorage.getItem(this.draftKey(id));
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as EntregaDraft;
      this.nombreRecibe = d.nombreRecibe || '';
      this.ubicacionEntrega = d.ubicacionEntrega || '';
      this.notasChofer = d.notasChofer || '';
      this.incidencia = d.incidencia || '';
      if (this.incidencia) this.showIncidencia.set(true);
    } catch {
      localStorage.removeItem(this.draftKey(id));
    }
  }

  private loadLocalPhotos(id: string): void {
    const raw = localStorage.getItem(this.photosKey(id));
    if (!raw) { this.photos.set([]); return; }
    try {
      const saved = JSON.parse(raw) as Array<{ id: string; dataUrl: string }>;
      this.photos.set(
        saved
          .filter(p => p.id && p.dataUrl?.startsWith('data:image/'))
          .map(p => ({ id: p.id, dataUrl: p.dataUrl, uploading: false, uploaded: false, err: false }))
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

  private readonly photosKey = (id: string) => `rr_entrega_fotos_${id}`;
  private readonly draftKey = (id: string) => `rr_entrega_draft_${id}`;

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
}
