import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PagoListDto, PagoService } from '../../services/pago.service';
import { GastoHormigaListDto, GastoHormigaService } from '../../services/gasto-hormiga.service';
import {
  TramiteListDto,
  TramiteService,
  TramiteDashboardDto,
} from '../../services/tramite.service';
import { CotizacionDashboardDto, CotizacionService } from '../../services/cotizacion.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div style="font-family: var(--font-body);">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 stagger-item"
      >
        <div>
          <p class="page-eyebrow">{{ today }}</p>
          <h1 class="page-title">Dashboard</h1>
        </div>
        <button
          (click)="router.navigate(['/tramites'])"
          class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo trámite
        </button>
      </div>

      <!-- Stat strip — operacional, no decorativo -->
      <div
        class="stat-strip card-elevated rounded-2xl mb-5 stagger-item"
        style="animation-delay:40ms;"
      >
        <div class="stat-cell">
          <span class="stat-label">Trámites activos</span>
          @if (loading()) {
            <div class="h-7 w-12 shimmer rounded mt-1 mb-1"></div>
          } @else {
            <span class="stat-value">{{ dash.activos }}</span>
          }
          <span class="stat-sub">
            @if (!loading()) {
              {{ dash.verdesEsteMes }} completados · {{ dash.amarillosPendientePago }} pend. pago
            }
          </span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-cell">
          <span class="stat-label">Cobrado este mes</span>
          @if (loading()) {
            <div class="h-7 w-28 shimmer rounded mt-1 mb-1"></div>
          } @else {
            <span class="stat-value stat-value--money">{{
              dash.cobradoMes | currency: 'MXN' : 'symbol' : '1.0-0'
            }}</span>
          }
          <span class="stat-sub stat-sub--ok">
            @if (!loading()) {
              Conciliado con banco
            }
          </span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-cell">
          <span class="stat-label">Por cobrar</span>
          @if (loading()) {
            <div class="h-7 w-24 shimmer rounded mt-1 mb-1"></div>
          } @else {
            <span class="stat-value stat-value--warn">{{
              dash.porCobrar | currency: 'MXN' : 'symbol' : '1.0-0'
            }}</span>
          }
          <span class="stat-sub stat-sub--warn">
            @if (!loading()) {
              {{ dash.amarillosPendientePago }} trámites pendientes
            }
          </span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-cell">
          <span class="stat-label">Vehículos en patio</span>
          @if (loading()) {
            <div class="h-7 w-10 shimmer rounded mt-1 mb-1"></div>
          } @else {
            <span class="stat-value"
              >{{ dash.vehiculosEnPatio }}<span class="stat-unit">uds</span></span
            >
          }
          <span class="stat-sub">
            @if (!loading()) {
              Sin trámite completo
            }
          </span>
        </div>
      </div>

      <!-- Cotizaciones strip -->
      <div
        class="card-elevated rounded-2xl mb-5 stagger-item overflow-hidden"
        style="animation-delay:80ms;"
      >
        <div class="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
          <p class="text-[13px] font-semibold text-[var(--n-800)]">Cotizaciones</p>
          <button
            (click)="router.navigate(['/cotizaciones'])"
            class="text-[12px] font-medium text-[var(--rr-600)]"
          >
            Ver todas
          </button>
        </div>
        <div
          class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]"
        >
          <div class="px-6 py-4">
            <p class="stat-label mb-1">Pendientes de respuesta</p>
            @if (loading()) {
              <div class="h-6 w-10 shimmer rounded mt-1"></div>
            } @else {
              <p class="text-[22px] font-semibold text-[var(--n-900)] tabular-nums tracking-tight">
                {{ cotDash.pendientesRespuesta }}
              </p>
            }
          </div>
          <div class="px-6 py-4">
            <p class="stat-label mb-1">Por expirar (2 días)</p>
            @if (loading()) {
              <div class="h-6 w-10 shimmer rounded mt-1"></div>
            } @else {
              <p
                class="text-[22px] font-semibold tabular-nums tracking-tight"
                [style.color]="cotDash.porExpirar > 0 ? 'var(--amber)' : 'var(--n-900)'"
              >
                {{ cotDash.porExpirar }}
              </p>
            }
          </div>
          <div class="px-6 py-4">
            <p class="stat-label mb-2">Aceptadas — listas para convertir</p>
            @if (loading()) {
              <div class="space-y-2">
                <div class="h-9 w-full shimmer rounded-lg"></div>
                <div class="h-9 w-full shimmer rounded-lg" style="animation-delay:100ms"></div>
              </div>
            } @else {
              @for (c of cotDash.aceptadasListas; track c.id) {
                <button
                  (click)="router.navigate(['/cotizaciones', c.id])"
                  class="mb-1.5 flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-[12px] hover:bg-[var(--n-50)] transition-colors"
                >
                  <span class="text-[var(--n-700)]"
                    >{{ c.folio }} · {{ c.clienteNombre || 'Sin cliente' }}</span
                  >
                  <strong class="font-mono-data text-[var(--n-900)]">{{
                    c.total | currency: 'MXN' : 'symbol' : '1.0-0'
                  }}</strong>
                </button>
              } @empty {
                <div class="flex items-center gap-2 py-1">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    class="w-4 h-4 stroke-2 text-[var(--n-300)] shrink-0"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p class="text-[12.5px] text-[var(--n-400)]">
                    Sin cotizaciones aceptadas pendientes
                  </p>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5 mb-5">
        <!-- Trámites recientes -->
        <section
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay:120ms;"
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div>
              <p class="text-[13px] font-semibold text-[var(--n-800)]">Trámites recientes</p>
              <p class="text-[12px] text-[var(--n-400)]">Últimos movimientos registrados</p>
            </div>
            <button
              (click)="router.navigate(['/tramites'])"
              class="text-[12px] font-medium text-[var(--rr-600)] hover:text-[var(--rr-700)] transition-colors"
            >
              Ver todos
            </button>
          </div>
          <div>
            @if (loading()) {
              <div class="px-6 py-4 space-y-3">
                <div class="h-11 w-full shimmer rounded-lg"></div>
                <div class="h-11 w-full shimmer rounded-lg" style="animation-delay:80ms"></div>
                <div class="h-11 w-full shimmer rounded-lg" style="animation-delay:160ms"></div>
              </div>
            } @else {
              @for (t of tramitesRecientes; track t.id) {
                <button
                  (click)="router.navigate(['/tramites', t.id])"
                  class="w-full grid grid-cols-1 sm:grid-cols-[110px_1fr_auto_auto] gap-x-4 gap-y-1 items-center px-6 py-3 text-left border-b border-[var(--n-100)] hover:bg-[var(--n-50)] transition-colors last:border-0"
                >
                  <span class="font-mono-data text-[12px] font-semibold text-[var(--n-900)]">{{
                    t.numeroConsecutivo
                  }}</span>
                  <span class="min-w-0">
                    <span class="block text-[13px] font-medium text-[var(--n-800)] truncate">{{
                      t.clienteApodo || 'Sin cliente'
                    }}</span>
                    <span class="block text-[11.5px] text-[var(--n-400)] truncate">{{
                      t.vehiculoMarcaModelo || t.vehiculoVinCorto || 'Sin vehículo'
                    }}</span>
                  </span>
                  <span class="hidden sm:inline-flex badge" [class]="statusBadgeClass(t.estatus)">{{
                    t.estatus
                  }}</span>
                  <span
                    class="font-mono-data text-[12.5px] font-semibold tabular-nums"
                    [style.color]="t.saldoPendiente > 0 ? 'var(--amber)' : 'var(--green)'"
                  >
                    {{ t.saldoPendiente | currency: 'MXN' : 'symbol' : '1.0-0' }}
                  </span>
                </button>
              } @empty {
                <div class="flex flex-col items-center justify-center py-14 px-6 text-center">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    class="w-8 h-8 stroke-[1.5] text-[var(--n-300)] mb-3"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p class="text-[13px] font-medium text-[var(--n-600)] mb-1">
                    Sin trámites registrados
                  </p>
                  <p class="text-[12px] text-[var(--n-400)] mb-4">
                    Los trámites se inician desde una cotización aceptada.
                  </p>
                  <button
                    (click)="router.navigate(['/cotizaciones/nueva'])"
                    class="text-[12px] font-semibold text-[var(--rr-600)] hover:text-[var(--rr-700)] transition-colors"
                  >
                    Nueva cotización →
                  </button>
                </div>
              }
            }
          </div>
        </section>

        <!-- Pagos por verificar -->
        <section
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay:160ms;"
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div>
              <p class="text-[13px] font-semibold text-[var(--n-800)]">Pagos por verificar</p>
              <p class="text-[12px] text-[var(--n-400)]">Control contra banco</p>
            </div>
            <button
              (click)="router.navigate(['/pagos'])"
              class="text-[12px] font-medium text-[var(--rr-600)] hover:text-[var(--rr-700)] transition-colors"
            >
              Ver pagos
            </button>
          </div>
          <div>
            @if (loading()) {
              <div class="px-6 py-4 space-y-3">
                <div class="h-10 w-full shimmer rounded-lg"></div>
                <div class="h-10 w-full shimmer rounded-lg" style="animation-delay:80ms"></div>
              </div>
            } @else {
              @for (p of pagosPendientes; track p.id) {
                <div
                  class="flex items-center justify-between gap-3 px-6 py-3 border-b border-[var(--n-100)] last:border-0"
                >
                  <div class="min-w-0">
                    <p class="text-[13px] font-medium text-[var(--n-800)] truncate">
                      {{ p.clienteNombre || 'Sin cliente' }}
                    </p>
                    <p class="text-[11.5px] text-[var(--n-400)]">
                      {{ p.numeroConsecutivo }} · {{ p.fechaPago | date: 'dd/MM/yyyy' }}
                    </p>
                  </div>
                  <p
                    class="font-mono-data text-[13px] font-semibold tabular-nums text-[var(--n-900)] shrink-0"
                  >
                    {{ p.monto | currency: p.moneda : 'symbol' : '1.2-2' }}
                  </p>
                </div>
              } @empty {
                <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div
                    class="w-10 h-10 rounded-full bg-[var(--green-soft)] flex items-center justify-center mb-3"
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      class="w-5 h-5 stroke-2 text-[var(--green)]"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p class="text-[13px] font-semibold text-[var(--n-800)] mb-1">Todo al día</p>
                  <p class="text-[12px] text-[var(--n-400)]">
                    No hay comprobantes pendientes de verificar.
                  </p>
                </div>
              }
            }
          </div>
        </section>
      </div>

      <!-- Trámites atrasados -->
      @if (!loading() && tramitesAtrasados.length > 0) {
        <section
          class="card-elevated rounded-2xl overflow-hidden stagger-item mb-5"
          style="animation-delay:185ms;"
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-[#B0181F] animate-pulse"></div>
              <div>
                <p class="text-[13px] font-semibold text-[var(--n-800)]">Trámites sin avance</p>
                <p class="text-[12px] text-[var(--n-400)]">
                  Activos con más de 7 días en el mismo estado
                </p>
              </div>
            </div>
            <button
              (click)="router.navigate(['/tramites'])"
              class="text-[12px] font-medium text-[var(--rr-600)] hover:text-[var(--rr-700)] transition-colors"
            >
              Ver todos
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-[12.5px]">
              <thead>
                <tr class="border-b border-[var(--n-100)] bg-[#FFFBFB]">
                  <th
                    class="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#9EA3AE]"
                  >
                    #
                  </th>
                  <th
                    class="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#9EA3AE]"
                  >
                    Cliente
                  </th>
                  <th
                    class="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#9EA3AE]"
                  >
                    Tramitador
                  </th>
                  <th
                    class="text-left px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#9EA3AE]"
                  >
                    Estado
                  </th>
                  <th
                    class="text-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#9EA3AE]"
                  >
                    Días
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (t of tramitesAtrasados; track t.id) {
                  <tr
                    (click)="router.navigate(['/tramites', t.id])"
                    class="border-b border-[var(--n-100)] hover:bg-[#FAFBFC] cursor-pointer transition-colors last:border-0"
                  >
                    <td class="px-5 py-3 font-mono-data font-semibold text-[#0D1017]">
                      {{ t.numeroConsecutivo }}
                    </td>
                    <td class="px-5 py-3 text-[#374151]">{{ t.clienteApodo || '—' }}</td>
                    <td class="px-5 py-3 text-[#6B717F]">{{ t.tramitadorNombre || '—' }}</td>
                    <td class="px-5 py-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                        [class]="statusBadgeClass(t.estatus)"
                      >
                        {{ t.estatus }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <span
                        class="inline-flex items-center justify-center w-10 h-6 rounded-lg text-[11px] font-bold"
                        [style.background]="
                          t.diasEnEstado >= 30
                            ? '#FEE2E2'
                            : t.diasEnEstado >= 15
                              ? '#FEF3C7'
                              : '#F3F4F6'
                        "
                        [style.color]="
                          t.diasEnEstado >= 30
                            ? '#991B1B'
                            : t.diasEnEstado >= 15
                              ? '#92400E'
                              : '#4B5162'
                        "
                      >
                        {{ t.diasEnEstado }}d
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- Gastos hormiga -->
      <section
        class="card-elevated rounded-2xl overflow-hidden stagger-item"
        style="animation-delay:200ms;"
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <p class="text-[13px] font-semibold text-[var(--n-800)]">Gastos hormiga recientes</p>
            <p class="text-[12px] text-[var(--n-400)]">Últimos costos registrados en operación</p>
          </div>
          <button
            (click)="router.navigate(['/gastos-hormiga'])"
            class="text-[12px] font-medium text-[var(--rr-600)] hover:text-[var(--rr-700)] transition-colors"
          >
            Ver gastos
          </button>
        </div>
        @if (loading()) {
          <div
            class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]"
          >
            <div class="p-5"><div class="h-16 shimmer rounded-xl"></div></div>
            <div class="p-5">
              <div class="h-16 shimmer rounded-xl" style="animation-delay:80ms"></div>
            </div>
            <div class="p-5">
              <div class="h-16 shimmer rounded-xl" style="animation-delay:160ms"></div>
            </div>
          </div>
        } @else {
          <div
            class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--n-100)]"
          >
            @for (g of gastosRecientes; track g.id) {
              <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-1.5">
                  <p class="text-[13px] font-semibold text-[var(--n-800)] line-clamp-1">
                    {{ g.concepto }}
                  </p>
                  <span
                    class="badge shrink-0"
                    [class]="g.seCargaAlCliente ? 'badge-pendiente' : 'badge-neutral'"
                  >
                    {{ g.seCargaAlCliente ? 'Cargable' : 'Propio' }}
                  </span>
                </div>
                <p class="text-[11.5px] text-[var(--n-400)] mb-3">
                  {{ g.clienteNombre || 'Sin cliente' }} · {{ g.fechaGasto | date: 'dd/MM/yyyy' }}
                </p>
                <p
                  class="font-mono-data text-[19px] font-semibold text-[var(--n-900)] tabular-nums"
                >
                  {{ g.monto | currency: g.moneda }}
                </p>
              </div>
            } @empty {
              <div
                class="col-span-3 flex flex-col items-center justify-center py-12 px-6 text-center"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="w-7 h-7 stroke-[1.5] text-[var(--n-300)] mb-3"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p class="text-[13px] font-medium text-[var(--n-600)] mb-1">
                  Sin gastos registrados
                </p>
                <p class="text-[12px] text-[var(--n-400)]">
                  Registra los costos de operación para tenerlos en control.
                </p>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [
    `
      /* Stat strip — operacional */
      .stat-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
      }
      @media (max-width: 767px) {
        .stat-strip {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 479px) {
        .stat-strip {
          grid-template-columns: 1fr;
        }
      }
      .stat-cell {
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
      }
      .stat-divider {
        width: 1px;
        background: var(--border);
        align-self: stretch;
      }
      @media (max-width: 767px) {
        .stat-divider:nth-child(4) {
          display: none;
        }
      }
      @media (max-width: 479px) {
        .stat-divider {
          display: none;
        }
        .stat-cell {
          border-bottom: 1px solid var(--border);
        }
        .stat-cell:last-child {
          border-bottom: none;
        }
      }
      .stat-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        color: var(--n-400);
        margin-bottom: 6px;
      }
      .stat-value {
        font-size: 26px;
        font-weight: 650;
        line-height: 1.1;
        color: var(--n-900);
        letter-spacing: -0.5px;
        font-variant-numeric: tabular-nums;
        margin-bottom: 5px;
      }
      .stat-value--money {
        font-size: 22px;
      }
      .stat-value--warn {
        color: var(--amber);
      }
      .stat-unit {
        font-size: 13px;
        font-weight: 400;
        color: var(--n-400);
        margin-left: 3px;
        letter-spacing: 0;
      }
      .stat-sub {
        font-size: 11.5px;
        color: var(--n-400);
        line-height: 1.4;
      }
      .stat-sub--ok {
        color: var(--green);
      }
      .stat-sub--warn {
        color: var(--amber);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private tramiteService = inject(TramiteService);
  private pagoService = inject(PagoService);
  private gastoService = inject(GastoHormigaService);
  private cotizacionService = inject(CotizacionService);
  router = inject(Router);

  loading = signal(true);

  today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly estadosTerminales = new Set([
    'VERDE_ENTREGADO',
    'ENTREGADO_AL_CLIENTE',
    'COBRADO',
    'CANCELADO',
  ]);

  dash: TramiteDashboardDto = {
    activos: 0,
    verdesEsteMes: 0,
    amarillosPendientePago: 0,
    cobradoMes: 0,
    porCobrar: 0,
    vehiculosEnPatio: 0,
  };
  cotDash: CotizacionDashboardDto = { pendientesRespuesta: 0, porExpirar: 0, aceptadasListas: [] };
  tramitesRecientes: TramiteListDto[] = [];
  tramitesAtrasados: TramiteListDto[] = [];
  pagosPendientes: PagoListDto[] = [];
  gastosRecientes: GastoHormigaListDto[] = [];

  ngOnInit() {
    forkJoin({
      dash: this.tramiteService.getDashboard(),
      cotDash: this.cotizacionService.getDashboard(),
      tramites: this.tramiteService.getList({ pageSize: 5 }),
      atrasados: this.tramiteService.getList({
        orderBy: 'fechaestado',
        orderDir: 'asc',
        pageSize: 20,
      }),
      pagos: this.pagoService.getList({ verificado: false, pageSize: 5 }),
      gastos: this.gastoService.getList({ pageSize: 3 }),
    }).subscribe({
      next: res => {
        this.dash = res.dash;
        this.cotDash = res.cotDash;
        this.tramitesRecientes = res.tramites.items;
        this.tramitesAtrasados = res.atrasados.items
          .filter(t => !this.estadosTerminales.has(t.estatus) && t.diasEnEstado >= 7)
          .slice(0, 6);
        this.pagosPendientes = res.pagos.items;
        this.gastosRecientes = res.gastos.items;
      },
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  statusBadgeClass(estatus: string): string {
    const finales = ['VERDE_ENTREGADO', 'ENTREGADO_AL_CLIENTE', 'COBRADO', 'CANCELADO'];
    if (finales.includes(estatus)) return 'badge-finalizado';

    const operativos = [
      'BAJA_EN_PROCESO',
      'BAJA_COMPLETADA',
      'LISTO_PARA_PEDIMENTO',
      'PEDIMENTO_DOCUMENTADO',
      'MANDADO_A_CRUCE',
      'ROJO_DESADUANADO',
      'EN_PROCESO',
    ];
    if (operativos.includes(estatus)) return 'badge-activo';

    return 'badge-pendiente';
  }
}
