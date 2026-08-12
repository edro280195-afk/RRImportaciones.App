import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CampoService, CampoShareResponse, TareaCampoDto } from '../../services/campo.service';
import { AuthService } from '../../services/auth.service';
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
                  <button
                    type="button"
                    class="photo-open"
                    (click)="openGallery(t, 0)"
                    aria-label="Ver fotos"
                  >
                    <img [src]="fileUrl(t.fotosUrls[0])" alt="Foto" />
                  </button>
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
                <button class="btn-secondary" (click)="compartirWhatsApp(t)" [disabled]="compartiendoId() === t.id">
                  {{ compartiendoId() === t.id ? 'Preparando…' : 'WhatsApp manual' }}
                </button>
                <button class="btn-secondary" (click)="copiarEnlace(t)" [disabled]="compartiendoId() === t.id">
                  Copiar enlace
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
                @for (url of m.tarea.fotosUrls; track url; let idx = $index) {
                  <button type="button" class="photo-thumb" (click)="openGallery(m.tarea, idx)">
                    <img [src]="fileUrl(url)" alt="Foto" />
                  </button>
                }
              </div>
            }
            @if (m.tarea.videosUrls.length > 0) {
              <p class="media-summary">{{ m.tarea.videosUrls.length }} video{{ m.tarea.videosUrls.length === 1 ? '' : 's' }} opcional{{ m.tarea.videosUrls.length === 1 ? '' : 'es' }} guardado{{ m.tarea.videosUrls.length === 1 ? '' : 's' }}.</p>
            }
            <div class="share-actions">
              <button class="btn-secondary" type="button" (click)="compartirWhatsApp(m.tarea)">WhatsApp manual</button>
              <button class="btn-primary" type="button" (click)="copiarEnlace(m.tarea)">Copiar enlace de descarga</button>
            </div>
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

    @if (galleryTarea(); as gt) {
      @let photos = galleryPhotos();
      @if (photos.length > 0) {
        <div
          class="photo-lightbox"
          (click)="closeGallery()"
          (touchstart)="onLightboxTouchStart($event)"
          (touchend)="onLightboxTouchEnd($event)"
        >
          <div class="lightbox-top" (click)="$event.stopPropagation()">
            <div>
              <strong>{{ gt.vehiculoResumen || 'Fotos de campo' }}</strong>
              <span>{{ galleryIndex() + 1 }} de {{ photos.length }}</span>
            </div>
            <button type="button" class="lightbox-close" (click)="closeGallery()" aria-label="Cerrar">
              ×
            </button>
          </div>

          <button
            type="button"
            class="lightbox-nav lightbox-nav--prev"
            (click)="$event.stopPropagation(); prevPhoto()"
            [disabled]="photos.length <= 1"
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <img
            class="lightbox-img"
            [src]="fileUrl(photos[galleryIndex()])"
            alt="Foto de campo"
            (click)="$event.stopPropagation()"
          />
          <button
            type="button"
            class="lightbox-nav lightbox-nav--next"
            (click)="$event.stopPropagation(); nextPhoto()"
            [disabled]="photos.length <= 1"
            aria-label="Foto siguiente"
          >
            ›
          </button>

          @if (canDeletePhotos()) {
            <button
              type="button"
              class="lightbox-delete"
              (click)="$event.stopPropagation(); deleteCurrentPhoto()"
              [disabled]="ejecutando()"
            >
              {{ ejecutando() ? 'Eliminando...' : 'Eliminar foto' }}
            </button>
          }
        </div>
      }
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
      .photo-open {
        width: 100%;
        height: 100%;
        display: block;
        padding: 0;
        border: 0;
        background: none;
        cursor: zoom-in;
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
      .media-summary { color: #6b7280 !important; font-size: 12px !important; }
      .share-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
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
      .photo-thumb {
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        cursor: zoom-in;
      }
      .photo-grid img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      .photo-lightbox {
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.9);
        padding: 72px 64px 86px;
      }
      .lightbox-top {
        position: absolute;
        top: 16px;
        left: 16px;
        right: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #fff;
        gap: 16px;
      }
      .lightbox-top strong {
        display: block;
        font-size: 14px;
      }
      .lightbox-top span {
        display: block;
        margin-top: 2px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.68);
      }
      .lightbox-close,
      .lightbox-nav {
        border: 0;
        color: #fff;
        background: rgba(255, 255, 255, 0.14);
        cursor: pointer;
      }
      .lightbox-close {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        font-size: 26px;
        line-height: 1;
      }
      .lightbox-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      }
      .lightbox-nav {
        position: absolute;
        top: 50%;
        width: 44px;
        height: 64px;
        border-radius: 14px;
        transform: translateY(-50%);
        font-size: 42px;
        line-height: 1;
      }
      .lightbox-nav:disabled {
        opacity: 0.25;
        cursor: default;
      }
      .lightbox-nav--prev {
        left: 14px;
      }
      .lightbox-nav--next {
        right: 14px;
      }
      .lightbox-delete {
        position: absolute;
        left: 50%;
        bottom: 22px;
        transform: translateX(-50%);
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 12px;
        background: #dc2626;
        color: #fff;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .lightbox-delete:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      @media (max-width: 640px) {
        .photo-lightbox {
          padding: 68px 12px 88px;
        }
        .lightbox-nav {
          width: 38px;
          height: 56px;
          font-size: 34px;
          background: rgba(0, 0, 0, 0.34);
        }
      }
    `,
  ],
})
export class BandejaCampoAdminComponent implements OnInit, OnDestroy {
  private campoService = inject(CampoService);
  private tramiteService = inject(TramiteService);
  private realtime = inject(RealtimeService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = signal(false);
  ejecutando = signal(false);
  compartiendoId = signal<string | null>(null);
  tareas = signal<TareaCampoDto[]>([]);
  modal = signal<AccionModal | null>(null);

  busqueda = signal('');
  buscandoTramites = signal(false);
  tramitesEncontrados = signal<TramiteListDto[]>([]);
  tramiteSeleccionadoId = signal<string | null>(null);
  busquedaTimer?: ReturnType<typeof setTimeout>;

  mensajeFotos = signal('');
  motivoDescarte = signal('');
  galleryTarea = signal<TareaCampoDto | null>(null);
  galleryIndex = signal(0);
  private touchStartX = 0;

  pendientes = computed(() => this.tareas().filter(t => t.estatus === 'ABIERTA').length);
  galleryPhotos = computed(() => this.galleryTarea()?.fotosUrls ?? []);
  canDeletePhotos = computed(() => this.auth.isAdmin());

  private preInspSub?: Subscription;
  private campoSub?: Subscription;
  private querySub?: Subscription;
  private tareaEnfocadaId: string | null = null;
  private tareaEnfocadaAbierta = false;

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const tareaId = params.get('tareaCampoId');
      if (tareaId !== this.tareaEnfocadaId) {
        this.tareaEnfocadaId = tareaId;
        this.tareaEnfocadaAbierta = false;
      }
      this.abrirTareaEnfocada();
    });
    this.cargar();
    this.preInspSub = this.realtime.preInspeccionCreada$.subscribe(() => this.cargar());
    this.campoSub = this.realtime.campoActualizado$.subscribe(() => this.cargar());
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
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
        this.abrirTareaEnfocada();
      },
      error: err => {
        this.loading.set(false);
        this.notify.fromHttpError(err, 'No se pudo cargar la bandeja');
      },
    });
  }

  private abrirTareaEnfocada(): void {
    if (!this.tareaEnfocadaId || this.tareaEnfocadaAbierta) return;

    const tarea = this.tareas().find(item => item.id === this.tareaEnfocadaId);
    if (!tarea) return;

    this.tareaEnfocadaAbierta = true;
    this.abrir({ kind: 'detalle', tarea });
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

  openGallery(tarea: TareaCampoDto, index: number): void {
    if (tarea.fotosUrls.length === 0) return;
    this.galleryTarea.set(tarea);
    this.galleryIndex.set(Math.min(Math.max(index, 0), tarea.fotosUrls.length - 1));
  }

  closeGallery(): void {
    this.galleryTarea.set(null);
    this.galleryIndex.set(0);
  }

  nextPhoto(): void {
    const photos = this.galleryPhotos();
    if (photos.length <= 1) return;
    this.galleryIndex.update(index => (index + 1) % photos.length);
  }

  prevPhoto(): void {
    const photos = this.galleryPhotos();
    if (photos.length <= 1) return;
    this.galleryIndex.update(index => (index - 1 + photos.length) % photos.length);
  }

  deleteCurrentPhoto(): void {
    const tarea = this.galleryTarea();
    const fotoUrl = this.galleryPhotos()[this.galleryIndex()];
    if (!tarea || !fotoUrl || !this.canDeletePhotos()) return;
    if (!window.confirm('Eliminar esta foto de la tarea de campo?')) return;

    this.ejecutando.set(true);
    this.campoService.deleteFoto(tarea.id, fotoUrl).subscribe({
      next: updated => {
        this.ejecutando.set(false);
        this.notify.success('Foto eliminada.');
        this.tareas.update(items => items.map(item => (item.id === updated.id ? updated : item)));
        const currentModal = this.modal();
        if (currentModal?.tarea.id === updated.id) {
          this.modal.set({ ...currentModal, tarea: updated });
        }
        if (updated.fotosUrls.length === 0) {
          this.closeGallery();
          return;
        }
        this.galleryTarea.set(updated);
        this.galleryIndex.set(Math.min(this.galleryIndex(), updated.fotosUrls.length - 1));
      },
      error: err => {
        this.ejecutando.set(false);
        this.notify.fromHttpError(err, 'No se pudo eliminar la foto');
      },
    });
  }

  async compartirWhatsApp(tarea: TareaCampoDto): Promise<void> {
    this.compartiendoId.set(tarea.id);
    try {
      const share = await firstValueFrom(this.campoService.createShareLink(tarea.id));
      const files = await this.prepareShareFiles(share);

      if (files.length > 0 && navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({
          title: `Fotos de ${share.vehicle}`,
          text: share.shareText,
          files,
        });
      } else {
        if (files.length > 0) this.downloadShareFiles(files);
        window.open(`https://wa.me/?text=${encodeURIComponent(share.shareText)}`, '_blank', 'noopener,noreferrer');
        this.notify.info('Fotos descargadas. Adjunta los archivos en WhatsApp y envía también el enlace.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        this.notify.fromHttpError(error, 'No se pudieron preparar las fotos para WhatsApp');
    } finally {
      this.compartiendoId.set(null);
    }
  }

  async copiarEnlace(tarea: TareaCampoDto): Promise<void> {
    this.compartiendoId.set(tarea.id);
    try {
      const share = await firstValueFrom(this.campoService.createShareLink(tarea.id));
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(share.downloadUrl);
        this.notify.success('Enlace de descarga copiado. Es válido durante 7 días.');
      } else {
        this.notify.notify({
          severity: 'info',
          title: 'Enlace de descarga',
          message: 'Copia este enlace y compártelo con el cliente. Es válido durante 7 días.',
          detail: share.downloadUrl,
          forceModal: true,
        });
      }
    } catch (error) {
      this.notify.fromHttpError(error, 'No se pudo copiar el enlace de descarga');
    } finally {
      this.compartiendoId.set(null);
    }
  }

  private async prepareShareFiles(share: CampoShareResponse): Promise<File[]> {
    const files: File[] = [];
    for (const [index, url] of share.photoUrls.entries()) {
      try {
        const response = await fetch(this.fileUrl(url));
        if (!response.ok) continue;
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpeg';
        files.push(new File([blob], `foto-${index + 1}.${extension}`, { type: blob.type || 'image/jpeg' }));
      } catch {
        // Si el almacenamiento no permite CORS, el enlace sigue funcionando como respaldo.
      }
    }
    return files;
  }

  private downloadShareFiles(files: File[]): void {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  onLightboxTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  onLightboxTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0]?.clientX ?? this.touchStartX;
    const diff = endX - this.touchStartX;
    if (Math.abs(diff) < 42) return;
    diff < 0 ? this.nextPhoto() : this.prevPhoto();
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
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
