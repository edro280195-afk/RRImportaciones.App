import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { CampoService, TareaCampoDto } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';

type CaptureState = 'loading' | 'ready' | 'camera' | 'sending' | 'error';

interface LocalPhoto {
  id: string;
  dataUrl: string;
  createdAt: string;
}

interface CampoDraft {
  ubicacion: string;
  vinConfirmado: string;
  incidencia: string;
}

@Component({
  selector: 'app-campo-captura',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="field-page" [class.field-page--busy]="state === 'sending'">
      <header class="field-header">
        <button type="button" class="back-btn" (click)="goBack()" aria-label="Regresar">
          <span>‹</span>
        </button>
        <div>
          <small>{{ tarea?.numeroConsecutivo || 'Campo' }}</small>
          <h1>{{ tarea?.vehiculoResumen || 'Cargando unidad' }}</h1>
          <p>{{ tarea?.clienteNombre || 'Sin cliente vinculado' }}</p>
        </div>
      </header>

      @if (state === 'loading') {
        <section class="loading-state">
          <i></i>
          <span>Preparando unidad</span>
        </section>
      } @else if (state === 'error') {
        <section class="empty-state">
          <h2>No se pudo abrir esta tarea</h2>
          <p>Regresa al módulo de campo e inténtalo de nuevo.</p>
          <button type="button" (click)="goBack()">Volver</button>
        </section>
      } @else {
        <section class="unit-panel">
          <div class="unit-hero">
            <span>VIN</span>
            <strong>{{ shortVin }}</strong>
            <em>{{ estadoLabel(tarea?.estatus || '') }}</em>
          </div>

          <div class="form-stack">
            <label>
              <span>Ubicación</span>
              <input [(ngModel)]="ubicacion" (ngModelChange)="persistDraft()" placeholder="Yarda, fila, cajón">
            </label>

            <label>
              <span>VIN corto</span>
              <input
                [(ngModel)]="vinConfirmado"
                (ngModelChange)="onVinChange($event)"
                maxlength="6"
                inputmode="text"
                autocomplete="off"
                placeholder="Últimos 6">
            </label>

            <label>
              <span>Incidencia</span>
              <textarea
                [(ngModel)]="incidencia"
                (ngModelChange)="persistDraft()"
                placeholder="Daño visible, unidad no localizada, VIN no coincide..."></textarea>
            </label>
          </div>
        </section>

        <section class="photo-panel">
          <div class="photo-head">
            <div>
              <span>Evidencia local</span>
              <strong>{{ pendingPhotos.length }} foto{{ pendingPhotos.length === 1 ? '' : 's' }}</strong>
            </div>
            <button type="button" class="secondary-btn" (click)="openCamera()">Tomar fotos</button>
          </div>

          @if (pendingPhotos.length > 0) {
            <div class="photo-grid">
              @for (photo of pendingPhotos; track photo.id) {
                <figure>
                  <img [src]="photo.dataUrl" alt="Foto pendiente">
                  <button type="button" (click)="removePhoto(photo.id)" aria-label="Eliminar foto">×</button>
                </figure>
              }
            </div>
          } @else {
            <button type="button" class="camera-card" (click)="openCamera()">
              <span></span>
              <strong>Abrir cámara</strong>
              <em>Las fotos se guardan primero en este dispositivo.</em>
            </button>
          }

          @if ((tarea?.fotosUrls?.length || 0) > 0) {
            <div class="uploaded-strip">
              <span>Ya subidas</span>
              @for (url of tarea?.fotosUrls || []; track url) {
                <img [src]="fileUrl(url)" alt="Foto subida">
              }
            </div>
          }
        </section>

        <footer class="action-bar">
          <button type="button" class="ghost-btn" (click)="goBack()">Cancelar</button>
          <button type="button" class="send-btn" (click)="sendReport()" [disabled]="!canSend">
            {{ state === 'sending' ? 'Enviando...' : 'Enviar' }}
          </button>
        </footer>
      }

      @if (cameraOpen) {
        <section class="camera-shell">
          <video #video autoplay playsinline muted></video>
          <canvas #canvas></canvas>

          @if (flash) {
            <div class="flash"></div>
          }

          <header class="camera-top">
            <button type="button" (click)="closeCamera()">Cerrar</button>
            <strong>{{ pendingPhotos.length }} foto{{ pendingPhotos.length === 1 ? '' : 's' }}</strong>
          </header>

          @if (!cameraReady) {
            <div class="camera-permission">
              <span>{{ cameraError || 'Abriendo cámara' }}</span>
              <button type="button" (click)="startCamera()">Reintentar</button>
            </div>
          }

          <button type="button" class="shutter" (click)="capturePhoto()" [disabled]="!cameraReady" aria-label="Tomar foto">
            <span></span>
          </button>
        </section>
      }
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: oklch(97% .006 35); }
    button, input, textarea { font: inherit; }
    .field-page {
      --ink: oklch(19% .018 245);
      --muted: oklch(49% .02 245);
      --soft: oklch(93% .012 55);
      --line: oklch(84% .018 55);
      --red: oklch(48% .19 25);
      --red-dark: oklch(34% .13 25);
      --green: oklch(58% .16 155);
      min-height: 100dvh;
      color: var(--ink);
      padding: max(16px, env(safe-area-inset-top)) 16px max(104px, env(safe-area-inset-bottom));
      background:
        radial-gradient(circle at 12% 0%, oklch(91% .045 30), transparent 28rem),
        linear-gradient(180deg, oklch(98% .006 35), oklch(94% .012 65));
    }
    .field-page--busy { pointer-events: none; }
    .field-header {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 12px;
      align-items: center;
      max-width: 820px;
      margin: 0 auto 18px;
    }
    .back-btn {
      width: 48px;
      height: 48px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: oklch(99% .004 35);
      color: var(--ink);
      display: grid;
      place-items: center;
      box-shadow: 0 10px 24px oklch(25% .02 40 / .08);
      transition: transform .18s ease, border-color .18s ease;
    }
    .back-btn:hover { transform: translateY(-1px); border-color: oklch(68% .04 35); }
    .back-btn span { font-size: 34px; line-height: 1; transform: translateY(-1px); }
    .field-header small {
      display: block;
      color: var(--red);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .field-header h1 { margin: 2px 0 0; font-size: clamp(22px, 6vw, 34px); line-height: 1; letter-spacing: 0; }
    .field-header p { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
    .unit-panel, .photo-panel, .empty-state, .loading-state {
      max-width: 820px;
      margin: 0 auto 14px;
      border: 1px solid var(--line);
      border-radius: 24px;
      background: oklch(99% .004 35);
      box-shadow: 0 22px 50px oklch(24% .02 40 / .08);
    }
    .unit-panel { overflow: hidden; }
    .unit-hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px 12px;
      align-items: end;
      padding: 20px;
      background: linear-gradient(135deg, var(--red-dark), oklch(25% .045 30));
      color: oklch(98% .006 35);
    }
    .unit-hero span {
      grid-column: 1 / -1;
      color: oklch(85% .04 30);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .unit-hero strong {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: clamp(42px, 18vw, 92px);
      line-height: .88;
      letter-spacing: 0;
    }
    .unit-hero em {
      align-self: center;
      border: 1px solid oklch(95% .008 35 / .2);
      border-radius: 999px;
      padding: 8px 11px;
      color: oklch(94% .008 35);
      font-style: normal;
      font-size: 12px;
      font-weight: 850;
      white-space: nowrap;
    }
    .form-stack { display: grid; gap: 12px; padding: 16px; }
    label span {
      display: block;
      margin: 0 0 6px 2px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .07em;
      text-transform: uppercase;
    }
    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: oklch(97% .006 45);
      color: var(--ink);
      padding: 14px 15px;
      outline: none;
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    input:focus, textarea:focus {
      border-color: var(--red);
      background: oklch(99% .004 35);
      box-shadow: 0 0 0 4px oklch(55% .15 25 / .12);
    }
    textarea { min-height: 104px; resize: vertical; line-height: 1.35; }
    .photo-panel { padding: 16px; }
    .photo-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 14px;
    }
    .photo-head span, .uploaded-strip span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .photo-head strong { display: block; margin-top: 2px; font-size: 22px; }
    .secondary-btn, .ghost-btn, .send-btn, .empty-state button, .camera-permission button {
      min-height: 46px;
      border-radius: 15px;
      padding: 0 16px;
      font-weight: 900;
      transition: transform .18s ease, filter .18s ease, opacity .18s ease;
    }
    .secondary-btn, .ghost-btn {
      border: 1px solid var(--line);
      background: oklch(97% .006 35);
      color: var(--ink);
    }
    .secondary-btn:hover, .ghost-btn:hover, .send-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(.98); }
    .camera-card {
      width: 100%;
      min-height: 172px;
      border: 1px dashed oklch(70% .035 35);
      border-radius: 22px;
      background: oklch(96% .01 55);
      color: var(--ink);
      display: grid;
      place-items: center;
      gap: 7px;
      padding: 22px;
      text-align: center;
      transition: transform .18s ease, border-color .18s ease;
    }
    .camera-card:hover { transform: translateY(-2px); border-color: var(--red); }
    .camera-card span {
      width: 58px;
      height: 44px;
      border: 4px solid var(--red-dark);
      border-radius: 16px;
      position: relative;
    }
    .camera-card span::after {
      content: '';
      position: absolute;
      inset: 9px 16px;
      border: 4px solid var(--red-dark);
      border-radius: 50%;
    }
    .camera-card strong { font-size: 22px; }
    .camera-card em { max-width: 300px; color: var(--muted); font-style: normal; line-height: 1.35; }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
      gap: 10px;
    }
    .photo-grid figure {
      position: relative;
      aspect-ratio: 1;
      margin: 0;
      overflow: hidden;
      border-radius: 18px;
      background: var(--soft);
    }
    .photo-grid img, .uploaded-strip img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-grid button {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 31px;
      height: 31px;
      border: 0;
      border-radius: 999px;
      background: oklch(19% .018 245 / .84);
      color: oklch(98% .006 35);
      font-size: 22px;
      line-height: 1;
    }
    .uploaded-strip {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 14px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .uploaded-strip img { width: 56px; height: 56px; flex: 0 0 auto; border-radius: 14px; }
    .action-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      grid-template-columns: 1fr 1.45fr;
      gap: 12px;
      padding: 14px 16px max(14px, env(safe-area-inset-bottom));
      background: oklch(99% .004 35 / .94);
      border-top: 1px solid var(--line);
      box-shadow: 0 -18px 44px oklch(24% .02 40 / .1);
      backdrop-filter: blur(14px);
      z-index: 5;
    }
    .send-btn {
      border: 0;
      background: var(--red);
      color: oklch(98% .006 35);
      box-shadow: 0 12px 26px oklch(48% .18 25 / .26);
    }
    .send-btn:disabled { opacity: .45; box-shadow: none; }
    .loading-state, .empty-state {
      display: grid;
      place-items: center;
      gap: 14px;
      min-height: 240px;
      text-align: center;
      padding: 26px;
    }
    .loading-state i {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      border: 4px solid oklch(84% .018 55);
      border-top-color: var(--red);
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state h2 { margin: 0; font-size: 24px; }
    .empty-state p { margin: 0; color: var(--muted); }
    .empty-state button { border: 0; background: var(--red); color: oklch(98% .006 35); }
    .camera-shell {
      position: fixed;
      inset: 0;
      z-index: 1000;
      overflow: hidden;
      background: oklch(10% .015 245);
      color: oklch(98% .006 35);
    }
    .camera-shell video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: oklch(10% .015 245);
    }
    .camera-shell canvas { display: none; }
    .camera-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: max(14px, env(safe-area-inset-top)) 16px 18px;
      background: linear-gradient(180deg, oklch(10% .015 245 / .75), transparent);
      z-index: 2;
    }
    .camera-top button {
      min-height: 42px;
      border: 1px solid oklch(98% .006 35 / .22);
      border-radius: 999px;
      background: oklch(98% .006 35 / .13);
      color: inherit;
      padding: 0 15px;
      font-weight: 900;
    }
    .camera-top strong {
      border-radius: 999px;
      background: oklch(10% .015 245 / .62);
      padding: 10px 13px;
      font-size: 14px;
    }
    .shutter {
      position: absolute;
      left: 50%;
      bottom: max(24px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      width: 86px;
      height: 86px;
      border: 4px solid oklch(98% .006 35);
      border-radius: 999px;
      background: oklch(98% .006 35 / .18);
      display: grid;
      place-items: center;
      box-shadow: 0 0 0 7px oklch(98% .006 35 / .08);
      z-index: 3;
    }
    .shutter:active { transform: translateX(-50%) scale(.94); }
    .shutter span {
      width: 62px;
      height: 62px;
      border-radius: 999px;
      background: oklch(98% .006 35);
    }
    .camera-permission {
      position: absolute;
      left: 18px;
      right: 18px;
      top: 44%;
      display: grid;
      gap: 12px;
      padding: 20px;
      border-radius: 22px;
      background: oklch(98% .006 35);
      color: var(--ink);
      text-align: center;
      z-index: 4;
    }
    .flash {
      position: absolute;
      inset: 0;
      background: oklch(98% .006 35);
      animation: flash .3s ease-out forwards;
      z-index: 5;
    }
    @keyframes flash {
      0% { opacity: 0; }
      18% { opacity: 1; }
      100% { opacity: 0; }
    }
    @media (min-width: 780px) {
      .field-page { padding-top: 28px; }
      .form-stack { grid-template-columns: 1fr 170px; align-items: start; }
      .form-stack label:last-child { grid-column: 1 / -1; }
      .action-bar {
        left: 50%;
        width: min(820px, calc(100vw - 32px));
        transform: translateX(-50%);
        border: 1px solid var(--line);
        border-bottom: 0;
        border-radius: 22px 22px 0 0;
      }
    }
  `],
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

  tarea: TareaCampoDto | null = null;
  pendingPhotos: LocalPhoto[] = [];
  stream: MediaStream | null = null;
  state: CaptureState = 'loading';
  cameraOpen = false;
  cameraReady = false;
  cameraError = '';
  ubicacion = '';
  vinConfirmado = '';
  incidencia = '';
  flash = false;

  get canSend(): boolean {
    return Boolean(this.tarea) && this.pendingPhotos.length > 0 && this.state !== 'sending';
  }

  get shortVin(): string {
    const source = this.vinConfirmado || this.tarea?.vinCorto || this.tarea?.vin || '';
    return source.slice(-6).toUpperCase() || '------';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.loadDraft(id);
    this.load(id);
    this.realtime.start();
    this.sub = this.realtime.campoActualizado$.subscribe(event => {
      if (event.tareaCampoId === id && this.state !== 'sending') this.load(id, false);
    });
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.sub?.unsubscribe();
  }

  load(id: string, markTaken = true): void {
    this.state = this.state === 'camera' ? 'camera' : 'loading';
    this.campoService.getById(id).subscribe({
      next: tarea => {
        this.tarea = tarea;
        this.ubicacion = this.ubicacion || tarea.ubicacion || '';
        this.vinConfirmado = this.vinConfirmado || this.normalizeVin(tarea.vinConfirmado || tarea.vinCorto || tarea.vin || '');
        this.incidencia = this.incidencia || tarea.incidencia || '';
        this.loadLocalPhotos(tarea.id);
        this.state = this.cameraOpen ? 'camera' : 'ready';
        this.persistDraft();

        if (markTaken && tarea.estatus === 'ABIERTA') {
          this.campoService.tomar(tarea.id).subscribe({ next: updated => this.tarea = updated });
        }
      },
      error: err => {
        this.state = 'error';
        this.notifications.fromHttpError(err, 'No se pudo abrir la tarea de campo');
      },
    });
  }

  openCamera(): void {
    this.cameraOpen = true;
    this.state = 'camera';
    this.startCamera();
  }

  closeCamera(): void {
    this.stopCamera();
    this.cameraOpen = false;
    this.state = 'ready';
  }

  async startCamera(): Promise<void> {
    this.stopCamera();
    this.cameraError = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });

      this.cameraReady = true;
      setTimeout(() => {
        const video = this.videoRef?.nativeElement;
        if (video && this.stream) video.srcObject = this.stream;
      });
    } catch {
      this.cameraReady = false;
      this.cameraError = 'No se pudo abrir la cámara. Revisa permisos o usa HTTPS en móvil.';
    }
  }

  async capturePhoto(): Promise<void> {
    if (!this.tarea || !this.videoRef || !this.canvasRef || !this.cameraReady) return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    if (!video.videoWidth || !video.videoHeight) return;

    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    this.pendingPhotos = [
      ...this.pendingPhotos,
      { id: crypto.randomUUID(), dataUrl, createdAt: new Date().toISOString() },
    ];
    this.persistLocalPhotos();
    this.flashOnce();
    this.vibrate([18, 28, 18]);
  }

  removePhoto(id: string): void {
    this.pendingPhotos = this.pendingPhotos.filter(photo => photo.id !== id);
    this.persistLocalPhotos();
  }

  async sendReport(): Promise<void> {
    if (!this.tarea || !this.canSend) return;

    this.state = 'sending';
    try {
      let current = this.tarea;
      for (const photo of this.pendingPhotos) {
        const file = this.dataUrlToFile(photo.dataUrl, `campo-${current.numeroConsecutivo}-${photo.id}.jpg`);
        const response = await firstValueFrom(this.campoService.uploadFoto(current.id, file));
        current = response.tarea;
      }

      const completed = await firstValueFrom(this.campoService.completar(current.id, {
        ubicacion: this.ubicacion || null,
        vinConfirmado: this.vinConfirmado || null,
        fotosUrls: current.fotosUrls,
        incidencia: this.incidencia || null,
      }));

      this.tarea = completed;
      this.clearLocalState();
      this.notifications.success('Reporte de campo enviado.');
      this.goBack();
    } catch (err) {
      this.state = 'ready';
      this.notifications.fromHttpError(err, 'No se pudo enviar el reporte');
    }
  }

  onVinChange(value: string): void {
    this.vinConfirmado = this.normalizeVin(value);
    this.persistDraft();
  }

  persistDraft(): void {
    if (!this.tarea) return;
    const draft: CampoDraft = {
      ubicacion: this.ubicacion,
      vinConfirmado: this.vinConfirmado,
      incidencia: this.incidencia,
    };
    localStorage.setItem(this.draftKey(this.tarea.id), JSON.stringify(draft));
  }

  goBack(): void {
    this.router.navigate(['/campo']);
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.cameraReady = false;
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }

  estadoLabel(value: string): string {
    const labels: Record<string, string> = {
      ABIERTA: 'Abierta',
      TOMADA: 'En campo',
      EN_YARDA: 'Fotos subidas',
      INCIDENCIA: 'Incidencia',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return labels[value] ?? 'Lista';
  }

  private normalizeVin(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-6);
  }

  private loadDraft(id: string): void {
    const raw = localStorage.getItem(this.draftKey(id));
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as CampoDraft;
      this.ubicacion = draft.ubicacion || '';
      this.vinConfirmado = this.normalizeVin(draft.vinConfirmado || '');
      this.incidencia = draft.incidencia || '';
    } catch {
      localStorage.removeItem(this.draftKey(id));
    }
  }

  private loadLocalPhotos(id: string): void {
    const raw = localStorage.getItem(this.photosKey(id));
    if (!raw) {
      this.pendingPhotos = [];
      return;
    }

    try {
      const photos = JSON.parse(raw) as LocalPhoto[];
      this.pendingPhotos = photos.filter(photo => photo.id && photo.dataUrl.startsWith('data:image/'));
    } catch {
      this.pendingPhotos = [];
      localStorage.removeItem(this.photosKey(id));
    }
  }

  private persistLocalPhotos(): void {
    if (!this.tarea) return;
    localStorage.setItem(this.photosKey(this.tarea.id), JSON.stringify(this.pendingPhotos));
  }

  private clearLocalState(): void {
    if (!this.tarea) return;
    localStorage.removeItem(this.photosKey(this.tarea.id));
    localStorage.removeItem(this.draftKey(this.tarea.id));
    this.pendingPhotos = [];
  }

  private photosKey(id: string): string {
    return `rr_campo_fotos_${id}`;
  }

  private draftKey(id: string): string {
    return `rr_campo_draft_${id}`;
  }

  private dataUrlToFile(dataUrl: string, fileName: string): File {
    const [header, content] = dataUrl.split(',');
    const mime = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg';
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mime });
  }

  private flashOnce(): void {
    this.flash = true;
    window.setTimeout(() => this.flash = false, 280);
  }

  private vibrate(pattern: number[]): void {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }
}
