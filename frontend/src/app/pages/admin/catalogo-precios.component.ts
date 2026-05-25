import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { debounceTime, Subject, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CatalogoPreciosService,
  CatalogoPrecioListDto,
  CatalogoPrecioDetailDto,
  CatalogoStatsDto,
  CreateCatalogoPrecioRequest,
  UpdateCatalogoPrecioRequest,
} from '../../services/catalogo-precios.service';
import { NotificationService } from '../../services/notification.service';

const FRACCIONES = [
  { value: '', label: 'Todas las fracciones' },
  { value: '8703.22.02', label: '8703.22.02 — 1.0–1.5 L' },
  { value: '8703.23.02', label: '8703.23.02 — 1.6–3.0 L' },
  { value: '8703.24.02', label: '8703.24.02 — 3.1+ L' },
  { value: '8703.32.02', label: '8703.32.02 — Híbrido diésel' },
  { value: '8703.33.02', label: '8703.33.02 — Eléctrico' },
  { value: '8703.40.02', label: '8703.40.02 — Híbrido enchufable' },
  { value: '8703.60.02', label: '8703.60.02 — Otros híbridos' },
  { value: '8704.21.04', label: '8704.21.04 — Camión <5 ton' },
  { value: '8704.31.05', label: '8704.31.05 — Pick-up' },
  { value: '8701.21.01', label: '8701.21.01 — Tractor carretera' },
];

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'AUTOMOVIL', label: 'Automóvil' },
  { value: 'CAMIONETA', label: 'Camioneta' },
  { value: 'CAMION', label: 'Camión' },
  { value: 'PICKUP', label: 'Pick-up' },
  { value: 'HIBRIDO', label: 'Híbrido' },
  { value: 'ELECTRICO', label: 'Eléctrico' },
  { value: 'TRACTOR', label: 'Tractor' },
];

