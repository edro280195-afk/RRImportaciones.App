import { Component, EventEmitter, inject, Output, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampoService } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { MarcaService } from '../../services/marca.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { VinScannerService, VinScanSession } from '../../services/vin-scanner.service';
import { firstValueFrom } from 'rxjs';

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
            <input type="text" [(ngModel)]="clienteNombreLibre" name="clienteNombreLibre" placeholder="Nombre o apodo" />
            @if (!clienteNombreLibre()) {
              <small class="warning-text">⚠️ Se recomienda ingresar el cliente. ¿Deseas continuar sin asignar?</small>
            }
          </div>
          
          <div class="form-group">
            <label>Descripción / Notas</label>
            <textarea [(ngModel)]="descripcionVehiculo" name="descripcionVehiculo" rows="2" placeholder="Detalles adicionales"></textarea>
          </div>

          <div class="sheet-actions">
            <button type="button" class="sheet-cancel" (click)="close.emit()" [disabled]="saving()">Cancelar</button>
            <button type="submit" class="sheet-confirm" [disabled]="saving() || !vin()">
              {{ saving() ? 'Guardando...' : 'Registrar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CAMERA OVERLAY -->
    @if (cameraOpen()) {
      <div class="camera-shell">
        <video #video autoplay playsinline muted class="camera-feed"></video>
        
        <div class="cam-top">
          <button class="cam-pill-btn" (click)="closeCamera()" type="button">Cerrar</button>
          @if (torchSupported()) {
            <button class="cam-pill-btn" (click)="toggleTorch()" type="button">
              {{ torchOn() ? 'Linterna on' : 'Linterna' }}
            </button>
          }
          <button class="cam-pill-btn" (click)="flipCamera()" type="button">Girar</button>
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

        @if (showAiSuggest()) {
          <div class="cam-ai-suggest">
            <p>¿Problemas leyendo el código de barras?</p>
            <button class="btn-ai" (click)="useAI()" [disabled]="aiLoading()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              {{ aiLoading() ? 'Analizando...' : 'Usar Inteligencia Artificial' }}
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
      .cam-guide {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 80vw;
        max-width: 400px;
        height: 120px;
        pointer-events: none;
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

  private campoService = inject(CampoService);
  private marcaService = inject(MarcaService);
  private cotizacionService = inject(CotizacionService);
  private notifications = inject(NotificationService);
  private vinScanner = inject(VinScannerService);

  saving = signal(false);
  marcas = signal<any[]>([]);

  vin = signal('');
  marcaId = signal<string | null>(null);
  modelo = signal('');
  anno = signal<number | null>(null);
  ubicacion = signal('');
  clienteNombreLibre = signal('');
  descripcionVehiculo = signal('');

  // Scanner state
  cameraOpen = signal(false);
  cameraError = signal('');
  showAiSuggest = signal(false);
  aiLoading = signal(false);
  facingMode = signal<'environment' | 'user'>('environment');
  torchSupported = signal(false);
  torchOn = signal(false);

  private stream: MediaStream | null = null;
  private scanSession: VinScanSession | null = null;
  private aiSuggestTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.marcaService.getAll(true).subscribe(m => this.marcas.set(m));
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  onVinChange(val: string): void {
    this.vin.set(this.vinScanner.normalizeVinInput(val));
    if (this.vin().length === 17) {
      this.decodeVin(this.vin());
    }
  }

  openScanner(): void {
    this.cameraOpen.set(true);
    this.cameraError.set('');
    this.showAiSuggest.set(false);
    this.aiLoading.set(false);
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
    this.torchSupported.set(false);
    this.torchOn.set(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no soporta la cámara.');
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

        this.scanSession = await this.vinScanner.startVinScan({
          video,
          onDetected: scannedVin => {
            this.notifications.success('VIN detectado: ' + scannedVin);
            this.vin.set(scannedVin);
            this.decodeVin(scannedVin);
            this.vibrate([40, 40, 40]);
            this.closeCamera();
          },
        });

        this.aiSuggestTimeout = setTimeout(() => {
          this.showAiSuggest.set(true);
        }, 5000);
      }
    } catch {
      this.cameraError.set('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
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
  }

  async useAI(): Promise<void> {
    if (!this.videoRef || !this.canvasRef) return;
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    
    if (!video.videoWidth || !video.videoHeight) return;

    this.aiLoading.set(true);
    
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

      if (detectedVin && detectedVin.length >= 10) {
        this.notifications.success('VIN extraído con IA: ' + detectedVin);
        this.vin.set(detectedVin);
        this.decodeVin(detectedVin);
        this.vibrate([40, 40, 40]);
        this.closeCamera();
      } else {
        this.notifications.warning('No se pudo detectar el VIN. Intenta acercar la cámara.');
      }
    } catch (err) {
      this.notifications.fromHttpError(err, 'Error procesando la imagen con IA');
    } finally {
      this.aiLoading.set(false);
    }
  }

  private decodeVin(vinVal: string): void {
    if (vinVal.length !== 17) return;
    
    this.cotizacionService.decodeVin(vinVal).subscribe({
      next: (decoded) => {
        if (decoded.make) {
          const match = this.marcas().find(m => 
            m.nombre.toLowerCase() === decoded.make!.toLowerCase() || 
            m.aliases?.some((a: string) => a.toLowerCase() === decoded.make!.toLowerCase())
          );
          if (match) this.marcaId.set(match.id);
        }
        if (decoded.model) this.modelo.set(decoded.model);
        if (decoded.modelYear) this.anno.set(decoded.modelYear);
      },
      error: () => {
        // Ignorar errores del decodificador, a veces los VIN no están en la base de datos
      }
    });
  }

  submit() {
    if (!this.vin()) {
      this.notifications.warning('El VIN es obligatorio');
      return;
    }
    if (!this.clienteNombreLibre() && !confirm('No has asignado un cliente. ¿Deseas continuar?')) {
      return;
    }

    this.saving.set(true);
    this.campoService.crearPreInspeccion({
      vin: this.vin(),
      marcaId: this.marcaId(),
      modelo: this.modelo() || undefined,
      anno: this.anno() || undefined,
      ubicacion: this.ubicacion() || undefined,
      clienteNombreLibre: this.clienteNombreLibre() || undefined,
      descripcionVehiculo: this.descripcionVehiculo() || 'Registro en yarda',
    } as any).subscribe({
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

  private vibrate(pattern: number[]): void {
    navigator.vibrate?.(pattern);
  }
}
