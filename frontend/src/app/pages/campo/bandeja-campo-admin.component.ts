import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CampoService, TareaCampoDto } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';
import { TramiteService, TramiteListDto } from '../../services/tramite.service';

type AccionModal =
  | { kind: 'detalle'; tarea: TareaCampoDto }
  | { kind: 'asignar'; tarea: TareaCampoDto }
  | { kind: 'solicitar-fotos'; tarea: TareaCampoDto }
  | { kind: 'descartar'; tarea: TareaCampoDto };

@Component({
  selector: 'app-bandeja-campo-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bandeja-shell">
      <header class="bandeja-header">
        <div>
          <h1>Pendientes de campo</h1>
          <p class="sub">
            Pre-inspecciones capturadas por yarderos esperando ser asignadas a un trámite o cotización.
          </p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="cargar()" [disabled]="loading()">
            {{ loading() ? 'Cargando…' : 'Actualizar' }}
          </button>
        </div>
      </header>

      @if (loading() && tareas().length === 0) {
        <div class="empty">Cargando bandeja…</div>
      } @else if (tareas().length === 0) {
        <div class="empty">
          <p class="empty-title">Sin pre-inspecciones pendientes</p>
          <p class="empty-sub">Cuando un yardero capture una unidad, aparecerá aquí.</p>
        </div>
      } @else {
        <div class="cards">
          @for (t of tareas(); track t.id) {
            <article class="card">
              <div class="card-photo">
                @if (t.fotosUrls.length > 0) {
                  <img [src]="t.fotosUrls[0]" alt="Foto" />
                  @if (t.fotosUrls.length > 1) {
                    <span class="photo-count">+{{ t.fotosUrls.length - 1 }}</span>
                  }
                } @else {
                  <div class="no-photo">Sin foto</div>
                }
              </div>

              <div class="card-body">
                <div class="card-head">
                  <h3>{{ t.vehiculoResumen || 'Pre-inspección' }}</h3>
                  <span class="badge" [class.badge--abierta]="t.estatus === 'ABIERTA'">
                    {{ t.estatus }}
                  </span>
                </div>

                @if (t.vin) {
                  <p class="vin">VIN: {{ t.vin }}</p>
                }
                @if (t.clienteNombre || t.clienteNombreLibre) {
                  <p class="meta">
                    <strong>Cliente:</strong> {{ t.clienteNombre || t.clienteNombreLibre }}
                  </p>
                }
                @if (t.ubicacion) {
                  <p class="meta"><strong>Ubicación:</strong> {{ t.ubicacion }}</p>
                }
                <p class="meta">
                  <strong>Capturó:</strong>
                  {{ t.usuarioCampoNombre || t.personalCampoNombre || '—' }}
                </p>
                <p class="meta fecha">{{ formatFecha(t.fechaCreacion) }}</p>
              </div>

              <div class="card-actions">
                <button class="btn-link" (click)="abrir({ kind: 'detalle', tarea: t })">
                  Ver detalles
                </button>
                <button class="btn-primary" (click)="abrir({ kind: 'asignar', tarea: t })">
                  Asignar trámite
                </button>
                <button class="btn-secondary" (click)="irACotizar(t)">Crear cotización</button>
                <button
                  class="btn-secondary"
                  (click)="abrir({ kind: 'solicitar-fotos', tarea: t })"
                  [disabled]="!t.usuarioCampoId && !t.personalCampoId"
                  [title]="!t.usuarioCampoId && !t.personalCampoId ? 'Sin operador asignado' : ''"
                >
                  Pedir más fotos
                </button>
                <button
                  class="btn-danger-link"
                  (click)="abrir({ kind: 'descartar', tarea: t })"
                >
                  Descartar
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>

    <!-- ── Modal: detalle ────────────────────────────────────── -->
    @if (modal()?.kind === 'detalle') {
      @let m = modal()!;
      <div class="modal-backdrop" (click)="cerrarModal()">
        <div class="modal modal--large" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>Detalle pre-inspección</h2>
            <button class="modal-close" (click)="cerrarModal()">×</button>
          </header>
          <div class="modal-body">
            <p><strong>Vehículo:</strong> {{ m.tarea.vehiculoResumen }}</p>
            @if (m.tarea.vin) {
              <p><strong>VIN:</strong> {{ m.tarea.vin }}</p>
            }
            @if (m.tarea.clienteNombre || m.tarea.clienteNombreLibre) {
              <p>
                <strong>Cliente:</strong>
                {{ m.tarea.clienteNombre || m.tarea.clienteNombreLibre }}
              </p>
            }
            @if (m.tarea.ubicacion) {
              <p><strong>Ubicación:</strong> {{ m.tarea.ubicacion }}</p>
            }
            <p>
              <strong>Operador:</strong>
              {{ m.tarea.usuarioCampoNombre || m.tarea.personalCampoNombre || '—' }}
            </p>
            <p><strong>Fecha:</strong> {{ formatFecha(m.tarea.fechaCreacion) }}</p>
            @if (m.tarea.fotosUrls.length > 0) {
              <div class="photo-grid">
                @for (url of m.tarea.fotosUrls; track url) {
                  <a [href]="url" target="_blank" rel="noopener">
                    <img [src]="url" alt="Foto" />
                  </a>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ── Modal: asignar a trámite ─────────────────────────── -->
    @if (modal()?.kind === 'asignar') {
      @let m = modal()!;
      <div class="modal-backdrop" (click)="cerrarModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>Asignar a trámite</h2>
            <button class="modal-close" (click)="cerrarModal()">×</button>
          </header>
          <div class="modal-body">
            <p class="hint">
              Vehículo: <strong>{{ m.tarea.vehiculoResumen }}</strong>
              @if (m.tarea.vin) {
                <span> · VIN {{ m.tarea.vin }}</span>
              }
            </p>
            <label class="field">
              <span>Buscar trámite (por consecutivo, cliente o VIN)</span>
              <input
                type="text"
                [(ngModel)]="busqueda"
                (input)="buscarTramites()"
                placeholder="Ej: T-0123 o nombre del cliente"
              />
            </label>

            @if (buscandoTramites()) {
              <p class="hint">Buscando…</p>
            } @else if (tramitesEncontrados().length === 0 && busqueda()) {
              <p class="hint">Sin resultados.</p>
            } @else {
              <ul class="tramites-list">
                @for (tr of tramitesEncontrados(); track tr.id) {
                  <li
                    class="tramite-item"
                    [class.selected]="tramiteSeleccionadoId() === tr.id"
                    (click)="tramiteSeleccionadoId.set(tr.id)"
                  >
                    <div>
                      <strong>{{ tr.numeroConsecutivo }}</strong>
                      <span class="dim"> · {{ tr.clienteNombre || tr.clienteApodo || '—' }}</span>
                    </div>
                    <div class="dim small">
                      {{ tr.vehiculoMarcaModelo || '—' }}
                      @if (tr.vehiculoVinCorto) {
                        · VIN …{{ tr.vehiculoVinCorto }}
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
          <footer class="modal-footer">
            <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button
              class="btn-primary"
              [disabled]="!tramiteSeleccionadoId() || ejecutando()"
              (click)="confirmarAsignar(m.tarea)"
            >
              {{ ejecutando() ? 'Asignando…' : 'Asignar' }}
            </button>
          </footer>
        </div>
      </div>
    }

    <!-- ── Modal: pedir más fotos ───────────────────────────── -->
    @if (modal()?.kind === 'solicitar-fotos') {
      @let m = modal()!;
      <div class="modal-backdrop" (click)="cerrarModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>Pedir más fotos</h2>
            <button class="modal-close" (click)="cerrarModal()">×</button>
          </header>
          <div class="modal-body">
            <p class="hint">
              Se notificará a <strong>{{ m.tarea.usuarioCampoNombre || m.tarea.personalCampoNombre || 'el operador' }}</strong>
              para que tome fotos adicionales de <strong>{{ m.tarea.vehiculoResumen }}</strong>.
            </p>
            <label class="field">
              <span>Mensaje al yardero</span>
              <textarea
                [(ngModel)]="mensajeFotos"
                rows="3"
                placeholder="Ej: Falta foto del tablero y kilometraje."
              ></textarea>
            </label>
          </div>
          <footer class="modal-footer">
            <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button
              class="btn-primary"
              [disabled]="!mensajeFotos().trim() || ejecutando()"
              (click)="confirmarSolicitarFotos(m.tarea)"
            >
              {{ ejecutando() ? 'Enviando…' : 'Enviar solicitud' }}
            </button>
          </footer>
        </div>
      </div>
    }

    <!-- ── Modal: descartar ─────────────────────────────────── -->
    @if (modal()?.kind === 'descartar') {
      @let m = modal()!;
      <div class="modal-backdrop" (click)="cerrarModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>Descartar pre-inspección</h2>
            <button class="modal-close" (click)="cerrarModal()">×</button>
          </header>
          <div class="modal-body">
            <p class="hint">
              Marcarás esta pre-inspección como cancelada. No se eliminará el vehículo del catálogo,
              pero ya no aparecerá en la bandeja.
            </p>
            <label class="field">
              <span>Motivo (opcional)</span>
              <textarea
                [(ngModel)]="motivoDescarte"
                rows="2"
                placeholder="Ej: Captura duplicada / unidad no era del cliente"
              ></textarea>
            </label>
          </div>
          <footer class="modal-footer">
            <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button
              class="btn-danger"
              [disabled]="ejecutando()"
              (click)="confirmarDescartar(m.tarea)"
            >
              {{ ejecutando() ? 'Descartando…' : 'Descartar' }}
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .bandeja-shell {
        max-width: 1280px;
      }
      .bandeja-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 18px;
      }
      .bandeja-header h1 {
        margin: 0 0 4px;
        font-size: 22px;
        font-weight: 700;
        color: #111827;
      }
      .bandeja-header .sub {
        margin: 0;
        color: #6b7280;
        font-size: 13px;
      }
      .empty {
        background: #fff;
        border-radius: 12px;
        padding: 60px 24px;
        text-align: center;
        color: #6b7280;
        border: 1px dashed #e5e7eb;
      }
      .empty-title {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 4px;
      }
      .empty-sub {
        font-size: 13px;
        margin: 0;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 14px;
      }
      .card {
        background: #fff;
        border-radius: 14px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .card-photo {
        position: relative;
        height: 160px;
        background: #f3f4f6;
      }
      .card-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .photo-count {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .no-photo {
        display: grid;
        place-items: center;
        height: 100%;
        color: #9ca3af;
        font-size: 13px;
      }
      .card-body {
        padding: 12px 14px 0;
        flex: 1;
      }
      .card-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .card-head h3 {
        font-size: 15px;
        font-weight: 700;
        color: #111827;
        margin: 0;
        line-height: 1.3;
      }
      .badge {
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 999px;
        background: #f3f4f6;
        color: #374151;
        white-space: nowrap;
      }
      .badge--abierta {
        background: #fef3c7;
        color: #b45309;
      }
      .vin {
        font-family: monospace;
        font-size: 12px;
        color: #374151;
        margin: 2px 0 6px;
      }
      .meta {
        font-size: 12px;
        color: #4b5563;
        margin: 2px 0;
      }
      .meta strong {
        color: #111827;
      }
      .fecha {
        color: #9ca3af;
        font-size: 11px;
        margin-top: 8px;
      }
      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 12px 14px 14px;
        border-top: 1px solid #f3f4f6;
        margin-top: 8px;
      }
      .btn-primary,
      .btn-secondary,
      .btn-danger,
      .btn-link,
      .btn-danger-link {
        font-size: 12px;
        font-weight: 600;
        border-radius: 8px;
        padding: 7px 11px;
        border: 1px solid transparent;
        cursor: pointer;
        white-space: nowrap;
      }
      .btn-primary {
        background: #c61d26;
        color: #fff;
        border-color: #c61d26;
      }
      .btn-primary:hover:not(:disabled) {
        background: #a3151c;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #fff;
        color: #374151;
        border-color: #d1d5db;
      }
      .btn-secondary:hover:not(:disabled) {
        background: #f9fafb;
      }
      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-danger {
        background: #ef4444;
        color: #fff;
        border-color: #ef4444;
      }
      .btn-danger:hover:not(:disabled) {
        background: #b91c1c;
      }
      .btn-link {
        background: none;
        color: #2563eb;
        border: none;
        padding: 7px 4px;
      }
      .btn-danger-link {
        background: none;
        color: #ef4444;
        border: none;
        padding: 7px 4px;
        margin-left: auto;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: grid;
        place-items: center;
        z-index: 10000;
        padding: 20px;
      }
      .modal {
        background: #fff;
        border-radius: 14px;
        max-width: 480px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        animation: pop 0.18s ease;
      }
      .modal--large {
        max-width: 680px;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;
        border-bottom: 1px solid #f3f4f6;
      }
      .modal-header h2 {
        font-size: 16px;
        font-weight: 700;
        margin: 0;
        color: #111827;
      }
      .modal-close {
        background: none;
        border: none;
        font-size: 22px;
        color: #6b7280;
        cursor: pointer;
        line-height: 1;
      }
      .modal-body {
        padding: 16px 18px;
      }
      .modal-body p {
        margin: 0 0 8px;
        font-size: 13px;
        color: #374151;
      }
      .hint {
        color: #6b7280;
        font-size: 12px;
      }
      .field {
        display: block;
        margin-top: 12px;
      }
      .field span {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      .field input,
      .field textarea {
        width: 100%;
        padding: 9px 11px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 18px 16px;
        border-top: 1px solid #f3f4f6;
      }
      .tramites-list {
        list-style: none;
        margin: 12px 0 0;
        padding: 0;
        max-height: 240px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }
      .tramite-item {
        padding: 10px 12px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        font-size: 13px;
      }
      .tramite-item:last-child {
        border-bottom: none;
      }
      .tramite-item:hover {
        background: #f9fafb;
      }
      .tramite-item.selected {
        background: #fee2e2;
      }
      .dim {
        color: #6b7280;
        font-weight: 400;
      }
      .small {
        font-size: 11px;
        margin-top: 2px;
      }
      .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .photo-grid img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
    `,
  ],
})
export class BandejaCampoAdminComponent implements OnInit, OnDestroy {
  private campoService = inject(CampoService);
  private tramiteService = inject(TramiteService);
  private realtime = inject(RealtimeService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  ejecutando = signal(false);
  tareas = signal<TareaCampoDto[]>([]);
  modal = signal<AccionModal | null>(null);

  busqueda = signal('');
  buscandoTramites = signal(false);
  tramitesEncontrados = signal<TramiteListDto[]>([]);
  tramiteSeleccionadoId = signal<string | null>(null);
  busquedaTimer?: ReturnType<typeof setTimeout>;

  mensajeFotos = signal('');
  motivoDescarte = signal('');

  pendientes = computed(() => this.tareas().filter(t => t.estatus === 'ABIERTA').length);

  private preInspSub?: Subscription;
  private campoSub?: Subscription;

  ngOnInit(): void {
    this.cargar();
    this.preInspSub = this.realtime.preInspeccionCreada$.subscribe(() => this.cargar());
    this.campoSub = this.realtime.campoActualizado$.subscribe(() => this.cargar());
  }

  ngOnDestroy(): void {
    this.preInspSub?.unsubscribe();
    this.campoSub?.unsubscribe();
    clearTimeout(this.busquedaTimer);
  }

  cargar(): void {
    this.loading.set(true);
    this.campoService.getBandejaAdmin().subscribe({
      next: list => {
        this.tareas.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notify.fromHttpError(err, 'No se pudo cargar la bandeja');
      },
    });
  }

  abrir(m: AccionModal): void {
    this.busqueda.set('');
    this.tramitesEncontrados.set([]);
    this.tramiteSeleccionadoId.set(null);
    this.mensajeFotos.set('');
    this.motivoDescarte.set('');
    this.modal.set(m);
  }

  cerrarModal(): void {
    this.modal.set(null);
  }

  buscarTramites(): void {
    clearTimeout(this.busquedaTimer);
    const term = this.busqueda().trim();
    if (term.length < 2) {
      this.tramitesEncontrados.set([]);
      return;
    }
    this.busquedaTimer = setTimeout(() => {
      this.buscandoTramites.set(true);
      this.tramiteService.getList({ search: term, page: 1, pageSize: 10 }).subscribe({
        next: res => {
          this.tramitesEncontrados.set(res.items || []);
          this.buscandoTramites.set(false);
        },
        error: () => {
          this.buscandoTramites.set(false);
          this.tramitesEncontrados.set([]);
        },
      });
    }, 280);
  }

  confirmarAsignar(t: TareaCampoDto): void {
    const tramiteId = this.tramiteSeleccionadoId();
    if (!tramiteId) return;
    this.ejecutando.set(true);
    this.campoService.vincularTramite(t.id, tramiteId).subscribe({
      next: () => {
        this.notify.success('Pre-inspección asignada al trámite.');
        this.ejecutando.set(false);
        this.cerrarModal();
        this.cargar();
      },
      error: err => {
        this.ejecutando.set(false);
        this.notify.fromHttpError(err, 'No se pudo asignar al trámite');
      },
    });
  }

  confirmarSolicitarFotos(t: TareaCampoDto): void {
    const mensaje = this.mensajeFotos().trim();
    if (!mensaje) return;
    this.ejecutando.set(true);
    this.campoService.solicitarFotos(t.id, mensaje).subscribe({
      next: () => {
        this.notify.success('Solicitud enviada al yardero.');
        this.ejecutando.set(false);
        this.cerrarModal();
        this.cargar();
      },
      error: err => {
        this.ejecutando.set(false);
        this.notify.fromHttpError(err, 'No se pudo enviar la solicitud');
      },
    });
  }

  confirmarDescartar(t: TareaCampoDto): void {
    this.ejecutando.set(true);
    this.campoService.descartar(t.id, this.motivoDescarte().trim()).subscribe({
      next: () => {
        this.notify.success('Pre-inspección descartada.');
        this.ejecutando.set(false);
        this.cerrarModal();
        this.cargar();
      },
      error: err => {
        this.ejecutando.set(false);
        this.notify.fromHttpError(err, 'No se pudo descartar');
      },
    });
  }

  irACotizar(t: TareaCampoDto): void {
    const params: Record<string, string> = {};
    if (t.vin) params['vin'] = t.vin;
    if (t.clienteId) params['clienteId'] = t.clienteId;
    if (t.vehiculoId) params['vehiculoId'] = t.vehiculoId;
    this.router.navigate(['/cotizaciones/nueva'], { queryParams: params });
  }

  formatFecha(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
}
