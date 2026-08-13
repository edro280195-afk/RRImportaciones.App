import { ChangeDetectionStrategy, Component, HostListener, signal, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { VehiculoService, VehiculoListDto } from '../../services/vehiculo.service';
import { VehiculoFormDialogComponent } from './vehiculo-form-dialog.component';
import { ChoferEntregaDto, EntregaLinkResponseDto, EntregaTareaService } from '../../services/entrega-tarea.service';
import { CampoService, CampoShareResponse } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';

const MAX_NATIVE_SHARE_BYTES = 100 * 1024 * 1024;
const SHAREABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface PreparedShareFiles {
  files: File[];
  failedCount: number;
  exceededSizeLimit: boolean;
}

@Component({
  selector: 'app-vehiculos-list',
  standalone: true,
  imports: [FormsModule, DatePipe, VehiculoFormDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="font-family: var(--font-body);">
      <!-- Page head -->
      <div class="flex items-center justify-between mb-6 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
            {{ total() }} registros
          </p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">
            Vehículos
          </h1>
        </div>
        <button
          (click)="formDialog.open()"
          class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo vehículo
        </button>
      </div>

      <!-- Filters -->
      <div
        class="flex items-center gap-3 mb-5 stagger-item flex-wrap"
        style="animation-delay: 40ms;"
      >
        <div class="relative flex-1 max-w-[280px]">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9EA3AE] stroke-2 pointer-events-none"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            [(ngModel)]="search"
            (input)="onSearch()"
            placeholder="Buscar por VIN, marca o modelo…"
            class="w-full pl-9 pr-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
          />
        </div>
        <div class="relative flex-1 max-w-[220px]">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9EA3AE] stroke-2 pointer-events-none"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <input
            type="text"
            [(ngModel)]="clienteFiltro"
            (input)="onClientFilter()"
            placeholder="Filtrar por cliente…"
            class="w-full pl-9 pr-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
          />
        </div>
        <button
          (click)="enPatio.set(!enPatio()); loadVehiculos()"
          class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium transition-all duration-150"
          [style]="
            enPatio()
              ? 'background: #0D1017; color: #fff;'
              : 'background: #F3F4F6; color: #4B5162; border: 1px solid #E4E7EC;'
          "
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          En patio
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay: 80ms;"
        >
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
            <p class="text-[14px] text-[#9EA3AE]">Cargando vehículos…</p>
          </div>
        </div>
      } @else if (vehiculos().length === 0) {
        <div
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay: 80ms;"
        >
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <div class="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-5 h-5 stroke-2 text-[#9EA3AE]"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m8 1H9m4 0h2m4-8h-4l-1-4H7l-1 3H2"
                />
              </svg>
            </div>
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">No hay vehículos</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">Registra el primer vehículo para empezar.</p>
            <button
              (click)="formDialog.open()"
              class="btn-primary px-4 py-2 rounded-xl text-[13px]"
            >
              Nuevo vehículo
            </button>
          </div>
        </div>
      } @else if (isMobile()) {
        <!-- ─────────── Mobile: tarjetas (paridad con inventario_page.dart) ─────────── -->
        <div class="veh-card-list stagger-item" style="animation-delay: 80ms;">
          <div class="veh-card-list__summary">
            <span>{{ vehiculos().length }} de {{ total() }} vehículos</span>
            @if (sinClienteCount() > 0) {
              <span class="veh-pill veh-pill--danger">{{ sinClienteCount() }} sin cliente</span>
            }
          </div>

          @for (v of vehiculos(); track v.id) {
            <div class="veh-card" [class.veh-card--alert]="!v.clienteApodo">
              <div class="veh-card__head" (click)="router.navigate(['/vehiculos', v.id])">
                <div class="veh-card__title">
                  <p class="veh-card__name">{{ vehicleLabel(v) }}</p>
                  <p class="veh-card__vin">{{ v.vinCorto || v.vin }}</p>
                </div>
                @if (v.clienteApodo) {
                  <span class="veh-card__cliente">{{ v.clienteApodo }}</span>
                } @else {
                  <span class="veh-pill veh-pill--danger">Sin cliente</span>
                }
              </div>

              <div class="veh-card__divider"></div>

              <div class="veh-card__info">
                <div class="veh-info-chip">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <div>
                    <span>Ingreso</span>
                    <p>{{ v.fechaIngresoPatio ? (v.fechaIngresoPatio | date: 'dd/MM/yyyy') : '—' }}</p>
                  </div>
                </div>
                <div class="veh-info-chip">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <div>
                    <span>Ubicación</span>
                    <p>{{ v.ubicacionActual || '—' }}</p>
                  </div>
                </div>
              </div>

              <div class="veh-card__checkpoints">
                <span class="veh-dot" [class.veh-dot--on]="v.tieneTramiteActivo" style="--dot-color:#D97706" title="Trámite activo"></span>
                <span class="veh-dot" [class.veh-dot--on]="v.cumplioRequisitos" style="--dot-color:#16A34A" title="Cumplió requisitos"></span>
                <span class="veh-dot" [class.veh-dot--on]="v.tieneSelloAduanal" style="--dot-color:#2563EB" title="Sello aduanal"></span>
              </div>

              <div class="veh-card__actions">
                <button
                  type="button"
                  class="veh-btn veh-btn--ghost"
                  [disabled]="v.fotosUrls.length === 0"
                  (click)="openFotos(v)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
                  {{ v.fotosUrls.length > 0 ? 'Fotos (' + v.fotosUrls.length + ')' : 'Sin fotos' }}
                </button>
                <button
                  type="button"
                  class="veh-btn veh-btn--share"
                  [disabled]="v.fotosUrls.length === 0"
                  (click)="$event.stopPropagation(); openPhotoShare(v)"
                >
                  Compartir
                </button>
                <button
                  type="button"
                  class="veh-btn veh-btn--delivery"
                  [disabled]="!v.tieneTramiteActivo"
                  (click)="$event.stopPropagation(); openAssign(v)"
                >
                  Asignar entrega
                </button>
                <button
                  type="button"
                  class="veh-btn veh-btn--primary"
                  (click)="cotizar(v)"
                >
                  Cotizar
                </button>
              </div>
            </div>
          }

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="veh-pagination">
              <button (click)="goToPage(page() - 1)" [disabled]="page() <= 1" class="veh-page-btn">Anterior</button>
              <span>Página {{ page() }} de {{ totalPages() }}</span>
              <button (click)="goToPage(page() + 1)" [disabled]="page() >= totalPages()" class="veh-page-btn">Siguiente</button>
            </div>
          }
        </div>

        @if (lightboxVehiculo(); as lv) {
          <div class="veh-lightbox" (click)="closeFotos()">
            <div class="veh-lightbox__top" (click)="$event.stopPropagation()">
              <div>
                <strong>{{ vehicleLabel(lv) }}</strong>
                <span>{{ lv.vin }}</span>
              </div>
              <button type="button" class="veh-lightbox__close" (click)="closeFotos()" aria-label="Cerrar">✕</button>
            </div>

            <div class="veh-lightbox__body" (click)="$event.stopPropagation()">
              <img [src]="fileUrl(lv.fotosUrls[lightboxIndex()])" alt="Foto del vehículo" />
              @if (lv.fotosUrls.length > 1) {
                <button type="button" class="veh-lightbox__nav veh-lightbox__nav--prev" (click)="prevFoto(lv)" aria-label="Anterior">‹</button>
                <button type="button" class="veh-lightbox__nav veh-lightbox__nav--next" (click)="nextFoto(lv)" aria-label="Siguiente">›</button>
              }
            </div>

            <div class="veh-lightbox__thumbs" (click)="$event.stopPropagation()">
              @for (foto of lv.fotosUrls; track foto; let i = $index) {
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
      } @else {
        <div
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay: 80ms;"
        >
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr
                  class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]"
                >
                  <th
                    class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('vin')"
                  >
                    VIN <span class="text-[9px] ml-0.5">{{ sortIcon('vin') }}</span>
                  </th>
                  <th class="text-left px-5 py-3.5 font-medium">VIN corto</th>
                  <th
                    class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('marca')"
                  >
                    Marca <span class="text-[9px] ml-0.5">{{ sortIcon('marca') }}</span>
                  </th>
                  <th
                    class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('modelo')"
                  >
                    Modelo <span class="text-[9px] ml-0.5">{{ sortIcon('modelo') }}</span>
                  </th>
                  <th
                    class="text-center px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('anno')"
                  >
                    Año <span class="text-[9px] ml-0.5">{{ sortIcon('anno') }}</span>
                  </th>
                  <th
                    class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('cliente')"
                  >
                    Cliente <span class="text-[9px] ml-0.5">{{ sortIcon('cliente') }}</span>
                  </th>
                  <th
                    class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('ingreso')"
                  >
                    Ingreso patio <span class="text-[9px] ml-0.5">{{ sortIcon('ingreso') }}</span>
                  </th>
                  <th
                    class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017] transition-colors"
                    (click)="toggleSort('ubicacion')"
                  >
                    Ubicación <span class="text-[9px] ml-0.5">{{ sortIcon('ubicacion') }}</span>
                  </th>
                  <th class="text-center px-5 py-3.5 font-medium">Fotos</th>
                  <th class="text-center px-5 py-3.5 font-medium">Estado</th>
                  <th class="text-right px-5 py-3.5 font-medium">Entrega</th>
                </tr>
              </thead>
              <tbody>
                @for (v of vehiculos(); track v.id) {
                  <tr
                    (click)="router.navigate(['/vehiculos', v.id])"
                    class="text-[13.5px] text-[#1E2330] border-b border-[#F3F4F6] cursor-pointer transition-all duration-100 hover:bg-[#FAFBFC]"
                    style="animation: fadeIn 300ms ease-out;"
                  >
                    <td class="px-5 py-3.5 font-mono-data text-[13px] font-semibold text-[#0D1017]">
                      {{ v.vin }}
                    </td>
                    <td class="px-5 py-3.5 font-mono-data text-[13px] text-[#6B717F]">
                      {{ v.vinCorto || '—' }}
                    </td>
                    <td class="px-5 py-3.5">{{ v.marcaNombre || '—' }}</td>
                    <td class="px-5 py-3.5 text-[#6B717F]">{{ v.modeloNombre || '—' }}</td>
                    <td class="px-5 py-3.5 text-center font-mono-data">{{ v.anno || '—' }}</td>
                    <td class="px-5 py-3.5">
                      @if (v.clienteApodo) {
                        <span class="font-semibold">{{ v.clienteApodo }}</span>
                      } @else {
                        <span class="text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-[#6B717F] font-mono-data">
                      {{ v.fechaIngresoPatio ? (v.fechaIngresoPatio | date: 'dd/MM/yyyy') : '—' }}
                    </td>
                    <td class="px-5 py-3.5">
                      @if (v.ubicacionActual) {
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-medium"
                          style="background: #F3F4F6; color: #4B5162;"
                          >{{ v.ubicacionActual }}</span
                        >
                      } @else {
                        <span class="text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        class="inline-flex items-center px-3 py-2 rounded-lg text-[12px] font-semibold text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] disabled:opacity-40 disabled:cursor-not-allowed"
                        [disabled]="v.fotosUrls.length === 0"
                        (click)="$event.stopPropagation(); openPhotoShare(v)"
                      >
                        Compartir
                      </button>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <div class="flex items-center justify-center gap-1">
                        @if (v.tieneTramiteActivo) {
                          <span
                            class="w-2 h-2 rounded-full bg-[#D97706] inline-block"
                            title="Trámite activo"
                          ></span>
                        }
                        @if (v.cumplioRequisitos) {
                          <span
                            class="w-2 h-2 rounded-full bg-[#16A34A] inline-block"
                            title="Requisitos cumplidos"
                          ></span>
                        }
                        @if (v.tieneSelloAduanal) {
                          <span
                            class="w-2 h-2 rounded-full bg-[#2563EB] inline-block"
                            title="Sello aduanal"
                          ></span>
                        }
                        @if (
                          !v.tieneTramiteActivo && !v.cumplioRequisitos && !v.tieneSelloAduanal
                        ) {
                          <span class="text-[#9EA3AE]">—</span>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        class="inline-flex items-center px-3 py-2 rounded-lg text-[12px] font-semibold text-[#A31820] bg-[#FFF1F1] border border-[#FFC5C5] disabled:opacity-40 disabled:cursor-not-allowed"
                        [disabled]="!v.tieneTramiteActivo"
                        (click)="$event.stopPropagation(); openAssign(v)"
                      >
                        Asignar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC]">
              <span class="text-[12.5px] text-[#9EA3AE]">
                Página {{ page() }} de {{ totalPages() }}
              </span>
              <div class="flex items-center gap-1.5">
                <button
                  (click)="goToPage(page() - 1)"
                  [disabled]="page() <= 1"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Anterior
                </button>
                @for (p of pages(); track p) {
                  <button
                    (click)="goToPage(p)"
                    class="w-8 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150"
                    [style]="p === page() ? 'background: #0D1017; color: #fff;' : 'color: #6B717F;'"
                    [class.hover:bg-[#F3F4F6]]="p !== page()"
                  >
                    {{ p }}
                  </button>
                }
                <button
                  (click)="goToPage(page() + 1)"
                  [disabled]="page() >= totalPages()"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (showAssignModal()) {
      <div class="delivery-modal-backdrop" (click)="closeAssign()">
        <section class="delivery-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-modal-title" (click)="$event.stopPropagation()">
          @if (assignResult(); as result) {
            <header class="delivery-modal__header">
              <div>
                <span class="delivery-modal__eyebrow">ENLACE LISTO</span>
                <h2 id="delivery-modal-title">Entrega preparada</h2>
              </div>
              <button type="button" class="delivery-modal__close" (click)="closeAssign()" aria-label="Cerrar">×</button>
            </header>
            <div class="delivery-modal__body">
              <div class="delivery-success">
                <div class="delivery-success__icon">✓</div>
                <div>
                  <strong>{{ result.tarea.vehiculoResumen }}</strong>
                  <p>
                    @if (result.tieneChoferAsignado) {
                      Enlace para {{ result.tarea.choferNombre || 'el chofer seleccionado' }}.
                    } @else {
                      Enlace para que un chofer tome esta entrega.
                    }
                  </p>
                </div>
              </div>
              <label class="delivery-field">
                <span>Enlace para compartir</span>
                <input [value]="result.enlace" readonly (focus)="selectLinkInput($event)" />
              </label>
              <p class="delivery-note">El enlace no contiene la contraseña. El chofer deberá ingresar o crear su PIN.</p>
            </div>
            <footer class="delivery-modal__footer delivery-modal__footer--stack">
              <button type="button" class="delivery-primary" (click)="shareLink(result)">Compartir por WhatsApp</button>
              <button type="button" class="delivery-secondary" (click)="copyLink(result.enlace)">Copiar enlace</button>
              <button type="button" class="delivery-link-button" (click)="regenerateLink(result.tarea.id)">Generar otro enlace</button>
            </footer>
          } @else {
            @if (assignVehicle(); as vehicle) {
              <header class="delivery-modal__header">
              <div>
                <span class="delivery-modal__eyebrow">ASIGNAR ENTREGA</span>
                <h2 id="delivery-modal-title">{{ vehicleLabel(vehicle) }}</h2>
                <p>VIN {{ vehicle.vin }}</p>
              </div>
              <button type="button" class="delivery-modal__close" (click)="closeAssign()" aria-label="Cerrar">×</button>
            </header>
            <div class="delivery-modal__body">
              <div class="delivery-mode-list">
                <button type="button" [class.delivery-mode--active]="assignMode() === 'assigned'" (click)="assignMode.set('assigned')">
                  <strong>Asignar a un chofer</strong>
                  <span>El enlace abrirá esta entrega directamente para esa persona.</span>
                </button>
                <button type="button" [class.delivery-mode--active]="assignMode() === 'open'" (click)="assignMode.set('open')">
                  <strong>Dejar disponible para tomar</strong>
                  <span>El chofer elegirá su nombre y tomará la entrega desde el enlace.</span>
                </button>
              </div>

              @if (assignMode() === 'assigned') {
                <label class="delivery-field">
                  <span>¿A quién se la asignas?</span>
                  <select [ngModel]="selectedDriverId()" (ngModelChange)="selectedDriverId.set($event)">
                    <option value="">Selecciona un chofer</option>
                    @for (driver of drivers(); track driver.id) {
                      <option [value]="driver.id">{{ driver.nombre }} {{ driver.apellidos || '' }}</option>
                    }
                  </select>
                </label>
                @if (driversLoading()) {
                  <p class="delivery-note">Cargando choferes…</p>
                } @else if (drivers().length === 0) {
                  <p class="delivery-warning">No hay usuarios con rol de chofer, campo o yardero activos.</p>
                }
              }

              <label class="delivery-field">
                <span>Ubicación de entrega (opcional)</span>
                <input [ngModel]="assignLocation()" (ngModelChange)="assignLocation.set($event)" maxlength="300" placeholder="Domicilio o punto de entrega" />
              </label>
              <label class="delivery-field">
                <span>Nota para el chofer (opcional)</span>
                <textarea [ngModel]="assignNotes()" (ngModelChange)="assignNotes.set($event)" maxlength="500" rows="3" placeholder="Ej. Entregar en recepción."></textarea>
              </label>
            </div>
            <footer class="delivery-modal__footer">
              <button type="button" class="delivery-secondary" (click)="closeAssign()">Cancelar</button>
              <button type="button" class="delivery-primary" [disabled]="assigning() || (assignMode() === 'assigned' && !selectedDriverId())" (click)="confirmAssign(vehicle)">
                {{ assigning() ? 'Generando enlace…' : 'Asignar y generar enlace' }}
              </button>
            </footer>
            }
          }
        </section>
      </div>
    }

    @if (showPhotoShareModal()) {
      <div class="delivery-modal-backdrop" (click)="closePhotoShare()">
        <section class="delivery-modal" role="dialog" aria-modal="true" aria-labelledby="photo-share-modal-title" (click)="$event.stopPropagation()">
          <header class="delivery-modal__header">
            <div>
              <span class="delivery-modal__eyebrow">COMPARTIR FOTOS</span>
              <h2 id="photo-share-modal-title">Enviar a cliente o socio</h2>
              @if (shareVehicle(); as vehicle) {
                <p>{{ vehicleLabel(vehicle) }} · VIN {{ vehicle.vin }}</p>
              }
            </div>
            <button type="button" class="delivery-modal__close" (click)="closePhotoShare()" aria-label="Cerrar">×</button>
          </header>

          <div class="delivery-modal__body">
            @if (photoShareLoading()) {
              <div class="photo-share-loading">
                <div class="photo-share-spinner"></div>
                <strong>Preparando la galería privada…</strong>
                <span>Un momento, por favor.</span>
              </div>
            } @else {
              @if (photoShare(); as share) {
                <div class="delivery-success">
                  <div class="delivery-success__icon">✓</div>
                  <div>
                    <strong>{{ share.photoUrls.length }} fotos listas</strong>
                    <p>En dispositivos compatibles se abrirá el menú nativo para elegir WhatsApp u otra aplicación.</p>
                  </div>
                </div>
              }
            }
          </div>

          <footer class="delivery-modal__footer delivery-modal__footer--stack">
            @if (photoShare(); as share) {
              <button type="button" class="photo-share-action photo-share-action--primary" [disabled]="photoSharing()" (click)="sharePhotosByWhatsApp(share)">
                <span class="photo-share-action__icon">↗</span>
                <span>{{ photoSharing() ? 'Preparando fotos…' : 'Compartir fotos por WhatsApp' }}</span>
              </button>
              <button type="button" class="photo-share-action photo-share-action--secondary" [disabled]="photoSharing()" (click)="copyPhotoShareLink(share.galleryUrl)">
                <span class="photo-share-action__icon">⧉</span>
                <span>Copiar enlace privado</span>
              </button>
            }
            <button type="button" class="delivery-link-button" (click)="closePhotoShare()">Cerrar</button>
          </footer>
        </section>
      </div>
    }

    <app-vehiculo-form-dialog #formDialog (saved)="loadVehiculos()" />
  `,
  styles: [
    `
      /* ─── Mobile card list (paridad con inventario_page.dart) ─────────── */
      .veh-card-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .veh-card-list__summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        font-weight: 700;
        color: #6b717f;
        padding: 0 2px;
      }
      .veh-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 10.5px;
        font-weight: 800;
        white-space: nowrap;
      }
      .veh-pill--danger {
        background: #fee2e2;
        color: #b42318;
        border: 1px solid rgba(180, 35, 24, 0.25);
      }

      .veh-card {
        background: white;
        border: 1px solid #e4e7ec;
        border-radius: 16px;
        padding: 16px;
      }
      .veh-card--alert {
        border-color: rgba(180, 35, 24, 0.25);
        background: #fffbfb;
      }
      .veh-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        cursor: pointer;
      }
      .veh-card__title {
        min-width: 0;
      }
      .veh-card__name {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        color: #0d1017;
        line-height: 1.2;
      }
      .veh-card__vin {
        margin: 2px 0 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: #98a2b3;
      }
      .veh-card__cliente {
        flex-shrink: 0;
        font-size: 12.5px;
        font-weight: 700;
        color: #4b5162;
        white-space: nowrap;
      }
      .veh-card__divider {
        height: 1px;
        background: #eceff3;
        margin: 14px 0;
      }
      .veh-card__info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .veh-info-chip {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        min-width: 0;
        color: #98a2b3;
      }
      .veh-info-chip span {
        display: block;
        font-size: 10px;
        font-weight: 700;
        color: #98a2b3;
      }
      .veh-info-chip p {
        margin: 1px 0 0;
        font-size: 12.5px;
        color: #475467;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .veh-card__checkpoints {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
      }
      .veh-dot {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: #e4e7ec;
      }
      .veh-dot--on {
        background: var(--dot-color);
      }
      .veh-card__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .veh-btn--delivery {
        background: #fff1f1;
        color: #a31820;
        border: 1px solid #ffc5c5;
      }
      .veh-btn--delivery:disabled { opacity: .45; cursor: not-allowed; }
      .veh-btn--share {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .veh-btn--share:disabled { opacity: .45; cursor: not-allowed; }
      .veh-btn {
        flex: 1 1 calc(50% - 5px);
        min-width: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 42px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .veh-btn--ghost {
        background: transparent;
        border: 1.5px solid #c61d26;
        color: #c61d26;
      }
      .veh-btn--ghost:disabled {
        border-color: #e4e7ec;
        color: #98a2b3;
        cursor: not-allowed;
      }
      .veh-btn--primary {
        background: #0d1017;
        color: white;
        border: none;
      }

      .veh-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 4px 4px;
        font-size: 12.5px;
        color: #6b717f;
      }
      .veh-page-btn {
        padding: 8px 14px;
        border-radius: 10px;
        border: 1px solid #e4e7ec;
        background: white;
        font-size: 12.5px;
        font-weight: 600;
        color: #475467;
      }
      .veh-page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* ─── Photo lightbox ─────────────────────────── */
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
      .delivery-modal-backdrop { position:fixed; inset:0; z-index:80; display:flex; align-items:flex-start; justify-content:center; padding:7vh 16px 24px; background:rgba(13,16,23,.44); overflow-y:auto; }
      .delivery-modal { width:100%; max-width:560px; background:#fff; border-radius:20px; box-shadow:0 24px 70px rgba(13,16,23,.24); overflow:hidden; }
      .delivery-modal__header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:21px 24px; border-bottom:1px solid #eef0f3; background:#fcfcfd; }
      .delivery-modal__eyebrow { display:block; color:#a31820; font-size:10px; font-weight:800; letter-spacing:.1em; margin-bottom:5px; }
      .delivery-modal__header h2 { margin:0; color:#0d1017; font-size:19px; font-weight:800; }
      .delivery-modal__header p { margin:4px 0 0; color:#7a8190; font-size:12px; }
      .delivery-modal__close { width:34px; height:34px; border:0; border-radius:9px; background:#f3f4f6; color:#697181; font-size:23px; cursor:pointer; }
      .delivery-modal__body { display:grid; gap:16px; padding:22px 24px; }
      .delivery-mode-list { display:grid; gap:9px; }
      .delivery-mode-list button { display:grid; gap:4px; padding:13px 14px; border:1px solid #e4e7ec; border-radius:12px; background:#fff; text-align:left; cursor:pointer; }
      .delivery-mode-list button.delivery-mode--active { border-color:#c61d26; background:#fff8f8; box-shadow:0 0 0 2px rgba(198,29,38,.08); }
      .delivery-mode-list strong { color:#1e2330; font-size:13px; }
      .delivery-mode-list span { color:#697181; font-size:12px; line-height:1.4; }
      .delivery-field { display:grid; gap:6px; }
      .delivery-field > span { color:#4b5162; font-size:12px; font-weight:700; }
      .delivery-field input,.delivery-field select,.delivery-field textarea { width:100%; border:1px solid #dfe3e9; border-radius:10px; padding:11px 12px; color:#1e2330; background:#fff; font:inherit; font-size:13px; outline:none; }
      .delivery-field input:focus,.delivery-field select:focus,.delivery-field textarea:focus { border-color:#c61d26; box-shadow:0 0 0 3px rgba(198,29,38,.09); }
      .delivery-field textarea { resize:vertical; }
      .delivery-note,.delivery-warning { margin:0; color:#697181; font-size:12px; line-height:1.45; }
      .delivery-warning { color:#a15c00; padding:10px 12px; border-radius:9px; background:#fff7e6; }
      .delivery-modal__footer { display:flex; justify-content:flex-end; gap:9px; padding:16px 24px 21px; border-top:1px solid #eef0f3; }
      .delivery-modal__footer--stack { display:grid; }
      .delivery-primary,.delivery-secondary,.delivery-link-button { min-height:42px; padding:0 15px; border-radius:10px; font:inherit; font-size:13px; font-weight:750; cursor:pointer; }
      .delivery-primary { color:#fff; background:#c61d26; border:1px solid #c61d26; }
      .delivery-primary:disabled { opacity:.5; cursor:not-allowed; }
      .delivery-secondary { color:#4b5162; background:#fff; border:1px solid #dfe3e9; }
      .delivery-link-button { color:#a31820; background:transparent; border:0; }
      .delivery-success { display:flex; gap:12px; align-items:center; padding:13px; border-radius:13px; background:#f0fdf4; border:1px solid #bbf7d0; }
      .delivery-success__icon { width:32px; height:32px; flex:0 0 auto; display:grid; place-items:center; border-radius:50%; color:#fff; background:#16a34a; font-weight:900; }
      .delivery-success strong { display:block; color:#166534; font-size:14px; }
      .delivery-success p { margin:3px 0 0; color:#4b7c59; font-size:12px; }
      .photo-share-action { display:flex; align-items:center; justify-content:center; gap:10px; min-height:58px; padding:0 18px; border-radius:13px; font:inherit; font-size:14px; font-weight:850; cursor:pointer; transition:transform .15s,box-shadow .15s,opacity .15s; }
      .photo-share-action:hover { transform:translateY(-1px); box-shadow:0 9px 24px rgba(13,16,23,.14); }
      .photo-share-action:disabled { opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }
      .photo-share-action--primary { color:#fff; background:#c61d26; border:1px solid #c61d26; box-shadow:0 7px 18px rgba(198,29,38,.2); }
      .photo-share-action--secondary { color:#166534; background:#f0fdf4; border:1px solid #86efac; }
      .photo-share-action__icon { display:grid; place-items:center; width:27px; height:27px; border-radius:8px; background:rgba(255,255,255,.2); font-size:18px; line-height:1; }
      .photo-share-action--secondary .photo-share-action__icon { background:#dcfce7; }
      .photo-share-loading { display:grid; justify-items:center; gap:8px; padding:20px 0 10px; text-align:center; color:#4b5162; font-size:13px; }
      .photo-share-loading span { color:#7a8190; font-size:12px; }
      .photo-share-spinner { width:28px; height:28px; margin-bottom:4px; border:3px solid #e5e7eb; border-top-color:#16a34a; border-radius:50%; animation:photo-share-spin .8s linear infinite; }
      @keyframes photo-share-spin { to { transform:rotate(360deg); } }
      @media (max-width:640px) { .delivery-modal-backdrop { padding:3vh 10px 16px; } .delivery-modal__header,.delivery-modal__body,.delivery-modal__footer { padding-left:18px; padding-right:18px; } .delivery-modal__footer:not(.delivery-modal__footer--stack) { flex-direction:column-reverse; } .delivery-modal__footer:not(.delivery-modal__footer--stack) button { width:100%; } }
    `,
  ],
})
export class VehiculosListComponent {
  private service = inject(VehiculoService);
  private entregaService = inject(EntregaTareaService);
  private campoService = inject(CampoService);
  private notifications = inject(NotificationService);
  router = inject(Router);

  /** Breakpoint móvil, igual convención que app-layout.component.ts. */
  isMobile = signal(window.innerWidth < 768);
  lightboxVehiculo = signal<VehiculoListDto | null>(null);
  lightboxIndex = signal(0);
  showPhotoShareModal = signal(false);
  shareVehicle = signal<VehiculoListDto | null>(null);
  photoShare = signal<CampoShareResponse | null>(null);
  photoShareLoading = signal(false);
  photoSharing = signal(false);

  @HostListener('window:resize')
  onWindowResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  sinClienteCount(): number {
    return this.vehiculos().filter(v => !v.clienteApodo).length;
  }

  vehicleLabel(v: VehiculoListDto): string {
    return [v.marcaNombre, v.modeloNombre, v.anno ? String(v.anno) : null]
      .filter((part): part is string => !!part)
      .join(' ') || 'Sin datos de marca';
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  openFotos(v: VehiculoListDto): void {
    if (v.fotosUrls.length === 0) return;
    this.lightboxIndex.set(0);
    this.lightboxVehiculo.set(v);
  }

  closeFotos(): void {
    this.lightboxVehiculo.set(null);
  }

  nextFoto(v: VehiculoListDto): void {
    this.lightboxIndex.set((this.lightboxIndex() + 1) % v.fotosUrls.length);
  }

  prevFoto(v: VehiculoListDto): void {
    this.lightboxIndex.set((this.lightboxIndex() - 1 + v.fotosUrls.length) % v.fotosUrls.length);
  }

  openPhotoShare(vehicle: VehiculoListDto): void {
    if (vehicle.fotosUrls.length === 0 || this.photoShareLoading()) return;

    this.shareVehicle.set(vehicle);
    this.photoShare.set(null);
    this.showPhotoShareModal.set(true);
    this.photoShareLoading.set(true);
    this.campoService.createVehicleShareLink(vehicle.id).subscribe({
      next: share => {
        this.photoShare.set(share);
        this.photoShareLoading.set(false);
      },
      error: error => {
        this.photoShareLoading.set(false);
        this.showPhotoShareModal.set(false);
        this.notifications.fromHttpError(error, 'No se pudo preparar la galería privada de las fotos');
      },
    });
  }

  closePhotoShare(): void {
    if (this.photoSharing()) return;
    this.showPhotoShareModal.set(false);
    this.shareVehicle.set(null);
    this.photoShare.set(null);
  }

  async sharePhotosByWhatsApp(share: CampoShareResponse): Promise<void> {
    if (this.photoSharing()) return;
    this.photoSharing.set(true);
    try {
      if (!this.supportsNativeFileShare()) {
        this.openWhatsAppFallback(share, 'Este dispositivo no permite adjuntar fotos desde el navegador. Se abrirá WhatsApp con el enlace privado.');
        return;
      }

      const prepared = await this.prepareShareFiles(share);
      if (
        prepared.files.length !== share.photoUrls.length ||
        prepared.failedCount > 0 ||
        prepared.exceededSizeLimit
      ) {
        this.openWhatsAppFallback(
          share,
          prepared.exceededSizeLimit
            ? 'Las fotos ocupan demasiado para compartirlas juntas desde este dispositivo. Se abrirá WhatsApp con el enlace privado.'
            : 'No se pudieron preparar todas las fotos para adjuntarlas. Se abrirá WhatsApp con el enlace privado.'
        );
        return;
      }

      let canShareFiles = false;
      try {
        canShareFiles = navigator.canShare({ files: prepared.files });
      } catch {
        canShareFiles = false;
      }

      if (!canShareFiles) {
        this.openWhatsAppFallback(share, 'El navegador no permite compartir estas fotos como archivos. Se abrirá WhatsApp con el enlace privado.');
        return;
      }

      try {
        await navigator.share({
          title: `Fotos de ${share.vehicle}`,
          // WhatsApp puede repetir `text` como caption en cada imagen.
          // El mensaje con el enlace se conserva únicamente en el fallback.
          files: prepared.files,
        });
      } catch (error) {
        if (!this.isShareCancelled(error)) {
          this.openWhatsAppFallback(share, 'El menú nativo no aceptó las fotos. Se abrirá WhatsApp con el enlace privado.');
        }
      }
    } catch {
      this.openWhatsAppFallback(share, 'No se pudieron preparar las fotos. Se abrirá WhatsApp con el enlace privado.');
    } finally {
      this.photoSharing.set(false);
    }
  }

  async copyPhotoShareLink(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      this.notifications.success('Enlace privado copiado. Es válido durante 7 días.');
    } catch {
      this.notifications.error('No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente.');
    }
  }

  private supportsNativeFileShare(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      typeof File !== 'undefined'
    );
  }

  private async prepareShareFiles(share: CampoShareResponse): Promise<PreparedShareFiles> {
    const files: File[] = [];
    let failedCount = 0;
    let totalBytes = 0;
    const photoUrls = this.buildSharePhotoUrls(share);

    if (photoUrls.length !== share.photoUrls.length) {
      return { files, failedCount: share.photoUrls.length, exceededSizeLimit: false };
    }

    for (const [index, url] of photoUrls.entries()) {
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          credentials: 'omit',
          mode: 'cors',
        });
        if (!response.ok) {
          failedCount++;
          continue;
        }

        const declaredLength = Number(response.headers.get('content-length'));
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > 0 &&
          totalBytes + declaredLength > MAX_NATIVE_SHARE_BYTES
        ) {
          return { files, failedCount, exceededSizeLimit: true };
        }

        const blob = await response.blob();
        const mimeType = this.normalizeShareMimeType(
          blob.type || response.headers.get('content-type') || ''
        );
        if (!mimeType || blob.size === 0) {
          failedCount++;
          continue;
        }

        if (totalBytes + blob.size > MAX_NATIVE_SHARE_BYTES) {
          return { files, failedCount, exceededSizeLimit: true };
        }

        const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
        files.push(new File([blob], `foto-${index + 1}.${extension}`, { type: mimeType }));
        totalBytes += blob.size;
      } catch {
        failedCount++;
      }
    }

    return { files, failedCount, exceededSizeLimit: false };
  }

  private buildSharePhotoUrls(share: CampoShareResponse): string[] {
    if (
      share.sharePhotoUrls?.length === share.photoUrls.length &&
      share.sharePhotoUrls.every(url => url.trim().length > 0)
    ) {
      return share.sharePhotoUrls;
    }

    try {
      const galleryUrl = new URL(share.galleryUrl, window.location.origin);
      galleryUrl.search = '';
      galleryUrl.hash = '';
      const basePath = galleryUrl.pathname.replace(/\/$/, '');
      return share.photoUrls.map((_, index) => {
        const photoUrl = new URL(galleryUrl.toString());
        photoUrl.pathname = `${basePath}/foto/${encodeURIComponent(String(index))}`;
        return photoUrl.toString();
      });
    } catch {
      return [];
    }
  }

  private normalizeShareMimeType(value: string): string | null {
    const mimeType = value.split(';', 1)[0].trim().toLowerCase();
    const normalized = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    return SHAREABLE_IMAGE_TYPES.has(normalized) ? normalized : null;
  }

  private isShareCancelled(error: unknown): boolean {
    if (error instanceof DOMException) return error.name === 'AbortError';
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === 'AbortError'
    );
  }

  private openWhatsAppFallback(share: CampoShareResponse, message: string): void {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(share.shareText)}`,
      '_blank',
      'noopener,noreferrer'
    );
    this.notifications.info(message);
  }

  cotizar(v: VehiculoListDto): void {
    this.router.navigate(['/cotizaciones/nueva'], { queryParams: { vehiculoId: v.id } });
  }

  openAssign(vehicle: VehiculoListDto): void {
    this.assignVehicle.set(vehicle);
    this.assignResult.set(null);
    this.assignMode.set('assigned');
    this.selectedDriverId.set('');
    this.assignLocation.set(vehicle.ubicacionActual || '');
    this.assignNotes.set('');
    this.showAssignModal.set(true);
    this.loadDrivers();
  }

  closeAssign(): void {
    if (this.assigning()) return;
    this.showAssignModal.set(false);
    this.assignVehicle.set(null);
    this.assignResult.set(null);
  }

  confirmAssign(vehicle: VehiculoListDto): void {
    if (this.assigning() || (this.assignMode() === 'assigned' && !this.selectedDriverId())) return;

    this.assigning.set(true);
    this.entregaService.asignarVehiculo({
      vehiculoId: vehicle.id,
      choferUserId: this.assignMode() === 'assigned' ? this.selectedDriverId() : null,
      ubicacionEntrega: this.assignLocation().trim() || null,
      notasChofer: this.assignNotes().trim() || null,
    }).subscribe({
      next: result => {
        this.assigning.set(false);
        this.assignResult.set(result);
        this.loadVehiculos();
      },
      error: error => {
        this.assigning.set(false);
        this.notifications.fromHttpError(error, 'No se pudo preparar la entrega');
      },
    });
  }

  shareLink(result: EntregaLinkResponseDto): void {
    const driver = result.tarea.choferNombre ? ` ${result.tarea.choferNombre}` : '';
    const message = result.tieneChoferAsignado
      ? `Hola${driver}, tienes una entrega asignada de ${result.tarea.vehiculoResumen}. Abre este enlace para entrar con tu PIN:\n${result.enlace}`
      : `Hola, hay una entrega disponible de ${result.tarea.vehiculoResumen}. Abre este enlace para tomarla con tu PIN:\n${result.enlace}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async copyLink(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      this.notifications.success('Enlace copiado. Ya puedes pegarlo en WhatsApp.');
    } catch {
      this.notifications.error('No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente.');
    }
  }

  selectLinkInput(event: FocusEvent): void {
    (event.target as HTMLInputElement | null)?.select();
  }

  regenerateLink(tareaId: string): void {
    if (this.assigning()) return;
    this.assigning.set(true);
    this.entregaService.regenerarEnlace(tareaId).subscribe({
      next: result => {
        this.assigning.set(false);
        this.assignResult.set(result);
      },
      error: error => {
        this.assigning.set(false);
        this.notifications.fromHttpError(error, 'No se pudo generar otro enlace');
      },
    });
  }

  private loadDrivers(): void {
    this.driversLoading.set(true);
    this.entregaService.getChoferes().subscribe({
      next: users => {
        this.drivers.set(users);
        this.driversLoading.set(false);
      },
      error: error => {
        this.driversLoading.set(false);
        this.drivers.set([]);
        this.notifications.fromHttpError(error, 'No se pudieron cargar los choferes');
      },
    });
  }

  @ViewChild('formDialog') formDialog!: VehiculoFormDialogComponent;

  vehiculos = signal<VehiculoListDto[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(true);
  search = signal('');
  clienteFiltro = signal('');
  enPatio = signal(false);
  sortColumn = signal('ingreso');
  sortDir = signal('desc');
  showAssignModal = signal(false);
  assignVehicle = signal<VehiculoListDto | null>(null);
  assignResult = signal<EntregaLinkResponseDto | null>(null);
  drivers = signal<ChoferEntregaDto[]>([]);
  driversLoading = signal(false);
  assigning = signal(false);
  assignMode = signal<'assigned' | 'open'>('assigned');
  selectedDriverId = signal('');
  assignLocation = signal('');
  assignNotes = signal('');

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  pages = () => {
    const tp = this.totalPages();
    const cp = this.page();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, cp - delta); i <= Math.min(tp - 1, cp + delta); i++) {
      range.push(i);
    }
    const pages = [1];
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < tp - 1) pages.push(-1);
    if (tp > 1) pages.push(tp);
    return pages;
  };

  constructor() {
    this.loadVehiculos();
  }

  loadVehiculos(): void {
    this.loading.set(true);
    this.service
      .getList({
        search: this.search() || undefined,
        clienteNombre: this.clienteFiltro() || undefined,
        enPatio: this.enPatio() || undefined,
        orderBy: this.sortColumn(),
        orderDir: this.sortDir(),
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.vehiculos.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.loadVehiculos();
    }, 350);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadVehiculos();
  }

  toggleSort(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDir.set('asc');
    }
    this.loadVehiculos();
  }

  sortIcon(column: string): string {
    if (this.sortColumn() !== column) return '—';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  onClientFilter(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.loadVehiculos();
    }, 350);
  }
}