@Component({
  selector: 'app-catalogo-precios',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe],
  template: `
    <div style="font-family: var(--font-body); min-height: 100vh;">
      <!-- ── Header ──────────────────────────────────────────────────────────── -->
      <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE] mb-1">
            Admin · Catálogos
          </p>
          <h1 class="text-[26px] font-semibold text-[#0D1017] tracking-[-0.6px]">
            Catálogo de Precios SAT
          </h1>
          <p class="text-[13px] text-[#6B7280] mt-0.5">
            Anexo 2 — precios estimados de importación por modelo y antigüedad
          </p>
        </div>

        <div class="flex items-start gap-4 flex-wrap">
          <!-- Stats chips -->
          @if (stats()) {
            <div class="flex items-center gap-2 flex-wrap">
              <span class="stat-chip">
                <span class="stat-num">{{ stats()!.totalEntradas | number }}</span>
                <span class="stat-lbl">entradas</span>
              </span>
              <span class="stat-chip">
                <span class="stat-num">{{ stats()!.totalFracciones }}</span>
                <span class="stat-lbl">fracciones</span>
              </span>
              <span class="stat-chip">
                <span class="stat-num">{{ stats()!.entradasEspecificas | number }}</span>
                <span class="stat-lbl">específicas</span>
              </span>
              <span class="stat-chip stat-chip--muted">
                <span class="stat-num">{{ stats()!.entradasGenericas | number }}</span>
                <span class="stat-lbl">genéricas</span>
              </span>
            </div>
          }

          <!-- Create button -->
          <button class="create-btn" (click)="openCreate()">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            Nuevo registro
          </button>
        </div>
      </div>

      <!-- ── Filter bar ───────────────────────────────────────────────────────── -->
      <div class="filter-bar mb-4">
        <!-- Search -->
        <div class="filter-search-wrap">
          <svg class="filter-search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M13.5 13.5L17 17"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <input
            type="text"
            class="filter-search"
            placeholder="Buscar marca o modelo…"
            [(ngModel)]="searchText"
            (ngModelChange)="onSearchChange($event)"
          />
          @if (searchText) {
            <button class="filter-clear-btn" (click)="clearSearch()" title="Limpiar búsqueda">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                <path
                  d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"
                />
              </svg>
            </button>
          }
        </div>

        <!-- Fracción select -->
        <select class="filter-select" [(ngModel)]="filterFraccion" (ngModelChange)="loadPage(1)">
          @for (f of fracciones; track f.value) {
            <option [value]="f.value">{{ f.label }}</option>
          }
        </select>

        <!-- Tipo vehículo -->
        <select class="filter-select" [(ngModel)]="filterTipo" (ngModelChange)="loadPage(1)">
          @for (t of tipos; track t.value) {
            <option [value]="t.value">{{ t.label }}</option>
          }
        </select>

        <!-- Genérico toggle -->
        <div class="filter-toggle-wrap">
          <label
            class="filter-toggle"
            [class.active]="filterGenerico === true"
            (click)="toggleGenerico(true)"
            >Solo genéricas</label
          >
          <label
            class="filter-toggle"
            [class.active]="filterGenerico === false"
            (click)="toggleGenerico(false)"
            >Solo específicas</label
          >
          @if (filterGenerico !== undefined) {
            <button
              class="filter-clear-btn"
              (click)="filterGenerico = undefined; loadPage(1)"
              title="Quitar filtro"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                <path
                  d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"
                />
              </svg>
            </button>
          }
        </div>

        <!-- Active filter chips -->
        <div class="filter-chips">
          @if (searchText) {
            <span class="chip">
              "{{ searchText }}"
              <button (click)="clearSearch()">×</button>
            </span>
          }
          @if (filterFraccion) {
            <span class="chip">
              {{ filterFraccion }}
              <button (click)="filterFraccion = ''; loadPage(1)">×</button>
            </span>
          }
          @if (filterTipo) {
            <span class="chip">
              {{ filterTipo }}
              <button (click)="filterTipo = ''; loadPage(1)">×</button>
            </span>
          }
        </div>
      </div>

      <!-- ── Table ────────────────────────────────────────────────────────────── -->
      <div class="table-wrap">
        <table class="catalog-table">
          <thead>
            <tr>
              <th style="width:36px"></th>
              <th>Fracción</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Categoría</th>
              <th style="text-align:right">Precio USD</th>
              <th style="text-align:center">Años</th>
              <th style="width:96px"></th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              @for (s of skeletons; track s) {
                <tr class="skeleton-row">
                  <td><div class="skel skel-sm"></div></td>
                  <td><div class="skel skel-code"></div></td>
                  <td><div class="skel skel-md"></div></td>
                  <td><div class="skel skel-lg"></div></td>
                  <td><div class="skel skel-sm"></div></td>
                  <td><div class="skel skel-md" style="margin-left:auto"></div></td>
                  <td><div class="skel skel-sm" style="margin:0 auto"></div></td>
                  <td></td>
                </tr>
              }
            } @else if (items().length === 0) {
              <tr>
                <td colspan="8">
                  <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" class="empty-icon">
                      <rect
                        x="4"
                        y="8"
                        width="32"
                        height="26"
                        rx="4"
                        stroke="#D1D5DB"
                        stroke-width="1.5"
                      />
                      <path d="M4 14h32" stroke="#D1D5DB" stroke-width="1.5" />
                      <path
                        d="M13 20h4M13 25h10"
                        stroke="#D1D5DB"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                    <p class="empty-title">Sin resultados</p>
                    <p class="empty-sub">
                      Cambia los filtros o importa datos desde el
                      <a routerLink="/admin/importador" class="link">Importador SAT</a>.
                    </p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <!-- Main row -->
                <tr
                  class="catalog-row"
                  [class.expanded]="expandedId() === item.id"
                  (click)="toggleExpand(item.id)"
                >
                  <!-- Expand chevron -->
                  <td class="td-chevron">
                    <svg
                      class="chevron"
                      [class.rotated]="expandedId() === item.id"
                      viewBox="0 0 16 16"
                      fill="none"
                      width="14"
                      height="14"
                    >
                      <path
                        d="M5 7l3 3 3-3"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </td>

                  <!-- Fracción -->
                  <td class="td-fraccion">
                    <code class="fraccion-badge">{{ item.fraccion }}</code>
                    @if (item.esGenerico) {
                      <span class="generic-badge">genérico</span>
                    }
                  </td>

                  <!-- Marca -->
                  <td class="td-marca">{{ item.marcaTexto || '—' }}</td>

                  <!-- Modelo -->
                  <td class="td-modelo">
                    <span class="modelo-text">{{ item.modelo || '—' }}</span>
                    @if (item.inciso) {
                      <span class="inciso-pill">{{ item.inciso }}</span>
                    }
                  </td>

                  <!-- Categoría -->
                  <td class="td-cat">
                    <span class="cat-pill cat-pill--{{ item.categoria }}">{{
                      item.categoria
                    }}</span>
                  </td>

                  <!-- Precio rango -->
                  <td class="td-precio">
                    @if (item.precioMinUsd !== null) {
                      <span class="precio-range">
                        @if (item.precioMinUsd === item.precioMaxUsd) {
                          ${'$'}{{ item.precioMinUsd | number: '1.0-0' }}
                        } @else {
                          ${'$'}{{ item.precioMinUsd | number: '1.0-0' }} – ${'$'}{{
                            item.precioMaxUsd | number: '1.0-0'
                          }}
                        }
                      </span>
                    } @else {
                      <span class="text-[#9EA3AE] text-[12px]">—</span>
                    }
                  </td>

                  <!-- Años disponibles -->
                  <td class="td-anios">
                    <div class="anios-pills">
                      @for (a of item.aniosDisponibles; track a) {
                        <span class="anio-pill">{{ a }}</span>
                      }
                    </div>
                  </td>

                  <!-- Acciones -->
                  <td class="td-actions" (click)="$event.stopPropagation()">
                    <button
                      class="action-btn action-btn--edit"
                      title="Editar entrada"
                      (click)="openEdit(item)"
                    >
                      <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path
                          d="M11.5 2.5a1.5 1.5 0 012.121 2.121L5.5 12.743l-2.828.707.707-2.828L11.5 2.5z"
                          stroke="currentColor"
                          stroke-width="1.3"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      class="action-btn action-btn--delete"
                      title="Eliminar entrada"
                      (click)="confirmDelete(item)"
                      [class.confirming]="deletingId() === item.id"
                    >
                      @if (deletingId() === item.id) {
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                          <path
                            d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4"
                            stroke="#C61D26"
                            stroke-width="1.3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      } @else {
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                          <path
                            d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4"
                            stroke="currentColor"
                            stroke-width="1.3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      }
                    </button>

                    <!-- Popconfirm delete -->
                    @if (deletingId() === item.id) {
                      <div class="popconfirm">
                        <p class="popconfirm-msg">¿Eliminar esta entrada del catálogo?</p>
                        <div class="popconfirm-actions">
                          <button class="popconfirm-cancel" (click)="deletingId.set(null)">
                            Cancelar
                          </button>
                          <button
                            class="popconfirm-confirm"
                            (click)="executeDelete(item.id)"
                            [disabled]="deleteLoading()"
                          >
                            @if (deleteLoading()) {
                              Eliminando…
                            } @else {
                              Eliminar
                            }
                          </button>
                        </div>
                      </div>
                    }
                  </td>
                </tr>

                <!-- Expanded: precios por antigüedad -->
                @if (expandedId() === item.id) {
                  <tr class="expanded-row">
                    <td colspan="8">
                      <div class="expanded-body">
                        @if (loadingDetail()) {
                          <p class="text-[12px] text-[#9EA3AE]">Cargando precios…</p>
                        } @else if (detail()) {
                          <div class="detail-grid">
                            <div class="detail-meta">
                              <div class="detail-meta-row">
                                <span class="detail-lbl">Fracción</span>
                                <span class="detail-val"
                                  ><code>{{ detail()!.fraccion }}</code> ·
                                  {{ detail()!.fraccionDescripcion }}</span
                                >
                              </div>
                              @if (detail()!.hojaOrigen) {
                                <div class="detail-meta-row">
                                  <span class="detail-lbl">Hoja PDF</span>
                                  <span class="detail-val">{{ detail()!.hojaOrigen }}</span>
                                </div>
                              }
                              @if (detail()!.tipoVehiculo) {
                                <div class="detail-meta-row">
                                  <span class="detail-lbl">Tipo</span>
                                  <span class="detail-val">{{ detail()!.tipoVehiculo }}</span>
                                </div>
                              }
                            </div>

                            <!-- Price table -->
                            <div class="price-table-wrap">
                              <table class="price-table">
                                <thead>
                                  <tr>
                                    @for (p of detail()!.precios; track p.id) {
                                      <th>
                                        {{ p.antiguedadAnios }} año{{
                                          p.antiguedadAnios !== 1 ? 's' : ''
                                        }}
                                      </th>
                                    }
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    @for (p of detail()!.precios; track p.id) {
                                      <td>${'$'}{{ p.precioUsd | number: '1.0-0' }}</td>
                                    }
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>

      <!-- ── Pagination ───────────────────────────────────────────────────────── -->
      @if (!loading() && totalItems() > 0) {
        <div class="pagination">
          <span class="pagination-info">
            {{ (currentPage() - 1) * pageSize + 1 }}–{{
              Math.min(currentPage() * pageSize, totalItems())
            }}
            de {{ totalItems() | number }} entradas
          </span>
          <div class="pagination-btns">
            <button
              class="page-btn"
              [disabled]="currentPage() === 1"
              (click)="loadPage(currentPage() - 1)"
            >
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path
                  d="M10 12L6 8l4-4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <span class="page-indicator">{{ currentPage() }} / {{ totalPages() }}</span>
            <button
              class="page-btn"
              [disabled]="currentPage() === totalPages()"
              (click)="loadPage(currentPage() + 1)"
            >
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path
                  d="M6 12l4-4-4-4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════════ -->
    <!-- Edit Panel                                                                  -->
    <!-- ══════════════════════════════════════════════════════════════════════════ -->
    @if (editPanelOpen()) {
      <!-- Backdrop -->
      <div class="panel-backdrop" (click)="closeEdit()"></div>

      <!-- Slide panel -->
      <div class="edit-panel" [class.open]="editPanelOpen()">
        <div class="panel-header">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9EA3AE]">
              Catálogo SAT
            </p>
            <h2 class="text-[17px] font-semibold text-[#0D1017] mt-0.5">
              {{ panelMode() === 'create' ? 'Nueva entrada' : 'Editar entrada' }}
            </h2>
          </div>
          <button class="panel-close" (click)="closeEdit()">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="panel-body">
          @if (editForm) {
            <!-- Fracción -->
            <div class="panel-section">
              <p class="panel-section-title">Identificación</p>
              <div class="panel-field-row">
                <div class="panel-field">
                  <label class="panel-lbl">Fracción arancelaria</label>
                  @if (panelMode() === 'create') {
                    <select class="panel-input" [(ngModel)]="createFraccionCodigo">
                      @for (f of fracciones; track f.value) {
                        @if (f.value) {
                          <option [value]="f.value">{{ f.label }}</option>
                        }
                      }
                    </select>
                  } @else {
                    <div class="panel-readonly">
                      <code>{{ editForm.fraccion }}</code>
                    </div>
                  }
                </div>
                <div class="panel-field">
                  <label class="panel-lbl">Hoja PDF origen</label>
                  <input
                    type="text"
                    class="panel-input"
                    [(ngModel)]="editForm.hojaOrigen"
                    placeholder="ej. Hoja 3"
                  />
                </div>
              </div>
            </div>

            <!-- Datos del vehículo -->
            <div class="panel-section">
              <p class="panel-section-title">Datos del vehículo</p>
              <div class="panel-field-row">
                <div class="panel-field">
                  <label class="panel-lbl">Marca (texto catálogo)</label>
                  <input
                    type="text"
                    class="panel-input"
                    [(ngModel)]="editForm.marcaTexto"
                    placeholder="ej. CHEVROLET"
                  />
                </div>
                <div class="panel-field">
                  <label class="panel-lbl">Modelo</label>
                  <input
                    type="text"
                    class="panel-input"
                    [(ngModel)]="editForm.modelo"
                    placeholder="ej. CRUZE"
                  />
                </div>
              </div>
              <div class="panel-field-row">
                <div class="panel-field">
                  <label class="panel-lbl">Categoría</label>
                  <select class="panel-input" [(ngModel)]="editForm.categoria">
                    <option value="AUTOMOVIL">Automóvil</option>
                    <option value="CAMIONETA">Camioneta</option>
                    <option value="CAMION">Camión</option>
                    <option value="PICKUP">Pick-up</option>
                    <option value="SUV">SUV</option>
                    <option value="TRACTOR">Tractor</option>
                    <option value="HIBRIDO">Híbrido</option>
                    <option value="ELECTRICO">Eléctrico</option>
                  </select>
                </div>
                <div class="panel-field">
                  <label class="panel-lbl">Inciso</label>
                  <input
                    type="text"
                    class="panel-input"
                    [(ngModel)]="editForm.inciso"
                    placeholder="ej. A, B…"
                  />
                </div>
              </div>

              <!-- Genérico toggle -->
              <div class="panel-field">
                <label class="panel-lbl">Tipo de entrada</label>
                <div class="generic-toggle-wrap">
                  <button
                    class="generic-toggle-btn"
                    [class.active]="!editForm.esGenerico"
                    (click)="editForm.esGenerico = false"
                  >
                    Específica
                  </button>
                  <button
                    class="generic-toggle-btn"
                    [class.active]="editForm.esGenerico"
                    (click)="editForm.esGenerico = true"
                  >
                    Genérica
                  </button>
                </div>
                <p class="panel-hint">
                  @if (editForm.esGenerico) {
                    Precio base sin marca o modelo concreto. Se usa como último recurso en la
                    cotización.
                  } @else {
                    Precio asociado a un modelo específico del catálogo SAT.
                  }
                </p>
              </div>
            </div>

            <!-- Precios por antigüedad -->
            <div class="panel-section">
              <p class="panel-section-title">Precios por antigüedad (USD)</p>
              @if (editForm.precios.length > 0) {
                <div class="price-edit-grid">
                  @for (
                    p of editForm.precios;
                    track panelMode() === 'create' ? p.antiguedadAnios : p.id
                  ) {
                    <div class="price-edit-cell">
                      <label class="price-edit-lbl">Año {{ p.antiguedadAnios }}</label>
                      <div class="price-edit-input-wrap">
                        <span class="price-edit-prefix">$</span>
                        <input
                          type="number"
                          class="price-edit-input"
                          [(ngModel)]="p.precioUsd"
                          min="0"
                          step="100"
                        />
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-[13px] text-[#9EA3AE]">Sin precios por antigüedad registrados.</p>
              }
            </div>
          }
        </div>

        <div class="panel-footer">
          <button class="panel-cancel" (click)="closeEdit()">Cancelar</button>
          <button class="panel-save" (click)="saveEdit()" [disabled]="saveLoading()">
            @if (saveLoading()) {
              <span class="spinner-sm"></span>
              Guardando…
            } @else {
              {{ panelMode() === 'create' ? 'Crear entrada' : 'Guardar cambios' }}
            }
          </button>
        </div>
      </div>
    }

    <!-- Styles ------------------------------------------------------------------- -->
    <style>
      /* ── Stats chips ─────────────────────────────────────────────────────────── */
      .stat-chip {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        padding: 5px 12px;
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 10px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .stat-chip--muted {
        background: #f9fafb;
      }
      .stat-num {
        font-size: 14px;
        font-weight: 600;
        color: #0d1017;
        font-variant-numeric: tabular-nums;
      }
      .stat-lbl {
        font-size: 11px;
        color: #9ea3ae;
        font-weight: 500;
      }

      /* ── Filter bar ──────────────────────────────────────────────────────────── */
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding: 12px 16px;
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 14px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .filter-search-wrap {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 180px;
      }
      .filter-search-icon {
        position: absolute;
        left: 10px;
        color: #9ea3ae;
        width: 15px;
        height: 15px;
        pointer-events: none;
      }
      .filter-search {
        width: 100%;
        padding: 7px 32px 7px 33px;
        border: 1px solid #e4e7ec;
        border-radius: 9px;
        font-size: 13px;
        color: #0d1017;
        background: #f9fafb;
        outline: none;
        transition:
          border-color 0.15s,
          box-shadow 0.15s;
      }
      .filter-search:focus {
        border-color: #c61d26;
        box-shadow: 0 0 0 3px rgba(198, 29, 38, 0.08);
        background: #fff;
      }
      .filter-clear-btn {
        position: absolute;
        right: 8px;
        color: #9ea3ae;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 2px;
        border-radius: 4px;
      }
      .filter-clear-btn:hover {
        color: #6b7280;
      }
      .filter-select {
        padding: 7px 10px;
        border: 1px solid #e4e7ec;
        border-radius: 9px;
        font-size: 12px;
        color: #374151;
        background: #f9fafb;
        outline: none;
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .filter-select:focus {
        border-color: #c61d26;
      }
      .filter-toggle-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .filter-toggle {
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        border: 1px solid #e4e7ec;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        background: #f9fafb;
      }
      .filter-toggle.active {
        background: #0d1017;
        color: #fff;
        border-color: #0d1017;
      }
      .filter-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 8px 3px 10px;
        background: #f3f4f6;
        border-radius: 20px;
        font-size: 12px;
        color: #374151;
        font-weight: 500;
      }
      .chip button {
        background: none;
        border: none;
        cursor: pointer;
        color: #9ea3ae;
        font-size: 14px;
        line-height: 1;
        padding: 0 1px;
      }
      .chip button:hover {
        color: #374151;
      }

      /* ── Table ───────────────────────────────────────────────────────────────── */
      .table-wrap {
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .catalog-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .catalog-table thead tr {
        background: #f9fafb;
        border-bottom: 1px solid #e4e7ec;
      }
      .catalog-table th {
        padding: 10px 14px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: #6b7280;
        white-space: nowrap;
        text-align: left;
      }
      .catalog-row {
        cursor: pointer;
        border-bottom: 1px solid #f3f4f6;
        transition: background 0.12s;
      }
      .catalog-row:hover {
        background: #fafafa;
      }
      .catalog-row.expanded {
        background: #fdf9f9;
      }
      .catalog-row td {
        padding: 10px 14px;
        vertical-align: middle;
      }
      .td-chevron {
        padding: 10px 6px 10px 12px !important;
        width: 36px;
      }
      .chevron {
        color: #9ea3ae;
        transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .chevron.rotated {
        transform: rotate(180deg);
      }

      /* Fracción badge */
      .fraccion-badge {
        display: inline-block;
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 11.5px;
        font-weight: 500;
        letter-spacing: 0.3px;
        padding: 2px 7px;
        background: #0d1017;
        color: #fff;
        border-radius: 5px;
      }
      .generic-badge {
        display: inline-block;
        margin-left: 5px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 1px 6px;
        background: #fef3c7;
        color: #92400e;
        border-radius: 4px;
      }
      .td-marca {
        color: #374151;
        font-weight: 500;
      }
      .td-modelo {
      }
      .modelo-text {
        color: #0d1017;
        font-weight: 500;
      }
      .inciso-pill {
        display: inline-block;
        margin-left: 5px;
        font-size: 10px;
        font-weight: 600;
        padding: 1px 5px;
        background: #e5e7eb;
        color: #374151;
        border-radius: 3px;
      }
      /* Category pills */
      .cat-pill {
        display: inline-block;
        font-size: 11px;
        font-weight: 500;
        padding: 2px 7px;
        border-radius: 5px;
        background: #f3f4f6;
        color: #374151;
      }
      .cat-pill--automovil {
        background: #eff6ff;
        color: #1d4ed8;
      }
      .cat-pill--camioneta {
        background: #f0fdf4;
        color: #166534;
      }
      .cat-pill--camion {
        background: #fef9ec;
        color: #854d0e;
      }
      .cat-pill--pickup {
        background: #fdf4ff;
        color: #6b21a8;
      }
      .cat-pill--tractor {
        background: #fff7ed;
        color: #9a3412;
      }
      .cat-pill--hibrido {
        background: #f0fdf4;
        color: #166534;
      }
      .cat-pill--electrico {
        background: #f0fdfa;
        color: #0f766e;
      }
      .cat-pill--suv {
        background: #eff6ff;
        color: #1e40af;
      }
      /* Precio */
      .td-precio {
        text-align: right;
      }
      .precio-range {
        font-variant-numeric: tabular-nums;
        font-size: 12.5px;
        font-weight: 500;
        color: #0d1017;
      }
      /* Años pills */
      .td-anios {
        text-align: center;
      }
      .anios-pills {
        display: flex;
        gap: 2px;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 180px;
      }
      .anio-pill {
        font-size: 10px;
        font-weight: 500;
        padding: 1px 4px;
        background: #f3f4f6;
        color: #4b5563;
        border-radius: 3px;
        font-variant-numeric: tabular-nums;
      }

      /* ── Actions ─────────────────────────────────────────────────────────────── */
      .td-actions {
        position: relative;
        white-space: nowrap;
        padding-right: 12px !important;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 7px;
        cursor: pointer;
        background: transparent;
        color: #9ea3ae;
        transition:
          background 0.12s,
          color 0.12s;
      }
      .action-btn:hover {
        background: #f3f4f6;
      }
      .action-btn--edit:hover {
        color: #1d4ed8;
      }
      .action-btn--delete:hover {
        color: #c61d26;
      }
      .action-btn--delete.confirming {
        color: #c61d26;
        background: #fef2f2;
      }
      /* Popconfirm */
      .popconfirm {
        position: absolute;
        right: 0;
        top: calc(100% + 6px);
        z-index: 50;
        width: 240px;
        background: #fff;
        border: 1px solid #e4e7ec;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        padding: 12px 14px;
      }
      .popconfirm-msg {
        font-size: 12.5px;
        color: #374151;
        margin-bottom: 10px;
        font-weight: 500;
      }
      .popconfirm-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }
      .popconfirm-cancel {
        padding: 5px 10px;
        font-size: 12px;
        border: 1px solid #e4e7ec;
        border-radius: 6px;
        background: #f9fafb;
        color: #374151;
        cursor: pointer;
      }
      .popconfirm-confirm {
        padding: 5px 12px;
        font-size: 12px;
        border: none;
        border-radius: 6px;
        background: #c61d26;
        color: #fff;
        cursor: pointer;
        font-weight: 500;
      }
      .popconfirm-confirm:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* ── Expanded row ────────────────────────────────────────────────────────── */
      .expanded-row td {
        padding: 0 !important;
      }
      .expanded-body {
        padding: 16px 56px 20px;
        background: #fdfcfc;
        border-bottom: 1px solid #f3f4f6;
      }
      .detail-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .detail-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .detail-meta-row {
        display: flex;
        gap: 12px;
        font-size: 12px;
      }
      .detail-lbl {
        min-width: 90px;
        color: #9ea3ae;
        font-weight: 500;
      }
      .detail-val {
        color: #374151;
      }
      .price-table-wrap {
        overflow-x: auto;
      }
      .price-table {
        border-collapse: collapse;
        font-size: 12px;
      }
      .price-table th {
        padding: 5px 10px;
        background: #f3f4f6;
        color: #6b7280;
        font-weight: 600;
        font-size: 10.5px;
        text-align: center;
        border: 1px solid #e4e7ec;
        white-space: nowrap;
      }
      .price-table td {
        padding: 6px 10px;
        text-align: center;
        border: 1px solid #e4e7ec;
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        color: #0d1017;
      }

      /* ── Skeleton ────────────────────────────────────────────────────────────── */
      .skeleton-row td {
        padding: 12px 14px;
      }
      .skel {
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
      .skel-sm {
        width: 48px;
      }
      .skel-md {
        width: 90px;
      }
      .skel-lg {
        width: 140px;
      }
      .skel-code {
        width: 80px;
      }

      /* ── Empty state ─────────────────────────────────────────────────────────── */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 56px 0;
        gap: 8px;
      }
      .empty-icon {
        margin-bottom: 4px;
      }
      .empty-title {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }
      .empty-sub {
        font-size: 13px;
        color: #9ea3ae;
        text-align: center;
        max-width: 280px;
      }
      .link {
        color: #c61d26;
        text-decoration: underline;
      }

      /* ── Pagination ──────────────────────────────────────────────────────────── */
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 4px;
        font-size: 13px;
        color: #6b7280;
      }
      .pagination-btns {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .page-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: 1px solid #e4e7ec;
        border-radius: 7px;
        background: #fff;
        cursor: pointer;
        color: #374151;
        transition: background 0.12s;
      }
      .page-btn:hover:not(:disabled) {
        background: #f3f4f6;
      }
      .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .page-indicator {
        font-size: 12px;
        font-weight: 500;
        padding: 0 4px;
      }

      /* ── Edit panel ──────────────────────────────────────────────────────────── */
      .panel-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(13, 16, 23, 0.3);
        backdrop-filter: blur(2px);
        z-index: 40;
        animation: fadeIn 0.2s ease-out;
      }
      .edit-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 480px;
        max-width: 95vw;
        background: #fff;
        box-shadow: -8px 0 40px rgba(0, 0, 0, 0.14);
        z-index: 41;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .edit-panel.open {
        transform: translateX(0);
      }
      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 24px 24px 16px;
        border-bottom: 1px solid #f3f4f6;
      }
      .panel-close {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        color: #6b7280;
        transition: background 0.12s;
        flex-shrink: 0;
      }
      .panel-close:hover {
        background: #e5e7eb;
      }
      .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }
      .panel-section {
        padding: 20px 24px;
        border-bottom: 1px solid #f9fafb;
      }
      .panel-section:last-child {
        border-bottom: none;
      }
      .panel-section-title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #9ea3ae;
        margin-bottom: 14px;
      }
      .panel-field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      .panel-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .panel-lbl {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
      }
      .panel-input {
        padding: 8px 10px;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
        font-size: 13px;
        color: #0d1017;
        background: #f9fafb;
        outline: none;
        transition:
          border-color 0.15s,
          box-shadow 0.15s;
        width: 100%;
        box-sizing: border-box;
      }
      .panel-input:focus {
        border-color: #c61d26;
        box-shadow: 0 0 0 3px rgba(198, 29, 38, 0.08);
        background: #fff;
      }
      .panel-readonly {
        padding: 8px 10px;
        background: #f3f4f6;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
        font-size: 12.5px;
        color: #6b7280;
      }
      .panel-hint {
        font-size: 11.5px;
        color: #9ea3ae;
        margin-top: 5px;
        line-height: 1.5;
      }
      /* Genérico toggle */
      .generic-toggle-wrap {
        display: flex;
        gap: 0;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
        overflow: hidden;
        width: fit-content;
      }
      .generic-toggle-btn {
        padding: 7px 16px;
        font-size: 12.5px;
        font-weight: 500;
        border: none;
        background: #f9fafb;
        color: #6b7280;
        cursor: pointer;
        transition:
          background 0.12s,
          color 0.12s;
      }
      .generic-toggle-btn.active {
        background: #0d1017;
        color: #fff;
      }
      /* Price edit grid */
      .price-edit-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        gap: 8px;
      }
      .price-edit-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .price-edit-lbl {
        font-size: 10.5px;
        font-weight: 600;
        color: #6b7280;
        text-align: center;
      }
      .price-edit-input-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .price-edit-prefix {
        position: absolute;
        left: 6px;
        font-size: 12px;
        color: #9ea3ae;
        pointer-events: none;
      }
      .price-edit-input {
        width: 100%;
        padding: 6px 6px 6px 16px;
        border: 1px solid #e4e7ec;
        border-radius: 7px;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        text-align: right;
        background: #f9fafb;
        color: #0d1017;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
      }
      .price-edit-input:focus {
        border-color: #c61d26;
        background: #fff;
      }
      /* Remove number spinners */
      .price-edit-input::-webkit-outer-spin-button,
      .price-edit-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .price-edit-input[type='number'] {
        -moz-appearance: textfield;
      }

      /* Panel footer */
      .panel-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 24px;
        border-top: 1px solid #f3f4f6;
        background: #fff;
      }
      .panel-cancel {
        padding: 8px 16px;
        font-size: 13px;
        border: 1px solid #e4e7ec;
        border-radius: 9px;
        background: #fff;
        color: #374151;
        cursor: pointer;
        transition: background 0.12s;
      }
      .panel-cancel:hover {
        background: #f3f4f6;
      }
      .panel-save {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 20px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        border-radius: 9px;
        background: #0d1017;
        color: #fff;
        cursor: pointer;
        transition: background 0.12s;
      }
      .panel-save:hover:not(:disabled) {
        background: #1e2330;
      }
      .panel-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* ── Spinner / animations ────────────────────────────────────────────────── */
      .spinner-sm {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ── Create button ────────────────────────────────────────────────────────── */
      .create-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        border-radius: 9px;
        background: #c61d26;
        color: #fff;
        cursor: pointer;
        transition:
          background 0.12s,
          box-shadow 0.12s;
        white-space: nowrap;
      }
      .create-btn:hover {
        background: #a31820;
        box-shadow: 0 2px 8px rgba(198, 29, 38, 0.25);
      }

      /* ── Estilos Responsive ───────────────────────────────────────────────────── */
      @media (max-width: 1024px) {
        /* Tabla: ocultar columnas no esenciales */
        .catalog-table th:nth-child(3),  /* Marca */
  .catalog-table td.td-marca {
          display: none;
        }

        .filter-bar {
          gap: 6px;
        }
        .filter-select {
          font-size: 11px;
          padding: 6px 8px;
        }
      }

      @media (max-width: 768px) {
        /* Header: apilar stats + botón crear */
        .mb-6.flex.items-start {
          flex-direction: column;
        }

        /* Filter bar: apilar todos los elementos */
        .filter-bar {
          flex-direction: column;
          align-items: stretch;
        }
        .filter-search-wrap {
          min-width: unset;
        }
        .filter-toggle-wrap {
          justify-content: center;
        }
        .filter-chips {
          justify-content: center;
        }

        /* Tabla: convertir a cards */
        .table-wrap {
          border-radius: 10px;
          overflow: visible;
        }
        .catalog-table,
        .catalog-table thead {
          display: none;
        }
        .catalog-table tbody,
        .catalog-table tr,
        .catalog-table td {
          display: block;
        }

        .catalog-row {
          display: block !important;
          padding: 12px 14px;
          border-bottom: 1px solid #f3f4f6;
          position: relative;
          cursor: pointer;
        }
        .catalog-row:hover {
          background: #fafafa;
        }
        .catalog-row td {
          padding: 4px 0 !important;
        }
        .td-chevron {
          display: none !important;
        }
        .td-fraccion {
          margin-bottom: 6px;
        }
        .td-fraccion .fraccion-badge {
          font-size: 12px;
        }
        .td-marca {
          display: block !important;
          color: #6b7280;
          font-size: 12px;
        }
        .td-marca::before {
          content: 'Marca: ';
          font-weight: 600;
          color: #9ea3ae;
        }
        .td-modelo {
          font-size: 14px;
          font-weight: 600;
        }
        .td-cat {
          margin: 4px 0;
        }
        .td-precio {
          text-align: left;
        }
        .td-anios {
          text-align: left;
        }
        .anios-pills {
          justify-content: flex-start;
        }
        .td-actions {
          position: static !important;
          margin-top: 8px;
        }

        /* Expanded row en mobile */
        .expanded-body {
          padding: 12px 14px !important;
        }
        .detail-meta-row {
          flex-direction: column;
          gap: 2px !important;
        }
        .detail-lbl {
          min-width: unset !important;
        }

        /* Panel: full-width en mobile */
        .edit-panel {
          width: 100vw !important;
          max-width: 100vw !important;
        }

        /* Panel grid: single column */
        .panel-field-row {
          grid-template-columns: 1fr !important;
        }

        /* Precios edit grid: 3 columnas en mobile */
        .price-edit-grid {
          grid-template-columns: repeat(3, 1fr) !important;
        }

        /* Stats se apilan */
        .header-stats {
          width: 100%;
        }

        /* Pagination */
        .pagination {
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }
      }

      @media (max-width: 480px) {
        /* Precios edit grid: 2 columnas */
        .price-edit-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }

        /* Skeleton rows también responsive */
        .skeleton-row td {
          display: block;
          padding: 8px 14px;
        }
        .skeleton-row td:not(:first-child) {
          display: none;
        }

        /* Empty state padding reducido */
        .empty-state {
          padding: 32px 0;
        }
      }
    </style>
  `,
})
export class CatalogoPreciosComponent implements OnInit {
  protected Math = Math;

