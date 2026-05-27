import { Component, EventEmitter, inject, Output, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampoService } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { MarcaDto, MarcaService } from '../../services/marca.service';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { VinScannerService, VinScanSession } from '../../services/vin-scanner.service';
import { firstValueFrom } from 'rxjs';

type ScannerStatus = 'idle' | 'loading' | 'searching' | 'detecting' | 'ai' | 'found';
type VinLookupState = 'idle' | 'loading' | 'loaded' | 'empty' | 'error';

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

interface LockableScreenOrientation extends ScreenOrientation {
  lock?: (orientation: string) => Promise<void>;
}

@Component({
  selector: 'app-campo-registro-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">
        <div class="sheet-handle"></div>
        <p class="sheet-title">Registrar Vehículo</p>
        <p class="sheet-sub">Ingresa los datos para registrar un vehículo en yarda.</p>

        <form (ngSubmit)="submit()" class="form-container">
          
          <div class="form-group" style="flex-direction: row; align-items: flex-end; gap: 8px;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
              <label>VIN <span class="required">*</span></label>
              <input type="text" [(ngModel)]="vin" (ngModelChange)="onVinChange($event)" name="vin" required placeholder="17 caracteres" maxlength="17" />
              @if (vinLookupState() !== 'idle') {
                <small class="vin-lookup" [class.vin-lookup--ok]="vinLookupState() === 'loaded'" [class.vin-lookup--warn]="vinLookupState() === 'empty' || vinLookupState() === 'error'">
                  {{ vinLookupText() }}
                </small>
              }
            </div>
            <button type="button" class="btn-scan" (click)="openScanner()" title="Escanear VIN">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM12 4v16M8 12h8"/>
              </svg>
            </button>
          </div>
          
          <div class="form-group">
            <label>Marca</label>
            <select [(ngModel)]="marcaId" name="marcaId">
              <option [ngValue]="null">Selecciona una marca...</option>
              @for (m of marcas(); track m.id) {
                <option [value]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Modelo</label>
            <input type="text" [(ngModel)]="modelo" name="modelo" placeholder="Ej. Corolla" />
          </div>

          <div class="form-group">
            <label>Año</label>
            <input type="number" [(ngModel)]="anno" name="anno" placeholder="Ej. 2018" />
          </div>

          <div class="form-group">
            <label>Ubicación en yarda</label>
            <input type="text" [(ngModel)]="ubicacion" name="ubicacion" placeholder="Ej. Fila 3" />
          </div>

          <div class="form-group">
            <label>Cliente</label>
            <div class="client-picker">
              <div class="client-search-row">
                <input
                  type="text"
                  [ngModel]="clienteSearch()"
                  (ngModelChange)="onClienteSearchChange($event)"
                  (focus)="openClientePicker()"
                  name="clienteSearch"
                  placeholder="Buscar por apodo, nombre o telefono"
                  autocomplete="off"
                />
                @if (clienteId()) {
                  <button type="button" class="client-clear" (click)="clearCliente()" aria-label="Quitar cliente">
                    x
                  </button>
                }
              </div>

              @if (selectedCliente(); as cliente) {
                <button type="button" class="client-selected" (click)="openClientePicker()">
                  <span class="client-avatar">{{ clienteInitials(cliente) }}</span>
                  <span class="client-selected__body">
                    <strong>{{ clienteLabel(cliente) }}</strong>
                    <small>{{ clienteMeta(cliente) }}</small>
                  </span>
                </button>
              }

              @if (clientePickerOpen()) {
                <div class="client-results">
                  @if (clientesLoading()) {
                    <div class="client-loading">
                      <span class="mini-spinner"></span>
                      Buscando clientes...
                    </div>
                  } @else if (clientes().length > 0) {
                    @for (cliente of clientes(); track cliente.id) {
                      <button
                        type="button"
                        class="client-option"
                        [class.client-option--active]="cliente.id === clienteId()"
                        (click)="selectCliente(cliente)"
                      >
                        <span class="client-avatar">{{ clienteInitials(cliente) }}</span>
                        <span class="client-option__body">
                          <strong>{{ clienteLabel(cliente) }}</strong>
                          <small>{{ clienteMeta(cliente) }}</small>
                        </span>
                        @if (cliente.id === clienteId()) {
                          <span class="client-check">OK</span>
                        }
                      </button>
                    }
                  } @else {
                    <div class="client-empty">No encontramos clientes con esa busqueda.</div>
                  }
                </div>
              }
            </div>
            @if (!clienteId()) {
              <small class="warning-text">Se recomienda asignar un cliente del catalogo antes de registrar.</small>
            }
          </div>
          
          <div class="form-group">
            <label>Descripción / Notas</label>
            <textarea [(ngModel)]="descripcionVehiculo" name="descripcionVehiculo" rows="2" placeholder="Detalles adicionales"></textarea>
          </div>

          <div class="sheet-actions">
            <button type="button" class="sheet-cancel" (click)="close.emit()" [disabled]="saving()">Cancelar</button>
            <button type="submit" class="sheet-confirm" [disabled]="saving() || vin().length !== 17">
              {{ saving() ? 'Guardando...' : 'Registrar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CAMERA OVERLAY -->
    @if (cameraOpen()) {
      <div #cameraShell class="camera-shell" [class.camera-shell--horizontal]="scanOrientation() === 'horizontal'">
        <video #video autoplay playsinline muted class="camera-feed"></video>
        
        <div class="cam-top">
          <button class="cam-pill-btn" (click)="closeCamera()" type="button">Cerrar</button>
          <button class="cam-pill-btn" (click)="toggleScanOrientation()" type="button">
            {{ scanOrientation() === 'horizontal' ? 'Vertical' : 'Horizontal' }}
          </button>
          @if (torchSupported()) {
            <button class="cam-pill-btn" (click)="toggleTorch()" type="button">
              {{ torchOn() ? 'Linterna on' : 'Linterna' }}
            </button>
          }
          <button class="cam-pill-btn" (click)="flipCamera()" type="button">Girar</button>
        </div>

        <div class="cam-status" [class.cam-status--alert]="scannerStatus() === 'found'" [class.cam-status--ai]="scannerStatus() === 'ai'">
          <span class="status-dot"></span>
          {{ scannerStatusText() }}
        </div>

        @if (cameraError()) {
          <div class="cam-error">
            <p class="cam-error__title">Error</p>
            <p class="cam-error__sub">{{ cameraError() }}</p>
            <button class="btn-primary" (click)="retryCamera()" type="button" style="margin-top:10px;">Reintentar</button>
          </div>
        }

        <div class="cam-guide">
          <div class="corner corner--tl"></div>
          <div class="corner corner--tr"></div>
          <div class="corner corner--bl"></div>
          <div class="corner corner--br"></div>
          <div class="scan-line"></div>
        </div>
        <p class="cam-orientation-hint">
          {{ scanOrientation() === 'horizontal' ? 'Gira el telefono y alinea todo el codigo de barras dentro de la guia.' : 'Modo vertical activo.' }}
        </p>

        @if (showAiSuggest()) {
          <div class="cam-ai-suggest">
            <p>¿Problemas leyendo el código de barras?</p>
            <button class="btn-ai" (click)="useAI()" [disabled]="aiLoading()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
                <path d="M12 3l1.6 4.7L18 9.3l-4.4 1.6L12 15.5l-1.6-4.6L6 9.3l4.4-1.6L12 3Z"/>
                <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/>
                <path d="M5 14l.6 1.6L7 16.2l-1.4.6L5 18.5l-.6-1.7L3 16.2l1.4-.6L5 14Z"/>
              </svg>
              {{ aiLoading() ? 'Analizando con IA...' : 'Analizar con IA' }}
            </button>
          </div>
        }
      </div>
    }
    <canvas #canvas class="canvas-hidden"></canvas>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: flex-end;
        z-index: 100;
        animation: fadeUp 0.18s ease;
      }
      .sheet {
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        background: var(--surface);
        border-radius: 24px 24px 0 0;
        border-top: 1.5px solid var(--border);
        padding: 20px 20px max(20px, env(safe-area-inset-bottom, 20px));
      }
      .sheet-handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--border);
        margin: 0 auto 20px;
      }
      .sheet-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-1);
        margin: 0 0 6px;
      }
      .sheet-sub {
        font-size: 14px;
        color: var(--text-2);
        margin: 0 0 24px;
      }
      .form-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-group label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-2);
      }
      .required {
        color: var(--red);
      }
      .warning-text {
        color: var(--amber);
        font-size: 11px;
        margin-top: 4px;
      }
      .vin-lookup {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-2);
        font-size: 11px;
        font-weight: 600;
      }
      .vin-lookup::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #64748b;
      }
      .vin-lookup--ok {
        color: #047857;
      }
      .vin-lookup--ok::before {
        background: #10b981;
      }
      .vin-lookup--warn {
        color: #b45309;
      }
      .vin-lookup--warn::before {
        background: #f59e0b;
      }
      input, select, textarea {
        padding: 12px 14px;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: #f9fafb;
        color: var(--text-1);
        font-family: inherit;
        font-size: 14px;
        transition: border-color 0.2s;
      }
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: var(--text-1);
        background: #fff;
      }
      .client-picker {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .client-search-row {
        position: relative;
      }
      .client-search-row input {
        width: 100%;
        padding-right: 44px;
      }
      .client-clear {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: #eef2f7;
        color: var(--text-2);
        font-weight: 800;
        cursor: pointer;
      }
      .client-selected,
      .client-option {
        width: 100%;
        border: 1.5px solid var(--border);
        background: #f8fafc;
        color: var(--text-1);
        border-radius: 12px;
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
        cursor: pointer;
      }
      .client-selected {
        border-color: rgba(185, 28, 28, 0.25);
        background: rgba(254, 242, 242, 0.8);
      }
      .client-avatar {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: #111827;
        color: #f8fafc;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .client-selected__body,
      .client-option__body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .client-selected__body strong,
      .client-option__body strong {
        font-size: 13px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .client-selected__body small,
      .client-option__body small {
        color: var(--text-2);
        font-size: 11px;
        line-height: 1.25;
      }
      .client-results {
        max-height: 246px;
        overflow-y: auto;
        border: 1.5px solid var(--border);
        border-radius: 14px;
        background: var(--surface);
        padding: 6px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .client-option {
        border-color: transparent;
        background: transparent;
      }
      .client-option:hover,
      .client-option--active {
        background: #f1f5f9;
      }
      .client-check {
        margin-left: auto;
        color: #047857;
        font-size: 11px;
        font-weight: 800;
      }
      .client-loading,
      .client-empty {
        color: var(--text-2);
        font-size: 12px;
        padding: 14px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mini-spinner {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid #cbd5e1;
        border-top-color: var(--red);
        animation: spin 0.8s linear infinite;
      }
      .sheet-actions {
        display: flex;
        gap: 10px;
        position: sticky;
        bottom: -20px;
        background: var(--surface);
        padding: 10px 0 20px;
        margin-bottom: -20px;
      }
      .sheet-cancel {
        flex: 1;
        padding: 15px;
        border-radius: 14px;
        background: #f3f4f6;
        border: 1.5px solid var(--border);
        color: var(--text-2);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
      }
      .sheet-confirm {
        flex: 1;
        padding: 15px;
        border-radius: 14px;
        background: var(--red);
        border: none;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }
      .sheet-confirm:disabled {
        opacity: 0.6;
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* SCANNER UI */
      .btn-scan {
        height: 44px;
        width: 44px;
        border-radius: 12px;
        background: var(--red);
        color: white;
        border: none;
        font-size: 20px;
        cursor: pointer;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        transition: transform 0.1s;
      }
      .btn-scan:active {
        transform: scale(0.95);
      }
      .camera-shell {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: #000;
      }
      .camera-feed {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .cam-top {
        position: absolute;
        top: 0; left: 0; right: 0;
        padding: max(20px, env(safe-area-inset-top, 20px)) 20px 20px;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
      }
      .cam-pill-btn {
        background: rgba(0,0,0,0.5);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: bold;
        backdrop-filter: blur(4px);
        cursor: pointer;
      }
      .cam-status {
        position: absolute;
        top: calc(max(20px, env(safe-area-inset-top, 20px)) + 58px);
        left: 50%;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.72);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.22);
        font-size: 13px;
        font-weight: 800;
        backdrop-filter: blur(8px);
        white-space: nowrap;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #38bdf8;
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18);
      }
      .cam-status--ai .status-dot {
        background: #a78bfa;
        box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.2);
      }
      .cam-status--alert {
        background: rgba(6, 95, 70, 0.86);
      }
      .cam-status--alert .status-dot {
        background: #34d399;
        box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
      }
      .cam-guide {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 80vw;
        max-width: 400px;
        height: 120px;
        pointer-events: none;
      }
      .camera-shell--horizontal .cam-guide {
        width: min(88vw, 760px);
        max-width: none;
        height: min(24vh, 150px);
      }
      .corner {
        position: absolute; width: 24px; height: 24px;
        border-color: rgba(255,255,255,0.8); border-style: solid;
      }
      .corner--tl { top: 0; left: 0; border-width: 3px 0 0 3px; }
      .corner--tr { top: 0; right: 0; border-width: 3px 3px 0 0; }
      .corner--bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; }
      .corner--br { bottom: 0; right: 0; border-width: 0 3px 3px 0; }
      .scan-line {
        position: absolute; left: 0; right: 0; height: 2px;
        background: rgba(255,0,0,0.7);
        box-shadow: 0 0 8px red;
        top: 50%;
        animation: scan 2s infinite linear alternate;
      }
      @keyframes scan {
        0% { transform: translateY(-40px); }
        100% { transform: translateY(40px); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .cam-orientation-hint {
        position: absolute;
        left: 20px;
        right: 20px;
        bottom: max(150px, calc(env(safe-area-inset-bottom, 0px) + 150px));
        margin: 0;
        color: rgba(248, 250, 252, 0.92);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
        pointer-events: none;
      }
      .cam-error {
        position: absolute; top: 50%; left: 20px; right: 20px; transform: translateY(-50%);
        background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 12px;
        text-align: center;
        backdrop-filter: blur(8px);
      }
      .cam-error__title {
        font-size: 18px; font-weight: bold; margin: 0 0 8px;
      }
      .cam-error__sub {
        font-size: 14px; margin: 0; opacity: 0.8;
      }
      .canvas-hidden { display: none; }
      .cam-ai-suggest {
        position: absolute; bottom: max(40px, env(safe-area-inset-bottom, 40px)); left: 20px; right: 20px;
        text-align: center;
        animation: fadeUp 0.3s ease;
      }
      .cam-ai-suggest p {
        color: white; font-size: 14px; margin-bottom: 12px; font-weight: bold;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      }
      .btn-ai {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white; border: none; padding: 14px 24px;
        border-radius: 24px; font-weight: bold; font-size: 15px; cursor: pointer;
        box-shadow: 0 4px 12px rgba(59,130,246,0.5);
        display: inline-flex; align-items: center; justify-content: center;
        transition: transform 0.1s;
      }
      .btn-ai:active:not(:disabled) {
        transform: scale(0.96);
      }
      .btn-ai:disabled { opacity: 0.7; cursor: wait; filter: grayscale(50%); }
    `
  ]
})
export class CampoRegistroModalComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() registered = new EventEmitter<void>();

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cameraShell') cameraShellRef?: ElementRef<HTMLDivElement>;

  private campoService = inject(CampoService);
  private marcaService = inject(MarcaService);
  private clienteService = inject(ClienteService);
  private cotizacionService = inject(CotizacionService);
  private notifications = inject(NotificationService);
  private vinScanner = inject(VinScannerService);

  saving = signal(false);
  marcas = signal<MarcaDto[]>([]);
  clientes = signal<ClienteListDto[]>([]);
  clientesLoading = signal(false);

  vin = signal('');
  marcaId = signal<string | null>(null);
  modelo = signal('');
  anno = signal<number | null>(null);
  ubicacion = signal('');
  clienteId = signal<string | null>(null);
  clienteSearch = signal('');
  selectedCliente = signal<ClienteListDto | null>(null);
  clientePickerOpen = signal(false);
  descripcionVehiculo = signal('');
  vinLookupState = signal<VinLookupState>('idle');

  // Scanner state
  cameraOpen = signal(false);
  cameraError = signal('');
  showAiSuggest = signal(false);
  aiLoading = signal(false);
  facingMode = signal<'environment' | 'user'>('environment');
  scanOrientation = signal<'horizontal' | 'vertical'>('horizontal');
  scannerStatus = signal<ScannerStatus>('idle');
  torchSupported = signal(false);
  torchOn = signal(false);

  private stream: MediaStream | null = null;
  private scanSession: VinScanSession | null = null;
  private aiSuggestTimeout: ReturnType<typeof setTimeout> | null = null;
  private clienteSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private clienteSearchVersion = 0;
  private vinDecodeVersion = 0;
  private audioContext: AudioContext | null = null;
  private enteredScannerFullscreen = false;

  constructor() {
    this.marcaService.getAll(true).subscribe(m => this.marcas.set(m));
    this.loadClientes();
  }

  ngOnDestroy(): void {
    this.closeCamera();
    if (this.clienteSearchTimeout) {
      clearTimeout(this.clienteSearchTimeout);
    }
  }

  onVinChange(val: string): void {
    this.vin.set(this.vinScanner.normalizeVinInput(val));
    if (this.vin().length === 17) {
      this.decodeVin(this.vin());
    } else {
      this.vinLookupState.set('idle');
    }
  }

  onClienteSearchChange(value: string): void {
    this.clienteSearch.set(value);
    this.clientePickerOpen.set(true);

    const selected = this.selectedCliente();
    if (selected && value.trim() !== this.clienteLabel(selected)) {
      this.clienteId.set(null);
      this.selectedCliente.set(null);
    }

    if (this.clienteSearchTimeout) {
      clearTimeout(this.clienteSearchTimeout);
    }

    this.clienteSearchTimeout = setTimeout(() => {
      this.loadClientes(value);
    }, 220);
  }

  openClientePicker(): void {
    this.clientePickerOpen.set(true);
    if (this.clientes().length === 0) {
      this.loadClientes(this.clienteSearch());
    }
  }

  selectCliente(cliente: ClienteListDto): void {
    this.clienteId.set(cliente.id);
    this.selectedCliente.set(cliente);
    this.clienteSearch.set(this.clienteLabel(cliente));
    this.clientePickerOpen.set(false);
  }

  clearCliente(): void {
    this.clienteId.set(null);
    this.selectedCliente.set(null);
    this.clienteSearch.set('');
    this.clientePickerOpen.set(true);
    this.loadClientes();
  }

  clienteLabel(cliente: ClienteListDto): string {
    return cliente.apodo || cliente.nombreCompleto || 'Cliente sin nombre';
  }

  clienteMeta(cliente: ClienteListDto): string {
    const parts = [
      cliente.nombreCompleto && cliente.nombreCompleto !== cliente.apodo ? cliente.nombreCompleto : null,
      cliente.telefono,
      cliente.procedencia,
      `${cliente.totalVehiculos} vehiculos`,
      `${cliente.totalTramites} tramites`,
    ].filter((part): part is string => Boolean(part));

    return parts.join(' / ');
  }

  clienteInitials(cliente: ClienteListDto): string {
    const source = this.clienteLabel(cliente)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('');

    return source.toUpperCase() || 'CL';
  }

  private loadClientes(search = ''): void {
    const version = ++this.clienteSearchVersion;
    const trimmed = search.trim();
    this.clientesLoading.set(true);

    this.clienteService.getList({
      search: trimmed || undefined,
      pageSize: 8,
    }).subscribe({
      next: res => {
        if (version !== this.clienteSearchVersion) return;
        this.clientes.set(res.items);
        this.clientesLoading.set(false);
      },
      error: () => {
        if (version !== this.clienteSearchVersion) return;
        this.clientes.set([]);
        this.clientesLoading.set(false);
      },
    });
  }

  openScanner(): void {
    this.cameraOpen.set(true);
    this.cameraError.set('');
    this.showAiSuggest.set(false);
    this.aiLoading.set(false);
    this.scanOrientation.set('horizontal');
    this.scannerStatus.set('loading');
    this.primeAudio();
    void this.lockLandscapeIfPossible();
    setTimeout(() => this.startCamera(), 50);
  }

  closeCamera(): void {
    this.stopCamera();
    this.cameraOpen.set(false);
  }

  flipCamera(): void {
    this.facingMode.update(m => (m === 'environment' ? 'user' : 'environment'));
    this.startCamera();
  }

  async toggleScanOrientation(): Promise<void> {
    const next = this.scanOrientation() === 'horizontal' ? 'vertical' : 'horizontal';
    this.scanOrientation.set(next);

    if (next === 'horizontal') {
      await this.lockLandscapeIfPossible();
    } else {
      this.releaseOrientationIfNeeded();
    }
  }

  retryCamera(): void {
    this.startCamera();
  }

  async toggleTorch(): Promise<void> {
    const enabled = !this.torchOn();
    const applied = await this.vinScanner.setTorch(this.stream, enabled);
    if (applied) {
      this.torchOn.set(enabled);
    }
  }

  private async startCamera(): Promise<void> {
    this.stopCamera();
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
        this.scannerStatus.set('searching');

        this.scanSession = await this.vinScanner.startVinScan({
          video,
          onVisionStart: () => this.scannerStatus.set('ai'),
          onVisionEnd: () => {
            if (this.cameraOpen() && !this.aiLoading()) {
              this.scannerStatus.set('detecting');
            }
          },
          onDetected: scannedVin => {
            this.scannerStatus.set('found');
            this.notifications.success('VIN detectado: ' + scannedVin);
            this.vin.set(scannedVin);
            this.decodeVin(scannedVin);
            this.playBeep();
            this.vibrate([40, 40, 40]);
            this.closeCamera();
          },
        });
        this.scannerStatus.set('detecting');

        this.aiSuggestTimeout = setTimeout(() => {
          this.showAiSuggest.set(true);
        }, 5000);
      }
    } catch {
      this.cameraError.set('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      this.scannerStatus.set('idle');
    }
  }

  private stopCamera(): void {
    if (this.aiSuggestTimeout) {
      clearTimeout(this.aiSuggestTimeout);
      this.aiSuggestTimeout = null;
    }
    this.scanSession?.stop();
    this.scanSession = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.torchSupported.set(false);
    this.torchOn.set(false);
    this.scannerStatus.set('idle');
    this.releaseOrientationIfNeeded();
  }

  async useAI(): Promise<void> {
    if (!this.videoRef || !this.canvasRef) return;
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    
    if (!video.videoWidth || !video.videoHeight) return;

    this.aiLoading.set(true);
    this.scannerStatus.set('ai');
    
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const base64 = parts[1];

      const res = await firstValueFrom(this.campoService.extractVin(base64, mime));

      const detectedVin = res.vin
        ? this.vinScanner.extractVin(res.vin) ?? this.vinScanner.normalizeVinInput(res.vin)
        : '';

      if (detectedVin && detectedVin.length === 17) {
        this.notifications.success('VIN extraído con IA: ' + detectedVin);
        this.vin.set(detectedVin);
        this.decodeVin(detectedVin);
        this.playBeep();
        this.vibrate([40, 40, 40]);
        this.closeCamera();
      } else {
        this.notifications.warning('No se pudo detectar el VIN. Intenta acercar la cámara.');
      }
    } catch (err) {
      this.notifications.fromHttpError(err, 'Error procesando la imagen con IA');
    } finally {
      this.aiLoading.set(false);
      if (this.cameraOpen()) {
        this.scannerStatus.set('detecting');
      }
    }
  }

  private decodeVin(vinVal: string): void {
    if (vinVal.length !== 17) return;

    const version = ++this.vinDecodeVersion;
    this.vinLookupState.set('loading');
    
    this.cotizacionService.decodeVin(vinVal).subscribe({
      next: (decoded) => {
        if (version !== this.vinDecodeVersion) return;
        let loadedData = false;

        if (decoded.make) {
          const match = this.marcas().find(m => 
            m.nombre.toLowerCase() === decoded.make!.toLowerCase() || 
            m.aliases?.some((a: string) => a.toLowerCase() === decoded.make!.toLowerCase())
          );
          if (match) {
            this.marcaId.set(match.id);
            loadedData = true;
          }
        }
        if (decoded.model) {
          this.modelo.set(decoded.model);
          loadedData = true;
        }
        if (decoded.modelYear) {
          this.anno.set(decoded.modelYear);
          loadedData = true;
        }
        this.vinLookupState.set(loadedData ? 'loaded' : 'empty');
      },
      error: () => {
        if (version !== this.vinDecodeVersion) return;
        this.vinLookupState.set('error');
        // Ignorar errores del decodificador, a veces los VIN no están en la base de datos
      }
    });
  }

  async submit(): Promise<void> {
    if (!this.vin()) {
      this.notifications.warning('El VIN es obligatorio');
      return;
    }
    if (this.vin().length !== 17) {
      this.notifications.warning('El VIN debe tener 17 caracteres');
      return;
    }
    if (!this.clienteId()) {
      const confirmed = await this.notifications.confirm({
        title: 'Registrar sin cliente',
        message: 'No has asignado un cliente del catalogo. El vehiculo se guardara, pero quedara pendiente de asociar a un cliente.',
        confirmText: 'Registrar sin cliente',
        cancelText: 'Volver',
      });

      if (!confirmed) return;
    }

    const selectedCliente = this.selectedCliente();
    this.saving.set(true);
    this.campoService.crearPreInspeccion({
      vin: this.vin(),
      marcaId: this.marcaId(),
      modelo: this.modelo() || undefined,
      anno: this.anno() || undefined,
      ubicacion: this.ubicacion() || undefined,
      clienteId: this.clienteId(),
      clienteNombreLibre: selectedCliente ? this.clienteLabel(selectedCliente) : undefined,
      descripcionVehiculo: this.descripcionVehiculo() || 'Registro en yarda',
    }).subscribe({
      next: () => {
        this.notifications.success('Vehículo registrado');
        this.saving.set(false);
        this.registered.emit();
        this.close.emit();
      },
      error: err => {
        this.notifications.fromHttpError(err, 'Error al registrar vehículo');
        this.saving.set(false);
      }
    });
  }

  scannerStatusText(): string {
    switch (this.scannerStatus()) {
      case 'loading':
        return 'Cargando camara...';
      case 'searching':
        return 'Buscando codigo de barras...';
      case 'detecting':
        return 'Detectando VIN...';
      case 'ai':
        return 'IA analizando imagen...';
      case 'found':
        return 'VIN detectado';
      default:
        return 'Listo para escanear';
    }
  }

  vinLookupText(): string {
    switch (this.vinLookupState()) {
      case 'loading':
        return 'Consultando datos del VIN...';
      case 'loaded':
        return 'Datos del vehiculo cargados';
      case 'empty':
        return 'VIN leido, sin datos automaticos disponibles';
      case 'error':
        return 'VIN leido, no se pudo consultar la informacion';
      default:
        return '';
    }
  }

  private playBeep(): void {
    const AudioContextClass =
      window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

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
    const AudioContextClass =
      window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioContextClass || this.audioContext) return;

    try {
      this.audioContext = new AudioContextClass();
      void this.audioContext.resume().catch(() => undefined);
    } catch {
      this.audioContext = null;
    }
  }

  private async lockLandscapeIfPossible(): Promise<void> {
    const shell = this.cameraShellRef?.nativeElement ?? document.documentElement;

    try {
      if (shell.requestFullscreen && !document.fullscreenElement) {
        await shell.requestFullscreen();
        this.enteredScannerFullscreen = true;
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

    if (this.enteredScannerFullscreen && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    this.enteredScannerFullscreen = false;
  }

  private vibrate(pattern: number[]): void {
    navigator.vibrate?.(pattern);
  }
}
