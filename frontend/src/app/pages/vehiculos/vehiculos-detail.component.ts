import { Component, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VehiculoService,
  VehiculoDetailDto,
  UpdateInventarioRequest,
} from '../../services/vehiculo.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { VehiculoFormDialogComponent } from './vehiculo-form-dialog.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehiculos-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, VehiculoFormDialogComponent],
  template: `
    <div style="font-family: var(--font-body);">
      @if (vehiculo(); as v) {
        <!-- Back -->
        <a
          routerLink="/vehiculos"
          class="inline-flex items-center gap-1.5 text-[13px] text-[#6B717F] hover:text-[#1E2330] transition-colors duration-150 mb-4 no-underline"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Vehículos
        </a>

        <!-- Header -->
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 stagger-item"
        >
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
              {{ v.fechaRegistro | date: 'dd/MM/yyyy' }}
            </p>
            <h1
              class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none mb-1 font-mono-data"
            >
              {{ v.vin }}
            </h1>
            @if (v.marcaNombre) {
              <p class="text-[14px] text-[#6B717F]">
                {{ v.marcaNombre }}{{ v.modeloNombre ? ' · ' + v.modeloNombre : ''
                }}{{ v.anno ? ' · ' + v.anno : '' }}
              </p>
            }
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="router.navigate(['/cotizaciones/nueva'], { queryParams: { vehiculoId: v.id } })"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
              style="background: #0D1017; color: #fff;"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-3.5 h-3.5 stroke-2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                />
              </svg>
              Cotizar
            </button>
            @if (canEditVehicle()) {
            <button
              type="button"
              (click)="formDialog.openForEdit(v)"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 no-underline"
              style="background: #F3F4F6; color: #4B5162; border: 1px solid #E4E7EC;"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-3.5 h-3.5 stroke-2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Editar
            </button>
            }
            @if (canDeleteVehicle()) {
            <button
              (click)="deleteVehiculo()"
              [disabled]="deleting()"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
              style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA;"
            >
              @if (deleting()) {
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              } @else {
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="w-3.5 h-3.5 stroke-2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              }
              Eliminar
            </button>
            }
          </div>
        </div>

        <!-- Info grid -->
        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-item"
          style="animation-delay: 40ms;"
        >
          @for (item of infoItems; track item.label) {
            <div class="card-elevated rounded-2xl p-5">
              <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1">
                {{ item.label }}
              </p>
              <p class="text-[14px] font-medium text-[#1E2330] font-mono-data">{{ item.value }}</p>
            </div>
          }
        </div>

        <!-- Badges -->
        <div
          class="flex flex-wrap items-center gap-2 mb-6 stagger-item"
          style="animation-delay: 60ms;"
        >
          @if (v.tieneTramiteActivo) {
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style="background: #FEF3C7; color: #78350F;"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
              Trámite activo
            </span>
          }
          @if (v.cumplioRequisitos) {
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style="background: #DCFCE7; color: #14532D;"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              Requisitos cumplidos
            </span>
          }
          @if (v.tieneSelloAduanal) {
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style="background: #DBEAFE; color: #1E3A8A;"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
              Sello aduanal
            </span>
          }
        </div>

        <!-- Fotos -->
        <div
          class="card-elevated rounded-2xl overflow-hidden mb-6 stagger-item"
          style="animation-delay: 70ms;"
        >
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
            <span class="text-[13px] font-semibold text-[#1E2330]">Fotos del vehiculo</span>
            <span class="text-[11px] text-[#9EA3AE] font-mono-data">{{
              v.fotosUrls.length
            }}</span>
          </div>

          @if (v.fotosUrls.length === 0) {
            <div class="p-8 text-center">
              <p class="text-[13px] text-[#9EA3AE]">Sin fotos registradas</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-5">
              @for (foto of v.fotosUrls; track foto; let i = $index) {
                <button
                  type="button"
                  (click)="openLightbox(i)"
                  class="group block aspect-[4/3] overflow-hidden rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] p-0"
                  aria-label="Ver foto del vehiculo en pantalla completa"
                >
                  <img
                    [src]="fileUrl(foto)"
                    alt="Foto del vehiculo"
                    class="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </button>
              }
            </div>
          }
        </div>

        <!-- Photo lightbox (paridad con el zoom InteractiveViewer de Flutter) -->
        @if (lightboxOpen()) {
          <div class="veh-lightbox" (click)="closeLightbox()">
            <div class="veh-lightbox__top" (click)="$event.stopPropagation()">
              <div>
                <strong>{{ v.marcaNombre }} {{ v.modeloNombre }}</strong>
                <span>{{ v.vin }}</span>
              </div>
              <button type="button" class="veh-lightbox__close" (click)="closeLightbox()" aria-label="Cerrar">✕</button>
            </div>
            <div class="veh-lightbox__body" (click)="$event.stopPropagation()">
              <img [src]="fileUrl(v.fotosUrls[lightboxIndex()])" alt="Foto del vehículo" />
              @if (v.fotosUrls.length > 1) {
                <button type="button" class="veh-lightbox__nav veh-lightbox__nav--prev" (click)="prevFoto(v)" aria-label="Anterior">‹</button>
                <button type="button" class="veh-lightbox__nav veh-lightbox__nav--next" (click)="nextFoto(v)" aria-label="Siguiente">›</button>
              }
            </div>
            <div class="veh-lightbox__thumbs" (click)="$event.stopPropagation()">
              @for (foto of v.fotosUrls; track foto; let i = $index) {
                <button
                  type="button"
                  class="veh-lightbox__thumb"
                  [class.veh-lightbox__thumb--active]="i === lightboxIndex()"
                  (click)="lightboxIndex.set(i)"
                >
                  <img [src]="fileUrl(foto)" alt="" />
                </button>
              }
            </div>
          </div>
        }

        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-item"
          style="animation-delay: 80ms;"
        >
          <!-- Cliente card -->
          <div class="card-elevated rounded-2xl p-5">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-2">
              Cliente
            </p>
            @if (v.clienteApodo) {
              <p class="text-[14px] font-semibold text-[#0D1017]">{{ v.clienteApodo }}</p>
            } @else if (v.clienteTemporalNombre) {
              <p class="text-[14px] font-semibold text-[#9A3412]">{{ v.clienteTemporalNombre }}</p>
              <p class="mt-1 text-[12px] text-[#C2410C]">Cliente temporal pendiente de validación</p>
              @if (v.clienteTemporalId && auth.can('CLIENTES_VER')) {
                <button
                  type="button"
                  (click)="openTemporalReview(v.clienteTemporalId)"
                  class="mt-2 text-[12px] font-semibold text-[#A31820] hover:underline"
                >
                  Abrir revisión en Clientes →
                </button>
              }
            } @else {
              <p class="text-[14px] text-[#9EA3AE]">Sin cliente asignado</p>
            }
          </div>

          <!-- Value card -->
          <div class="card-elevated rounded-2xl p-5">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-2">
              Valor factura
            </p>
            @if (v.valorFactura) {
              <p class="text-[14px] font-semibold font-mono-data">
                {{ v.moneda }} {{ v.valorFactura.toFixed(2) }}
              </p>
            } @else {
              <p class="text-[14px] text-[#9EA3AE]">—</p>
            }
          </div>
        </div>

        <!-- Inventory management -->
        <div
          class="card-elevated rounded-2xl overflow-hidden mt-4 stagger-item"
          style="animation-delay: 100ms;"
        >
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
            <span class="text-[13px] font-semibold text-[#1E2330]">Inventario</span>
            @if (!canEditVehicle()) {
              <span class="text-[11px] text-[#9EA3AE]">Solo lectura</span>
            }
          </div>
          <div class="p-5">
            @if (inventarioSaved()) {
              <div
                class="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[13px] mb-4"
                style="background: #DCFCE7; border: 1px solid #BBF7D0; color: #14532D;"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="w-4 h-4 shrink-0 stroke-2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Inventario actualizado correctamente
              </div>
            }
            <form (ngSubmit)="saveInventario()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="col-span-2 sm:col-span-1">
                <label
                  class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5"
                  >Ubicación actual</label
                >
                <input
                  type="text"
                  [(ngModel)]="invForm.ubicacionActual"
                  [disabled]="!canEditVehicle()"
                  name="ubicacionActual"
                  placeholder="Ej. Patio principal"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label
                  class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5"
                  >Fecha pedimento próforma</label
                >
                <input
                  type="date"
                  [ngModel]="
                    invForm.fechaPedimentoProforma
                      ? (invForm.fechaPedimentoProforma | date: 'yyyy-MM-dd')
                      : ''
                  "
                  (ngModelChange)="
                    invForm.fechaPedimentoProforma = $event ? $event + 'T00:00:00Z' : null
                  "
                  [disabled]="!canEditVehicle()"
                  name="fechaPedimentoProforma"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 flex flex-wrap items-center gap-4 pb-1">
                <label class="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="invForm.cumplioRequisitos"
                    [disabled]="!canEditVehicle()"
                    name="cumplioRequisitos"
                    class="w-4 h-4 rounded border-[#C9C5CA] text-[#C61D26] focus:ring-[#C61D26]"
                  />
                  <span class="text-[13px] text-[#1E2330]">Cumplió requisitos</span>
                </label>
                <label class="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="invForm.tieneSelloAduanal"
                    [disabled]="!canEditVehicle()"
                    name="tieneSelloAduanal"
                    class="w-4 h-4 rounded border-[#C9C5CA] text-[#C61D26] focus:ring-[#C61D26]"
                  />
                  <span class="text-[13px] text-[#1E2330]">Tiene sello aduanal</span>
                </label>
              </div>
              <div class="col-span-2 flex justify-end pt-2 border-t border-[#E4E7EC]">
                <button
                  type="submit"
                  [disabled]="savingInv() || !canEditVehicle()"
                  class="btn-primary px-5 py-2.5 rounded-xl text-[13px]"
                >
                  @if (savingInv()) {
                    <span class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        />
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Guardando…
                    </span>
                  } @else {
                    Actualizar inventario
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Trámites history -->
        <div
          class="card-elevated rounded-2xl overflow-hidden mt-4 stagger-item"
          style="animation-delay: 120ms;"
        >
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
            <span class="text-[13px] font-semibold text-[#1E2330]">Historial de trámites</span>
            <span class="text-[11px] text-[#9EA3AE] font-mono-data">{{
              v.historialTramites.length
            }}</span>
          </div>
          @if (v.historialTramites.length === 0) {
            <div class="p-8 text-center">
              <p class="text-[13px] text-[#9EA3AE]">Sin trámites registrados</p>
            </div>
          } @else {
            <div class="divide-y divide-[#F3F4F6]">
              @for (t of v.historialTramites; track t.id) {
                <div class="flex items-center justify-between px-5 py-3">
                  <div>
                    <p class="text-[13.5px] font-semibold text-[#0D1017]">
                      {{ t.numeroConsecutivo }}
                    </p>
                    <p class="text-[12px] text-[#6B717F]">
                      {{ t.fechaCreacion | date: 'dd/MM/yyyy' }}
                    </p>
                  </div>
                  <span
                    class="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    [style]="statusStyle(t.estadoLogistico)"
                    >{{ t.estadoLogistico }}</span
                  >
                </div>
              }
            </div>
          }
        </div>
      } @else if (loading()) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item">
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <svg class="w-6 h-6 text-[#9EA3AE] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p class="text-[14px] text-[#9EA3AE]">Cargando vehículo…</p>
          </div>
        </div>
      } @else {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item">
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <div class="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-4">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-5 h-5 stroke-2 text-[#DC2626]"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">Vehículo no encontrado</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">{{ error() }}</p>
            <a
              routerLink="/vehiculos"
              class="btn-primary px-4 py-2 rounded-xl text-[13px] no-underline"
              >Volver a vehículos</a
            >
          </div>
        </div>
      }
      <app-vehiculo-form-dialog #formDialog (saved)="loadVehiculo()" />
    </div>
  `,
  styles: [
    `
      /* ─── Photo lightbox (paridad con inventario_page.dart) ─────────── */
      .veh-lightbox {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: rgba(2, 6, 23, 0.92);
        display: flex;
        flex-direction: column;
      }
      .veh-lightbox__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: max(16px, env(safe-area-inset-top, 16px)) 16px 12px;
        color: white;
      }
      .veh-lightbox__top strong {
        display: block;
        font-size: 14px;
        font-weight: 800;
      }
      .veh-lightbox__top span {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 2px;
      }
      .veh-lightbox__close {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .veh-lightbox__body {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 0;
        padding: 0 12px;
      }
      .veh-lightbox__body img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
      }
      .veh-lightbox__nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: none;
        background: rgba(255, 255, 255, 0.14);
        color: white;
        font-size: 22px;
        cursor: pointer;
        display: grid;
        place-items: center;
      }
      .veh-lightbox__nav--prev {
        left: 8px;
      }
      .veh-lightbox__nav--next {
        right: 8px;
      }
      .veh-lightbox__thumbs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 12px 16px max(16px, env(safe-area-inset-bottom, 16px));
      }
      .veh-lightbox__thumb {
        flex-shrink: 0;
        width: 52px;
        height: 52px;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid transparent;
        padding: 0;
        cursor: pointer;
        opacity: 0.55;
      }
      .veh-lightbox__thumb--active {
        border-color: #c61d26;
        opacity: 1;
      }
      .veh-lightbox__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    `,
  ],
})
export class VehiculosDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(VehiculoService);
  private notifications = inject(NotificationService);
  auth = inject(AuthService);
  router = inject(Router);

  vehiculo = signal<VehiculoDetailDto | null>(null);
  loading = signal(true);
  error = signal('');
  deleting = signal(false);
  savingInv = signal(false);
  inventarioSaved = signal(false);
  lightboxOpen = signal(false);
  lightboxIndex = signal(0);
  private currentId = '';

  canEditVehicle(): boolean {
    return this.auth.canAny('VEHICULOS_EDITAR', 'TRAMITES_EDITAR', 'CAMPO_USAR');
  }

  canDeleteVehicle(): boolean {
    return this.auth.canAny('VEHICULOS_BORRAR', 'TRAMITES_BORRAR');
  }

  openTemporalReview(temporalId: string): void {
    this.router.navigate(['/clientes'], { queryParams: { clienteTemporalId: temporalId } });
  }

  infoItems: { label: string; value: string }[] = [];

  invForm: UpdateInventarioRequest = {
    ubicacionActual: null,
    cumplioRequisitos: false,
    tieneSelloAduanal: false,
    fechaPedimentoProforma: null,
  };

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) {
        this.currentId = '';
        this.vehiculo.set(null);
        this.error.set('ID no válido');
        this.loading.set(false);
        return;
      }

      if (id === this.currentId) return;
      this.currentId = id;
      this.loadVehiculo(id);
    });
  }

  loadVehiculo(id: string = this.currentId): void {
    if (!id) return;
    this.loading.set(true);
    this.vehiculo.set(null);
    this.error.set('');
    this.service.getById(id).subscribe({
      next: v => {
        this.vehiculo.set(v);
        this.infoItems = [
          { label: 'VIN corto', value: v.vinCorto || '—' },
          { label: 'Cilindrada', value: v.cilindradaCm3 ? `${v.cilindradaCm3} cm³` : '—' },
          { label: 'Categoría', value: v.categoria || '—' },
          { label: 'Fracción arancelaria', value: v.fraccionArancelaria || '—' },
          { label: 'Color', value: v.color || '—' },
          { label: 'No. Motor', value: v.numMotor || '—' },
          {
            label: 'Ingreso patio',
            value: v.fechaIngresoPatio
              ? new Date(v.fechaIngresoPatio).toLocaleDateString('es-MX')
              : '—',
          },
          { label: 'Ubicación', value: v.ubicacionActual || '—' },
        ];
        this.invForm = {
          ubicacionActual: v.ubicacionActual,
          cumplioRequisitos: v.cumplioRequisitos,
          tieneSelloAduanal: v.tieneSelloAduanal,
          fechaPedimentoProforma: v.fechaPedimentoProforma || null,
        };
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'Error al cargar vehículo');
        this.loading.set(false);
      },
    });
  }

  saveInventario(): void {
    if (!this.canEditVehicle()) return;
    const id = this.currentId;
    if (!id) return;
    this.savingInv.set(true);
    this.inventarioSaved.set(false);
    this.service.updateInventario(id, this.invForm).subscribe({
      next: () => {
        this.savingInv.set(false);
        this.inventarioSaved.set(true);
        setTimeout(() => this.inventarioSaved.set(false), 3000);
      },
      error: err => {
        this.savingInv.set(false);
        this.notifications.fromHttpError(err, 'Error al actualizar inventario');
      },
    });
  }

  async deleteVehiculo(): Promise<void> {
    const v = this.vehiculo();
    if (!v) return;
    const confirmed = await this.notifications.confirm({
      title: 'Eliminar vehiculo',
      message: `Eliminar vehiculo VIN "${v.vin}"? Esta accion no se puede deshacer.`,
      confirmText: 'Eliminar',
    });
    if (!confirmed) return;

    this.deleting.set(true);
    this.service.delete(v.id).subscribe({
      next: () => {
        this.notifications.success('Vehiculo eliminado correctamente.');
        this.router.navigate(['/vehiculos']);
      },
      error: err => {
        this.deleting.set(false);
        this.notifications.fromHttpError(err, 'Error al eliminar vehiculo');
      },
    });
  }

  statusStyle(estatus: string): Record<string, string> {
    const map: Record<string, { bg: string; color: string }> = {
      ACTIVO: { bg: '#DCFCE7', color: '#14532D' },
      PENDIENTE: { bg: '#FEF3C7', color: '#78350F' },
      FINALIZADO: { bg: '#DBEAFE', color: '#1E3A8A' },
      CANCELADO: { bg: '#FEE2E2', color: '#7F1D1D' },
    };
    const s = map[estatus] || { bg: '#F3F4F6', color: '#4B5162' };
    return { background: s.bg, color: s.color };
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  nextFoto(v: VehiculoDetailDto): void {
    this.lightboxIndex.set((this.lightboxIndex() + 1) % v.fotosUrls.length);
  }

  prevFoto(v: VehiculoDetailDto): void {
    this.lightboxIndex.set((this.lightboxIndex() - 1 + v.fotosUrls.length) % v.fotosUrls.length);
  }
}