  private svc = inject(CatalogoPreciosService);
  private notify = inject(NotificationService);

  // ── Filters ────────────────────────────────────────────────────────────────
  searchText = '';
  filterFraccion = '';
  filterTipo = '';
  filterGenerico: boolean | undefined = undefined;

  readonly fracciones = FRACCIONES;
  readonly tipos = TIPOS;
  readonly skeletons = Array(8);
  readonly pageSize = 50;

  // ── State signals ──────────────────────────────────────────────────────────
  loading = signal(false);
  items = signal<CatalogoPrecioListDto[]>([]);
  totalItems = signal(0);
  currentPage = signal(1);
  stats = signal<CatalogoStatsDto | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));

  // Row expansion
  expandedId = signal<string | null>(null);
  loadingDetail = signal(false);
  detail = signal<CatalogoPrecioDetailDto | null>(null);

  // Delete
  deletingId = signal<string | null>(null);
  deleteLoading = signal(false);

  // Edit panel
  panelMode = signal<'edit' | 'create'>('edit');
  editPanelOpen = signal(false);
  saveLoading = signal(false);
  createFraccionCodigo = '8703.23.02'; // plain property — ngModel lo bindea correctamente
  editForm:
    | (CatalogoPrecioDetailDto & {
        precios: { id: string; antiguedadAnios: number; precioUsd: number }[];
      })
    | null = null;

  // Search debounce
  private search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.loadPage(1));
  }

  ngOnInit(): void {
    this.loadPage(1);
    this.loadStats();
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadPage(page: number): void {
    this.currentPage.set(page);
    this.expandedId.set(null);
    this.deletingId.set(null);
    this.loading.set(true);

    this.svc
      .getList({
        search: this.searchText || undefined,
        fraccion: this.filterFraccion || undefined,
        tipoVehiculo: this.filterTipo || undefined,
        esGenerico: this.filterGenerico,
        page,
        pageSize: this.pageSize,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.items.set(result.items);
          this.totalItems.set(result.total);
        },
        error: err => this.notify.fromHttpError(err, 'Error al cargar el catálogo'),
      });
  }

  loadStats(): void {
    this.svc.getStats().subscribe({
      next: s => this.stats.set(s),
      error: () => {}, // no-critical, stats are cosmetic
    });
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  onSearchChange(value: string): void {
    this.searchText = value;
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchText = '';
    this.loadPage(1);
  }

  toggleGenerico(val: boolean): void {
    this.filterGenerico = this.filterGenerico === val ? undefined : val;
    this.loadPage(1);
  }

  // ── Row expansion ──────────────────────────────────────────────────────────

  toggleExpand(id: string): void {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.detail.set(null);
      return;
    }
    this.expandedId.set(id);
    this.detail.set(null);
    this.loadingDetail.set(true);
    this.svc
      .getById(id)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: d => this.detail.set(d),
        error: err => this.notify.fromHttpError(err, 'Error al cargar detalle'),
      });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(item: CatalogoPrecioListDto): void {
    this.deletingId.set(this.deletingId() === item.id ? null : item.id);
  }

  executeDelete(id: string): void {
    this.deleteLoading.set(true);
    this.svc
      .delete(id)
      .pipe(finalize(() => this.deleteLoading.set(false)))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.notify.success('Entrada eliminada del catálogo.');
          this.loadPage(this.currentPage());
          this.loadStats();
        },
        error: err => this.notify.fromHttpError(err, 'Error al eliminar'),
      });
  }

  // ── Edit/Create panel ────────────────────────────────────────────────────────

  openCreate(): void {
    this.panelMode.set('create');
    this.createFraccionCodigo = '8703.23.02';
    this.editForm = {
      id: '',
      fraccion: this.createFraccionCodigo,
      fraccionDescripcion: '',
      tipoVehiculo: null,
      marcaId: null,
      marcaTexto: '',
      modelo: '',
      categoria: 'AUTOMOVIL',
      inciso: null,
      esGenerico: false,
      hojaOrigen: null,
      aniosDisponibles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      precioMinUsd: null,
      precioMaxUsd: null,
      precios: Array.from({ length: 12 }, (_, i) => ({
        id: '',
        antiguedadAnios: i + 1,
        precioUsd: 0,
      })),
    };
    this.editPanelOpen.set(true);
  }

  openEdit(item: CatalogoPrecioListDto): void {
    this.panelMode.set('edit');
    this.svc.getById(item.id).subscribe({
      next: d => {
        this.editForm = {
          ...d,
          precios: d.precios.map(p => ({ ...p })),
        };
        this.editPanelOpen.set(true);
      },
      error: err => this.notify.fromHttpError(err, 'Error al cargar entrada'),
    });
  }

  closeEdit(): void {
    this.editPanelOpen.set(false);
    this.editForm = null;
    this.panelMode.set('edit');
  }

  saveEdit(): void {
    if (!this.editForm) return;
    this.saveLoading.set(true);

    if (this.panelMode() === 'create') {
      const request: CreateCatalogoPrecioRequest = {
        fraccionCodigo: this.createFraccionCodigo,
        marcaTexto: this.editForm.marcaTexto,
        modelo: this.editForm.modelo,
        categoria: this.editForm.categoria,
        inciso: this.editForm.inciso,
        hojaOrigen: this.editForm.hojaOrigen,
        esGenerico: this.editForm.esGenerico,
        precios: this.editForm.precios.map(p => ({
          antiguedadAnios: p.antiguedadAnios,
          precioUsd: p.precioUsd,
        })),
      };

      this.svc
        .create(request)
        .pipe(finalize(() => this.saveLoading.set(false)))
        .subscribe({
          next: () => {
            this.notify.success('Entrada creada correctamente.');
            this.closeEdit();
            this.loadPage(1);
            this.loadStats();
          },
          error: err => this.notify.fromHttpError(err, 'Error al crear'),
        });
    } else {
      const request: UpdateCatalogoPrecioRequest = {
        marcaTexto: this.editForm.marcaTexto,
        modelo: this.editForm.modelo,
        categoria: this.editForm.categoria,
        inciso: this.editForm.inciso,
        hojaOrigen: this.editForm.hojaOrigen,
        esGenerico: this.editForm.esGenerico,
        precios: this.editForm.precios.map(p => ({ id: p.id, precioUsd: p.precioUsd })),
      };

      this.svc
        .update(this.editForm.id, request)
        .pipe(finalize(() => this.saveLoading.set(false)))
        .subscribe({
          next: () => {
            this.notify.success('Entrada actualizada correctamente.');
            this.closeEdit();
            this.loadPage(this.currentPage());
          },
          error: err => this.notify.fromHttpError(err, 'Error al guardar'),
        });
    }
  }

  // Dismiss popconfirm when clicking outside
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.editPanelOpen()) {
      this.closeEdit();
      return;
    }
    if (this.deletingId()) {
      this.deletingId.set(null);
    }
  }
}
