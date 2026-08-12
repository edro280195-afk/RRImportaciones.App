import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, Output, signal, ViewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CampoService } from '../services/campo.service';
import { VinScannerService, VinScanSession } from '../services/vin-scanner.service';

/** Resultado de validar un VIN ya detectado (p. ej. contra el backend antes de aceptarlo). */
export interface VinValidationResult {
  ok: boolean;
  title: string;
  subtitle?: string;
}

type ScannerStatus = 'idle' | 'loading' | 'searching' | 'detecting' | 'ai' | 'found';
type ScanPhase = 'scanning' | 'confirm';
type ValidationState = 'idle' | 'validating' | 'success' | 'failure';

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

interface LockableScreenOrientation extends ScreenOrientation {
  lock?: (orientation: string) => Promise<void>;
}

/**
 * Escáner de VIN a pantalla completa: cámara + lectura de código de barras/OCR
 * (vía VinScannerService) con el mismo flujo de pasos y mensajes que
 * `mlkit_vin_scanner_page.dart` en la app Flutter — detección → panel de
 * confirmación ("VIN detectado", Reintentar/Usar VIN) → validación opcional
 * contra el backend (Validando… → Vehículo encontrado / No se pudo validar).
 *
 * Uso: inyectar por ViewChild y llamar `.show()`; escuchar `(vinConfirmed)`.
 */
