import { Component, HostListener, signal, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { VehiculoService, VehiculoListDto } from '../../services/vehiculo.service';
import { VehiculoFormDialogComponent } from './vehiculo-form-dialog.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehiculos-list',
  standalone: true,
  imports: [FormsModule, DatePipe, VehiculoFormDialogComponent],
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
                  <th class="text-center px-5 py-3.5 font-medium">Estado</th>
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
        gap: 10px;
        margin-top: 14px;
      }
      .veh-btn {
        flex: 1;
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
    `,
  ],
})
export class VehiculosListComponent {
  private service = inject(VehiculoService);
  router = inject(Router);

  /** Breakpoint móvil, igual convención que app-layout.component.ts. */
  isMobile = signal(window.innerWidth < 768);
  lightboxVehiculo = signal<VehiculoListDto | null>(null);
  lightboxIndex = signal(0);

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

  cotizar(v: VehiculoListDto): void {
    this.router.navigate(['/cotizaciones/nueva'], { queryParams: { vehiculoId: v.id } });
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