@Component({
  selector: 'app-vin-scanner-overlay',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="scan-shell" [class.scan-shell--horizontal]="orientation() === 'horizontal'">
        <video #video autoplay playsinline muted class="scan-feed"></video>

        <div class="scan-top">
          <button class="scan-icon-btn" type="button" (click)="cancel()" aria-label="Volver">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <p class="scan-top__title">{{ title }}</p>
          <button
            class="scan-icon-btn"
            type="button"
            [class.scan-icon-btn--active]="torchOn()"
            [disabled]="!torchSupported()"
            (click)="toggleTorch()"
            aria-label="Linterna"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </button>
        </div>

        @if (phase() === 'scanning') {
          <div class="scan-guide">
            <div class="corner corner--tl"></div>
            <div class="corner corner--tr"></div>
            <div class="corner corner--bl"></div>
            <div class="corner corner--br"></div>
            <div class="scan-line"></div>
          </div>

          <div class="scan-bottom">
            <div class="scan-chip-row">
              <button class="scan-chip" type="button" (click)="toggleOrientation()">
                {{ orientation() === 'horizontal' ? 'Vertical' : 'Horizontal' }}
              </button>
              <button class="scan-chip" type="button" (click)="flipCamera()">Girar cámara</button>
            </div>

            <div class="scan-status" [class.scan-status--ai]="scannerStatus() === 'ai'" [class.scan-status--found]="scannerStatus() === 'found'">
              <span class="scan-status__dot"></span>
              {{ statusText() }}
            </div>

            @if (aiError()) {
              <p class="scan-ai-error">{{ aiError() }}</p>
            }

            @if (showAiSuggest() && scannerStatus() !== 'ai') {
              <button class="scan-ai-btn" type="button" [disabled]="aiLoading()" (click)="useAI()">
                @if (aiLoading()) {
                  <span class="scan-mini-spinner"></span>
                  Analizando con IA…
                } @else {
                  ¿No se lee el código? Analizar con IA
                }
              </button>
            }
          </div>
        }

        @if (cameraError()) {
          <div class="scan-error">
            <p class="scan-error__title">No se pudo abrir la cámara</p>
            <p class="scan-error__sub">{{ cameraError() }}</p>
            <button class="scan-error__retry" type="button" (click)="retryCamera()">Reintentar</button>
          </div>
        }

        @if (phase() === 'confirm') {
          <div class="confirm-panel">
            <div class="confirm-panel__head">
              <div
                class="confirm-ring"
                [class.confirm-ring--spin]="validationState() === 'validating'"
                [class.confirm-ring--ok]="validationState() === 'success'"
                [class.confirm-ring--err]="validationState() === 'failure'"
              >
                @if (validationState() === 'failure') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                } @else if (validationState() === 'validating') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 17a7 7 0 0 1 9-9M9 4l3-2 1 3" />
                  </svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                }
              </div>
              <div class="confirm-panel__text">
                <p class="confirm-panel__title">{{ confirmTitle() }}</p>
                @if (confirmSubtitle(); as sub) {
                  <p class="confirm-panel__subtitle">{{ sub }}</p>
                }
              </div>
            </div>

            <p class="confirm-vin">{{ detectedVin() }}</p>

            @if (validationState() === 'validating') {
              <p class="confirm-wait">Espera un momento…</p>
            } @else {
              <div class="confirm-actions">
                <button class="confirm-btn confirm-btn--ghost" type="button" (click)="onOutlineAction()">
                  {{ validationState() === 'failure' ? 'Validar otra vez' : 'Reintentar' }}
                </button>
                <button class="confirm-btn confirm-btn--primary" type="button" (click)="onPrimaryAction()">
                  {{ validationState() === 'failure' ? 'Escanear de nuevo' : 'Usar VIN' }}
                </button>
              </div>
            }
          </div>
        }
      </div>
      <canvas #canvas class="scan-canvas-hidden"></canvas>
    }
  `,
  styles: [
    `
      :host {
        --scan-red: #c61d26;
        --scan-red-dark: #a3151c;
        --scan-red-soft: #fdecec;
        --scan-ink: #0d1017;
        --scan-ink2: #475467;
        --scan-ink3: #98a2b3;
        --scan-border: #e4e7ec;
        --scan-success: #087443;
        --scan-success-soft: #e8f8ee;
        --scan-danger: #b42318;
      }

      .scan-shell {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: #000;
      }
      .scan-feed {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .scan-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: max(16px, env(safe-area-inset-top, 16px)) 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent);
        z-index: 2;
      }
      .scan-top__title {
        flex: 1;
        margin: 0;
        text-align: center;
        color: #fff;
        font-size: 15px;
        font-weight: 800;
      }
      .scan-icon-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: rgba(13, 16, 23, 0.72);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.16);
        cursor: pointer;
        flex-shrink: 0;
        transition:
          background 140ms,
          transform 100ms;
      }
      .scan-icon-btn:active {
        transform: scale(0.94);
      }
      .scan-icon-btn--active {
        background: var(--scan-red);
      }
      .scan-icon-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .scan-guide {
        position: absolute;
        top: 44%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(88vw, 420px);
        height: 130px;
        pointer-events: none;
      }
      .scan-shell--horizontal .scan-guide {
        width: min(90vw, 760px);
        height: min(24vh, 150px);
      }
      .corner {
        position: absolute;
        width: 26px;
        height: 26px;
        border-color: rgba(255, 255, 255, 0.85);
        border-style: solid;
      }
      .corner--tl {
        top: 0;
        left: 0;
        border-width: 3px 0 0 3px;
        border-top-left-radius: 6px;
      }
      .corner--tr {
        top: 0;
        right: 0;
        border-width: 3px 3px 0 0;
        border-top-right-radius: 6px;
      }
      .corner--bl {
        bottom: 0;
        left: 0;
        border-width: 0 0 3px 3px;
        border-bottom-left-radius: 6px;
      }
      .corner--br {
        bottom: 0;
        right: 0;
        border-width: 0 3px 3px 0;
        border-bottom-right-radius: 6px;
      }
      .scan-line {
        position: absolute;
        left: 4px;
        right: 4px;
        height: 2px;
        background: var(--scan-red);
        box-shadow: 0 0 10px rgba(198, 29, 38, 0.85);
        top: 50%;
        animation: scan-sweep 2s infinite ease-in-out alternate;
      }
      @keyframes scan-sweep {
        0% {
          transform: translateY(-46px);
        }
        100% {
          transform: translateY(46px);
        }
      }

      .scan-bottom {
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: max(20px, env(safe-area-inset-bottom, 20px));
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 2;
      }
      .scan-chip-row {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      .scan-chip {
        background: rgba(13, 16, 23, 0.68);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 7px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        backdrop-filter: blur(4px);
        cursor: pointer;
      }
      .scan-status {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 11px 14px;
        border-radius: 12px;
        background: rgba(13, 16, 23, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #f8fafc;
        font-size: 13px;
        font-weight: 800;
        backdrop-filter: blur(8px);
      }
      .scan-status__dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #38bdf8;
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2);
        flex-shrink: 0;
      }
      .scan-status--ai .scan-status__dot {
        background: #a78bfa;
        box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.22);
      }
      .scan-status--found {
        background: rgba(8, 116, 67, 0.86);
      }
      .scan-status--found .scan-status__dot {
        background: #34d399;
        box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.22);
      }

      .scan-ai-error {
        margin: 0;
        text-align: center;
        color: #fecaca;
        font-size: 12px;
        font-weight: 700;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
      }
      .scan-ai-btn {
        align-self: center;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #fff;
        border: none;
        padding: 12px 20px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
      }
      .scan-ai-btn:disabled {
        opacity: 0.75;
        cursor: wait;
      }
      .scan-mini-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-top-color: #fff;
        border-radius: 50%;
        display: inline-block;
        animation: scan-spin 0.7s linear infinite;
      }
      @keyframes scan-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .scan-error {
        position: absolute;
        top: 50%;
        left: 20px;
        right: 20px;
        transform: translateY(-50%);
        background: rgba(13, 16, 23, 0.9);
        color: #fff;
        padding: 22px;
        border-radius: 16px;
        text-align: center;
        backdrop-filter: blur(8px);
        z-index: 3;
      }
      .scan-error__title {
        font-size: 16px;
        font-weight: 800;
        margin: 0 0 8px;
      }
      .scan-error__sub {
        font-size: 13px;
        margin: 0;
        opacity: 0.82;
        line-height: 1.4;
      }
      .scan-error__retry {
        margin-top: 14px;
        background: var(--scan-red);
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 800;
        cursor: pointer;
      }

      .scan-canvas-hidden {
        display: none;
      }

      /* ── Confirmation panel (paridad con mlkit_vin_scanner_page.dart) ── */
      .confirm-panel {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 3;
        background: var(--scan-ink);
        border-radius: 18px 18px 0 0;
        padding: 18px 18px max(16px, env(safe-area-inset-bottom, 16px));
        animation: confirm-rise 200ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes confirm-rise {
        from {
          transform: translateY(16px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .confirm-panel__head {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .confirm-ring {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border: 2px solid rgba(52, 211, 153, 0.9);
        color: #34d399;
      }
      .confirm-ring--spin {
        border-color: rgba(56, 189, 248, 0.9);
        color: #38bdf8;
        animation: scan-spin 0.9s linear infinite;
      }
      .confirm-ring--ok {
        border-color: #34d399;
        color: #34d399;
      }
      .confirm-ring--err {
        border-color: var(--scan-red);
        color: #fca5a5;
      }
      .confirm-panel__text {
        flex: 1;
        min-width: 0;
      }
      .confirm-panel__title {
        margin: 0;
        color: #fff;
        font-size: 15px;
        font-weight: 900;
      }
      .confirm-panel__subtitle {
        margin: 3px 0 0;
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        line-height: 1.4;
      }
      .confirm-vin {
        margin: 14px 0 0;
        font-family: 'JetBrains Mono', monospace;
        color: #fff;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 2px;
        word-break: break-all;
      }
      .confirm-wait {
        margin: 18px 0 4px;
        text-align: center;
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        font-weight: 700;
      }
      .confirm-actions {
        display: flex;
        gap: 10px;
        margin-top: 18px;
      }
      .confirm-btn {
        flex: 1;
        height: 50px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
        transition: transform 100ms;
      }
      .confirm-btn:active {
        transform: scale(0.98);
      }
      .confirm-btn--ghost {
        background: transparent;
        color: #fff;
        border: 1.5px solid rgba(255, 255, 255, 0.24);
      }
      .confirm-btn--primary {
        background: var(--scan-red);
        color: #fff;
        border: none;
      }
    `,
  ],
})
export class VinScannerOverlayComponent implements OnDestroy {
  @Input() title = 'Escanear VIN';
  /** Validación opcional contra el backend antes de aceptar el VIN (igual a onValidateVin en Flutter). */
  @Input() validate?: (vin: string) => Promise<VinValidationResult>;

  @Output() vinConfirmed = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private vinScanner = inject(VinScannerService);
  private campoService = inject(CampoService);

  visible = signal(false);
  phase = signal<ScanPhase>('scanning');
  cameraError = signal('');
  aiError = signal('');
  showAiSuggest = signal(false);
  aiLoading = signal(false);
  facingMode = signal<'environment' | 'user'>('environment');
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  scannerStatus = signal<ScannerStatus>('idle');
  torchSupported = signal(false);
  torchOn = signal(false);

  detectedVin = signal<string | null>(null);
  confirmedSource = signal<string | null>(null);
  validationState = signal<ValidationState>('idle');
  validationTitle = signal<string | null>(null);
  validationSubtitle = signal<string | null>(null);

  private stream: MediaStream | null = null;
  private scanSession: VinScanSession | null = null;
  private aiSuggestTimeout: ReturnType<typeof setTimeout> | null = null;
  private visionInFlight = false;
  private audioContext: AudioContext | null = null;
  private enteredFullscreen = false;

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /** Abre el escáner a pantalla completa e inicia la cámara. */
  show(): void {
    this.visible.set(true);
    this.phase.set('scanning');
    this.detectedVin.set(null);
    this.confirmedSource.set(null);
    this.cameraError.set('');
    this.aiError.set('');
    this.showAiSuggest.set(false);
    this.aiLoading.set(false);
    this.scannerStatus.set('loading');
    this.validationState.set('idle');
    this.validationTitle.set(null);
    this.validationSubtitle.set(null);
    this.primeAudio();
    void this.lockLandscapeIfPossible();
    setTimeout(() => this.startCamera(), 50);
  }

  hide(): void {
    this.stopCamera();
    this.visible.set(false);
  }

  cancel(): void {
    this.hide();
    this.closed.emit();
  }

  statusText(): string {
    switch (this.scannerStatus()) {
      case 'loading':
        return 'Preparando cámara...';
      case 'searching':
        return 'Iniciando escaneo...';
      case 'ai':
        return 'IA analizando imagen...';
      case 'found':
        return 'VIN detectado';
      case 'detecting':
      default:
        return 'Apunta al código de barras o al VIN impreso';
    }
  }

  confirmTitle(): string {
    const custom = this.validationTitle();
    if (custom) return custom;
    if (this.validationState() === 'failure') return 'No se pudo validar';
    return 'VIN detectado';
  }

  confirmSubtitle(): string | null {
    return this.validationSubtitle() ?? this.confirmedSource();
  }

  onOutlineAction(): void {
    if (this.validationState() === 'failure') {
      void this.confirmVin();
    } else {
      this.resumeScan();
    }
  }

  onPrimaryAction(): void {
    if (this.validationState() === 'failure') {
      this.resumeScan();
    } else {
      void this.confirmVin();
    }
  }

  async confirmVin(): Promise<void> {
    const vin = this.detectedVin();
    if (!vin || this.validationState() === 'validating') return;

    if (!this.validate) {
      this.acceptVin(vin);
      return;
    }

    this.validationState.set('validating');
    this.validationTitle.set('Validando VIN');
    this.validationSubtitle.set('Buscando el vehículo antes de continuar.');

    try {
      const result = await this.validate(vin);
      if (!result.ok) {
        this.vibrate([60]);
        this.validationState.set('failure');
        this.validationTitle.set(result.title);
        this.validationSubtitle.set(result.subtitle ?? null);
        return;
      }

      this.vibrate([30]);
      this.validationState.set('success');
      this.validationTitle.set(result.title);
      this.validationSubtitle.set(result.subtitle ?? null);
      await new Promise(resolve => setTimeout(resolve, 650));
      this.acceptVin(vin);
    } catch {
      this.vibrate([60]);
      this.validationState.set('failure');
      this.validationTitle.set('No se pudo validar');
      this.validationSubtitle.set('Revisa la conexión o escanea el VIN nuevamente.');
    }
  }

  resumeScan(): void {
    this.detectedVin.set(null);
    this.confirmedSource.set(null);
    this.validationState.set('idle');
    this.validationTitle.set(null);
    this.validationSubtitle.set(null);
    this.phase.set('scanning');
    this.scannerStatus.set('detecting');
    this.showAiSuggest.set(false);
    void this.startScanSession();
  }

  flipCamera(): void {
    this.facingMode.update(m => (m === 'environment' ? 'user' : 'environment'));
    void this.startCamera();
  }

  async toggleOrientation(): Promise<void> {
    const next = this.orientation() === 'horizontal' ? 'vertical' : 'horizontal';
    this.orientation.set(next);
    if (next === 'horizontal') {
      await this.lockLandscapeIfPossible();
    } else {
      this.releaseOrientationIfNeeded();
    }
  }

  retryCamera(): void {
    void this.startCamera();
  }

  async toggleTorch(): Promise<void> {
    const enabled = !this.torchOn();
    const applied = await this.vinScanner.setTorch(this.stream, enabled);
    if (applied) this.torchOn.set(enabled);
  }

  async useAI(): Promise<void> {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    this.aiLoading.set(true);
    this.aiError.set('');
    this.scannerStatus.set('ai');

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const [header, base64 = ''] = dataUrl.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const res = await firstValueFrom(this.campoService.extractVin(base64, mime));
      const detected = res.vin
        ? (this.vinScanner.extractVin(res.vin) ?? this.vinScanner.normalizeVinInput(res.vin))
        : '';

      if (detected && detected.length === 17) {
        this.visionInFlight = true;
        this.handleDetected(detected);
      } else {
        this.aiError.set('No se pudo detectar el VIN. Intenta acercar la cámara.');
      }
    } catch {
      this.aiError.set('Error al analizar la imagen. Intenta de nuevo.');
    } finally {
      this.aiLoading.set(false);
      if (this.visible() && this.phase() === 'scanning') {
        this.scannerStatus.set('detecting');
      }
    }
  }

  private handleDetected(vin: string): void {
    this.confirmedSource.set(
      this.visionInFlight ? 'Verificado con OCR (IA)' : 'Verificado desde código de barras'
    );
    this.detectedVin.set(vin);
    this.phase.set('confirm');
    this.scannerStatus.set('found');
    this.validationState.set('idle');
    this.validationTitle.set(null);
    this.validationSubtitle.set(null);
    this.showAiSuggest.set(false);
    this.playBeep();
    this.vibrate([40, 40, 40]);
  }

  private acceptVin(vin: string): void {
    this.vinConfirmed.emit(vin);
    this.hide();
  }

  private async startCamera(): Promise<void> {
    this.stopScanSession();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraError.set('');
    this.scannerStatus.set('loading');
    this.torchSupported.set(false);
    this.torchOn.set(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no soporta la cámara.');
      this.scannerStatus.set('idle');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: this.vinScanner.buildVideoConstraints(this.facingMode()),
        audio: false,
      });
      await this.vinScanner.prepareStream(this.stream);
      this.torchSupported.set(this.vinScanner.hasTorch(this.stream));

      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play().catch(() => undefined);
        await this.startScanSession();
      }
    } catch {
      this.cameraError.set('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      this.scannerStatus.set('idle');
    }
  }

  private async startScanSession(): Promise<void> {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    this.stopScanSession();
    this.cameraError.set('');
    this.scannerStatus.set('searching');
    this.visionInFlight = false;

    this.scanSession = await this.vinScanner.startVinScan({
      video,
      onVisionStart: () => {
        this.visionInFlight = true;
        this.scannerStatus.set('ai');
      },
      onVisionEnd: () => {
        this.visionInFlight = false;
        if (this.visible() && this.phase() === 'scanning' && !this.aiLoading()) {
          this.scannerStatus.set('detecting');
        }
      },
      onDetected: vin => this.handleDetected(vin),
    });
    this.scannerStatus.set('detecting');

    this.aiSuggestTimeout = setTimeout(() => this.showAiSuggest.set(true), 5000);
  }

  private stopScanSession(): void {
    if (this.aiSuggestTimeout) {
      clearTimeout(this.aiSuggestTimeout);
      this.aiSuggestTimeout = null;
    }
    this.scanSession?.stop();
    this.scanSession = null;
  }

  private stopCamera(): void {
    this.stopScanSession();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.torchSupported.set(false);
    this.torchOn.set(false);
    this.releaseOrientationIfNeeded();
  }

  private playBeep(): void {
    const AudioContextClass = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const context = this.audioContext ?? new AudioContextClass();
      this.audioContext = context;

      void context.resume().then(() => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.24, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.18);
      });
    } catch {
      // El audio puede quedar bloqueado por permisos del navegador.
    }
  }

  private primeAudio(): void {
    const AudioContextClass = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass || this.audioContext) return;

    try {
      this.audioContext = new AudioContextClass();
      void this.audioContext.resume().catch(() => undefined);
    } catch {
      this.audioContext = null;
    }
  }

  private async lockLandscapeIfPossible(): Promise<void> {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        this.enteredFullscreen = true;
      }
    } catch {
      // Algunos navegadores moviles no permiten fullscreen desde este contexto.
    }

    try {
      const orientation = screen.orientation as LockableScreenOrientation | undefined;
      await orientation?.lock?.('landscape');
    } catch {
      // El bloqueo de orientacion depende del navegador y del modo fullscreen.
    }
  }

  private releaseOrientationIfNeeded(): void {
    try {
      const orientation = screen.orientation as LockableScreenOrientation | undefined;
      orientation?.unlock?.();
    } catch {
      // No todos los navegadores implementan unlock.
    }

    if (this.enteredFullscreen && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    this.enteredFullscreen = false;
  }

  private vibrate(pattern: number[]): void {
    navigator.vibrate?.(pattern);
  }
}
