import {
  Component, signal, inject, OnInit, OnDestroy,
  ViewChild, ElementRef,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ConversionCotizacionesDto, ReporteFinancieroDto, ReportePipelineDto,
  ReporteProductividadDto, GastoHormigaResumenDto, ReporteService,
} from '../../services/reporte.service';
import { ExcelExportService } from '../../services/excel-export.service';

const PALETTE = ['#C61D26','#0D1017','#16A34A','#D97706','#2563EB','#7C3AED','#0891B2','#F97316','#84CC16','#EC4899'];
const TEXT_STYLE = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: '#6B717F' };
const GRID_LIGHT  = { lineStyle: { color: '#F3F4F6', type: 'dashed' as const } };

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe, FormsModule, NgClass],
  template: `
    <div class="space-y-4">

      <!-- ══ HEADER ══ -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Análisis</p>
          <h1 class="text-[26px] font-bold leading-none text-[#0D1017] tracking-tight">Panel de Reportes</h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1.5 rounded-xl border border-[#E4E7EC] bg-white px-3 py-2">
            <input [(ngModel)]="desde" type="date" class="border-0 bg-transparent text-[13px] text-[#0D1017] outline-none w-[130px]" />
            <span class="text-[#C9C5CA]">—</span>
            <input [(ngModel)]="hasta" type="date" class="border-0 bg-transparent text-[13px] text-[#0D1017] outline-none w-[130px]" />
          </div>

          @if (activeTab() === 'Financiero') {
            <button (click)="toggleComparativo()"
              class="rounded-xl px-3 py-2 text-[12px] font-semibold transition-all border"
              [ngClass]="comparativoActivo()
                ? 'bg-[#0D1017] text-white border-[#0D1017]'
                : 'bg-white text-[#4B5162] border-[#E4E7EC] hover:bg-[#F3F4F6]'">
              ⇄ vs. anterior
            </button>
          }

          <button (click)="load()"
            class="rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1E2330] transition-colors">
            Actualizar
          </button>

          <button (click)="exportar()"
            class="flex items-center gap-1.5 rounded-xl border border-[#E4E7EC] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#4B5162] hover:bg-[#F3F4F6] transition-colors">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
            Excel
          </button>
        </div>
      </div>

      <!-- ══ TABS — scroll horizontal en móvil ══ -->
      <div class="overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        <div class="flex gap-1 rounded-xl bg-[#E4E7EC] p-1 w-fit min-w-full sm:min-w-fit">
          @for (tab of tabs; track tab) {
            <button (click)="selectTab(tab)"
              class="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition-all"
              [ngClass]="activeTab() === tab
                ? 'bg-white shadow-sm text-[#0D1017] font-semibold'
                : 'text-[#8B93A1] hover:text-[#0D1017] hover:bg-white/50'">
              {{ tab }}
            </button>
          }
        </div>
      </div>

      <!-- ══ LOADING ══ -->
      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="h-8 w-8 rounded-full border-[3px] border-[#E4E7EC] border-t-[#C61D26] animate-spin"></div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB: FINANCIERO -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      @if (!loading() && activeTab() === 'Financiero' && financiero()) {
        @let fin = financiero()!;

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="kpi">
            <span class="kpi-label">Cobrado Total</span>
            <strong class="kpi-val">{{ fin.cobradoTotal | currency:'MXN':'symbol':'1.0-0' }}</strong>
            @if (comparativoActivo() && financieroAnt()) {
              <span class="kpi-delta" [ngClass]="deltaPositive(fin.cobradoTotal, financieroAnt()!.cobradoTotal) ? 'text-[#16A34A]' : 'text-[#C61D26]'">
                {{ deltaStr(fin.cobradoTotal, financieroAnt()!.cobradoTotal) }}
                <span class="text-[#9EA3AE] font-normal">vs anterior</span>
              </span>
            }
          </div>
          <div class="kpi">
            <span class="kpi-label">Por Cobrar</span>
            <strong class="kpi-val" [style.color]="fin.porCobrarTotal > 0 ? '#D97706' : null">{{ fin.porCobrarTotal | currency:'MXN':'symbol':'1.0-0' }}</strong>
            @if (comparativoActivo() && financieroAnt()) {
              <span class="kpi-delta" [ngClass]="deltaPositive(fin.porCobrarTotal, financieroAnt()!.porCobrarTotal, false) ? 'text-[#16A34A]' : 'text-[#C61D26]'">
                {{ deltaStr(fin.porCobrarTotal, financieroAnt()!.porCobrarTotal) }}
                <span class="text-[#9EA3AE] font-normal">vs anterior</span>
              </span>
            }
          </div>
          <div class="kpi">
            <span class="kpi-label">Margen Bruto</span>
            <strong class="kpi-val">{{ fin.margenBruto | currency:'MXN':'symbol':'1.0-0' }}</strong>
            @if (comparativoActivo() && financieroAnt()) {
              <span class="kpi-delta" [ngClass]="deltaPositive(fin.margenBruto, financieroAnt()!.margenBruto) ? 'text-[#16A34A]' : 'text-[#C61D26]'">
                {{ deltaStr(fin.margenBruto, financieroAnt()!.margenBruto) }}
                <span class="text-[#9EA3AE] font-normal">vs anterior</span>
              </span>
            }
          </div>
          <div class="kpi">
            <span class="kpi-label">Gastos Hormiga</span>
            <strong class="kpi-val">{{ fin.gastosHormigaTotal | currency:'MXN':'symbol':'1.0-0' }}</strong>
            @if (comparativoActivo() && financieroAnt()) {
              <span class="kpi-delta" [ngClass]="deltaPositive(fin.gastosHormigaTotal, financieroAnt()!.gastosHormigaTotal, false) ? 'text-[#16A34A]' : 'text-[#C61D26]'">
                {{ deltaStr(fin.gastosHormigaTotal, financieroAnt()!.gastosHormigaTotal) }}
                <span class="text-[#9EA3AE] font-normal">vs anterior</span>
              </span>
            }
          </div>
        </div>

        <!-- KPI secundarios -->
        <div class="grid grid-cols-3 gap-3">
          <div class="kpi kpi-sm">
            <span class="kpi-label">Trámites cerrados</span>
            <strong class="kpi-val-sm">{{ fin.tramitesCerradosPeriodo }}</strong>
          </div>
          <div class="kpi kpi-sm">
            <span class="kpi-label">Trámites activos</span>
            <strong class="kpi-val-sm">{{ fin.tramitesActivosActual }}</strong>
          </div>
          <div class="kpi kpi-sm">
            <span class="kpi-label">Pend. verificar</span>
            <strong class="kpi-val-sm" [style.color]="fin.pagosPendientesVerificacion > 0 ? '#D97706' : null">{{ fin.pagosPendientesVerificacion }}</strong>
          </div>
        </div>

        <!-- Gráfica: evolución mensual -->
        <div class="card-elevated rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15px] font-semibold text-[#0D1017]">Evolución Mensual — Cobrado Verificado</h2>
          </div>
          @if (fin.evolucionMensual.length > 0) {
            <div #chartFin class="h-[260px] w-full"></div>
          } @else {
            <p class="text-center text-[13px] text-[#8B93A1] py-10">Sin datos de evolución en el período seleccionado.</p>
          }
        </div>

        <!-- Tabla mensual -->
        <div class="card-elevated rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px] min-w-[320px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Mes</th>
                  <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cobrado Verificado</th>
                </tr>
              </thead>
              <tbody>
                @for (m of fin.evolucionMensual; track m.mesNombre) {
                  <tr class="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="px-4 py-2.5">{{ m.mesNombre }}</td>
                    <td class="px-4 py-2.5 text-right font-mono-data font-semibold">{{ m.cobradoVerificado | currency:'MXN':'symbol':'1.0-0' }}</td>
                  </tr>
                }
                @if (fin.evolucionMensual.length === 0) {
                  <tr><td colspan="2" class="px-4 py-6 text-center text-[#8B93A1]">Sin datos en este período</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB: PIPELINE -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      @if (!loading() && activeTab() === 'Pipeline' && pipelineData()) {
        @let pipe = pipelineData()!;

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="kpi">
            <span class="kpi-label">Total Activos</span>
            <strong class="kpi-val">{{ pipe.totalActivos }}</strong>
          </div>
          <div class="kpi">
            <span class="kpi-label">Estados con trámites</span>
            <strong class="kpi-val">{{ pipe.estados.length }}</strong>
          </div>
          <div class="kpi">
            <span class="kpi-label">Valor total en proceso</span>
            <strong class="kpi-val">{{ totalPipeline(pipe) | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="card-elevated rounded-2xl p-5">
          <h2 class="text-[15px] font-semibold text-[#0D1017] mb-1">Trámites por Estado</h2>
          <p class="text-[12px] text-[#8B93A1] mb-4">Clic en una barra para ver los trámites de ese estado</p>
          <div #chartPipe class="h-[320px] w-full"></div>
        </div>

        <div class="card-elevated rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px] min-w-[480px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Estado</th>
                  <th class="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cant.</th>
                  <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Monto Total</th>
                  <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Días Prom.</th>
                </tr>
              </thead>
              <tbody>
                @for (e of pipe.estados; track e.estado) {
                  <tr class="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="px-4 py-2.5">
                      <span class="font-medium">{{ e.etiquetaCliente }}</span>
                      <span class="ml-1.5 text-[11px] text-[#9EA3AE]">{{ e.estado }}</span>
                    </td>
                    <td class="px-4 py-2.5 text-center font-mono-data font-semibold">{{ e.cantidad }}</td>
                    <td class="px-4 py-2.5 text-right font-mono-data">{{ e.montoTotal | currency:'MXN':'symbol':'1.0-0' }}</td>
                    <td class="px-4 py-2.5 text-right font-mono-data">{{ e.diasPromedioEnEstado | number:'1.1-1' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB: PRODUCTIVIDAD -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      @if (!loading() && activeTab() === 'Productividad' && productividad()) {
        @let prod = productividad()!;

        <div class="card-elevated rounded-2xl p-5">
          <h2 class="text-[15px] font-semibold text-[#0D1017] mb-4">Productividad por Tramitador</h2>
          @if (prod.tramitadores.length > 0) {
            <div #chartProd class="h-[260px] w-full"></div>
          } @else {
            <p class="text-center text-[13px] text-[#8B93A1] py-10">Sin datos en el período seleccionado.</p>
          }
        </div>

        <div class="card-elevated rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px] min-w-[560px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Tramitador</th>
                  <th class="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Activos</th>
                  <th class="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cerrados</th>
                  <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cobrado</th>
                  <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Verificado</th>
                  <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Días Prom.</th>
                </tr>
              </thead>
              <tbody>
                @for (t of prod.tramitadores; track t.tramitadorId) {
                  <tr class="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="px-4 py-2.5 font-medium">{{ t.nombre }}</td>
                    <td class="px-4 py-2.5 text-center font-mono-data">{{ t.tramitesActivos }}</td>
                    <td class="px-4 py-2.5 text-center font-mono-data">{{ t.tramitesCerradosPeriodo }}</td>
                    <td class="px-4 py-2.5 text-right font-mono-data">{{ t.montoTotalCobrado | currency:'MXN':'symbol':'1.0-0' }}</td>
                    <td class="px-4 py-2.5 text-right font-mono-data text-[#16A34A] font-semibold">{{ t.montoTotalVerificado | currency:'MXN':'symbol':'1.0-0' }}</td>
                    <td class="px-4 py-2.5 text-right font-mono-data">{{ t.diasPromedioResolucion | number:'1.1-1' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB: GASTOS -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      @if (!loading() && activeTab() === 'Gastos' && gastos()) {
        @let g = gastos()!;

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="kpi">
            <span class="kpi-label">Gasto Total</span>
            <strong class="kpi-val">{{ g.totalPeriodo | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="kpi">
            <span class="kpi-label">Cargable al Cliente</span>
            <strong class="kpi-val">{{ g.totalCargableCliente | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="kpi">
            <span class="kpi-label">Costo Propio</span>
            <strong class="kpi-val">{{ g.totalCostoPropio | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="card-elevated rounded-2xl p-5">
            <h2 class="text-[15px] font-semibold text-[#0D1017] mb-4">Distribución por Categoría</h2>
            @if (g.porCategoria.length > 0) {
              <div #chartGastos class="h-[260px] w-full"></div>
            } @else {
              <p class="text-center text-[13px] text-[#8B93A1] py-10">Sin datos.</p>
            }
          </div>

          <div class="card-elevated rounded-2xl overflow-hidden">
            <div class="px-5 pt-5 pb-3">
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Por Categoría</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-[13px]">
                <thead>
                  <tr class="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                    <th class="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Categoría</th>
                    <th class="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cant.</th>
                    <th class="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of g.porCategoria; track c.categoria) {
                    <tr class="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                      <td class="px-4 py-2.5">{{ c.categoria }}</td>
                      <td class="px-4 py-2.5 text-center font-mono-data">{{ c.cantidad }}</td>
                      <td class="px-4 py-2.5 text-right font-mono-data font-semibold">{{ c.total | currency:'MXN':'symbol':'1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        @if (g.porCliente?.length) {
          <div class="card-elevated rounded-2xl overflow-hidden">
            <div class="px-5 pt-5 pb-3">
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Gastos por Cliente</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-[13px] min-w-[360px]">
                <thead>
                  <tr class="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                    <th class="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cliente</th>
                    <th class="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Cant.</th>
                    <th class="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8B93A1]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of g.porCliente; track c.clienteId) {
                    <tr class="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                      <td class="px-4 py-2.5">{{ c.cliente }}</td>
                      <td class="px-4 py-2.5 text-center font-mono-data">{{ c.cantidad }}</td>
                      <td class="px-4 py-2.5 text-right font-mono-data font-semibold">{{ c.total | currency:'MXN':'symbol':'1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB: COTIZACIONES -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      @if (!loading() && activeTab() === 'Cotizaciones' && cotizaciones()) {
        @let cot = cotizaciones()!;

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div class="kpi kpi-sm">
            <span class="kpi-label">Emitidas</span>
            <strong class="kpi-val-sm">{{ cot.totalEmitidas }}</strong>
          </div>
          <div class="kpi kpi-sm">
            <span class="kpi-label">Aceptadas</span>
            <strong class="kpi-val-sm text-[#16A34A]">{{ cot.totalAceptadas }}</strong>
          </div>
          <div class="kpi kpi-sm">
            <span class="kpi-label">Rechazadas</span>
            <strong class="kpi-val-sm text-[#C61D26]">{{ cot.totalRechazadas }}</strong>
          </div>
          <div class="kpi kpi-sm">
            <span class="kpi-label">Expiradas</span>
            <strong class="kpi-val-sm text-[#D97706]">{{ cot.totalExpiradas }}</strong>
          </div>
          <div class="kpi kpi-sm col-span-2 sm:col-span-1">
            <span class="kpi-label">Tasa Conversión</span>
            <strong class="kpi-val-sm">{{ cot.tasaConversionGlobal | number:'1.1-1' }}%</strong>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="card-elevated rounded-2xl p-5">
            <h2 class="text-[15px] font-semibold text-[#0D1017] mb-4">Resultado de Cotizaciones</h2>
            <div #chartCot class="h-[260px] w-full"></div>
          </div>

          <div class="card-elevated rounded-2xl p-5">
            <h2 class="text-[15px] font-semibold text-[#0D1017] mb-1">Top Clientes</h2>
            <p class="text-[12px] text-[#8B93A1] mb-4">Por total de cotizaciones emitidas</p>
            <div class="space-y-3">
              @for (c of cot.topClientes.slice(0, 8); track c.cliente) {
                <div class="flex items-center gap-3">
                  <span class="w-[150px] shrink-0 truncate text-[13px] font-medium text-[#0D1017]">{{ c.cliente }}</span>
                  <div class="flex-1 h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div class="h-full rounded-full bg-[#C61D26] transition-all duration-500"
                      [style.width.%]="barWidth(c.totalCotizaciones)"></div>
                  </div>
                  <span class="w-6 text-right font-mono-data text-[12px] text-[#6B717F]">{{ c.totalCotizaciones }}</span>
                </div>
              }
              @if (cot.topClientes.length === 0) {
                <p class="text-center text-[13px] text-[#8B93A1] py-6">Sin datos de clientes.</p>
              }
            </div>

            @if (cot.tiempoPromedioAceptacionDias > 0) {
              <div class="mt-5 pt-4 border-t border-[#F3F4F6] flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-[#2563EB]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-[12px] text-[#6B717F]">Tiempo promedio de aceptación</p>
                  <p class="text-[15px] font-semibold text-[#0D1017]">{{ cot.tiempoPromedioAceptacionDias | number:'1.1-1' }} días</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .kpi {
      border: 1px solid #E4E7EC;
      border-radius: 16px;
      background: #fff;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kpi-sm { padding: 14px; }

    .kpi-label {
      font-size: 11px;
      color: #8B93A1;
      text-transform: uppercase;
      letter-spacing: .7px;
      font-weight: 600;
    }
    .kpi-val {
      font-size: 26px;
      color: #0D1017;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1.15;
      margin-top: 4px;
    }
    .kpi-val-sm {
      font-size: 22px;
      color: #0D1017;
      font-weight: 700;
      letter-spacing: -0.4px;
      line-height: 1.2;
      margin-top: 4px;
    }
    .kpi-delta {
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `],
})
export class ReportesComponent implements OnInit, OnDestroy {
  private readonly service = inject(ReporteService);
  private readonly exportService = inject(ExcelExportService);
  private readonly router = inject(Router);

  // Chart element refs
  @ViewChild('chartFin')    chartFinEl?: ElementRef<HTMLDivElement>;
  @ViewChild('chartPipe')   chartPipeEl?: ElementRef<HTMLDivElement>;
  @ViewChild('chartProd')   chartProdEl?: ElementRef<HTMLDivElement>;
  @ViewChild('chartGastos') chartGastosEl?: ElementRef<HTMLDivElement>;
  @ViewChild('chartCot')    chartCotEl?: ElementRef<HTMLDivElement>;

  // Filtros
  desde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  hasta = new Date().toISOString().slice(0, 10);

  // UI state
  tabs = ['Financiero', 'Pipeline', 'Productividad', 'Gastos', 'Cotizaciones'];
  activeTab     = signal('Financiero');
  loading       = signal(false);
  comparativoActivo = signal(false);

  // Data
  financiero    = signal<ReporteFinancieroDto | null>(null);
  financieroAnt = signal<ReporteFinancieroDto | null>(null);
  pipelineData  = signal<ReportePipelineDto | null>(null);
  productividad = signal<ReporteProductividadDto | null>(null);
  gastos        = signal<GastoHormigaResumenDto | null>(null);
  cotizaciones  = signal<ConversionCotizacionesDto | null>(null);

  // ECharts
  private charts = new Map<string, any>();
  private readonly resizeHandler = () => this.charts.forEach(c => c.resize());

  // ─────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    window.addEventListener('resize', this.resizeHandler);
    this.load();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.charts.forEach(c => c.dispose());
    this.charts.clear();
  }

  // ─────────────────────────────────────────────────────────────────────
  // NAVEGACIÓN DE TABS
  // ─────────────────────────────────────────────────────────────────────
  selectTab(tab: string): void {
    this.activeTab.set(tab);
    this.load();
  }

  // ─────────────────────────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    const tab = this.activeTab();

    if (tab === 'Financiero') {
      this.service.financiero(this.desde, this.hasta).subscribe({
        next: d => {
          this.financiero.set(d);
          this.loading.set(false);
          // Recargar comparativo si estaba activo con el nuevo período
          if (this.comparativoActivo()) this.loadComparativo();
          setTimeout(() => this.renderFinanciero(), 0);
        },
        error: () => this.loading.set(false),
      });

    } else if (tab === 'Pipeline') {
      this.service.pipeline().subscribe({
        next: d => {
          this.pipelineData.set(d);
          this.loading.set(false);
          setTimeout(() => this.renderPipeline(), 0);
        },
        error: () => this.loading.set(false),
      });

    } else if (tab === 'Productividad') {
      this.service.tramitadores(this.desde, this.hasta).subscribe({
        next: d => {
          this.productividad.set(d);
          this.loading.set(false);
          setTimeout(() => this.renderProductividad(), 0);
        },
        error: () => this.loading.set(false),
      });

    } else if (tab === 'Gastos') {
      this.service.gastosHormiga(this.desde, this.hasta).subscribe({
        next: d => {
          this.gastos.set(d);
          this.loading.set(false);
          setTimeout(() => this.renderGastos(), 0);
        },
        error: () => this.loading.set(false),
      });

    } else if (tab === 'Cotizaciones') {
      this.service.conversionCotizaciones(this.desde, this.hasta).subscribe({
        next: d => {
          this.cotizaciones.set(d);
          this.loading.set(false);
          setTimeout(() => this.renderCotizaciones(), 0);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // COMPARATIVO
  // ─────────────────────────────────────────────────────────────────────
  toggleComparativo(): void {
    this.comparativoActivo.update(v => !v);
    if (this.comparativoActivo() && !this.financieroAnt()) {
      this.loadComparativo();
    }
  }

  private loadComparativo(): void {
    const { desde, hasta } = this.periodoAnterior();
    this.financieroAnt.set(null);
    this.service.financiero(desde, hasta).subscribe(d => this.financieroAnt.set(d));
  }

  private periodoAnterior(): { desde: string; hasta: string } {
    const d = new Date(this.desde + 'T00:00:00');
    const h = new Date(this.hasta + 'T00:00:00');
    const dias = Math.round((h.getTime() - d.getTime()) / 86400000) + 1;
    const hastaAnt = new Date(d);
    hastaAnt.setDate(hastaAnt.getDate() - 1);
    const desdeAnt = new Date(hastaAnt);
    desdeAnt.setDate(desdeAnt.getDate() - dias + 1);
    return {
      desde: desdeAnt.toISOString().slice(0, 10),
      hasta: hastaAnt.toISOString().slice(0, 10),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // EXPORTACIÓN EXCEL
  // ─────────────────────────────────────────────────────────────────────
  exportar(): void {
    const tab = this.activeTab();
    if (tab === 'Financiero' && this.financiero()) {
      this.exportService.exportFinanciero(this.financiero()!, this.desde, this.hasta);
    } else if (tab === 'Pipeline' && this.pipelineData()) {
      this.exportService.exportPipeline(this.pipelineData()!);
    } else if (tab === 'Productividad' && this.productividad()) {
      this.exportService.exportProductividad(this.productividad()!, this.desde, this.hasta);
    } else if (tab === 'Gastos' && this.gastos()) {
      this.exportService.exportGastos(this.gastos()!, this.desde, this.hasta);
    } else if (tab === 'Cotizaciones' && this.cotizaciones()) {
      this.exportService.exportCotizaciones(this.cotizaciones()!, this.desde, this.hasta);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GRÁFICAS — INICIALIZACIÓN / ACTUALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────
  private async getChart(el: HTMLDivElement, key: string): Promise<any> {
    const echarts = await import('echarts');
    let inst = this.charts.get(key);
    if (!inst || inst.isDisposed()) {
      inst = echarts.init(el, null, { renderer: 'canvas' });
      this.charts.set(key, inst);
    }
    return inst;
  }

  private async renderFinanciero(): Promise<void> {
    const fin = this.financiero();
    if (!this.chartFinEl?.nativeElement || !fin || fin.evolucionMensual.length === 0) return;

    const inst = await this.getChart(this.chartFinEl.nativeElement, 'fin');
    inst.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (p: any[]) =>
          `${p[0].name}<br/><b>${(p[0].value as number).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}</b>`,
      },
      grid: { left: 70, right: 20, top: 16, bottom: 36 },
      xAxis: {
        type: 'category',
        data: fin.evolucionMensual.map(m => m.mesNombre),
        axisLabel: { ...TEXT_STYLE, interval: 0, rotate: fin.evolucionMensual.length > 6 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#E4E7EC' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { ...TEXT_STYLE, formatter: (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}` },
        splitLine: GRID_LIGHT,
      },
      series: [{
        type: 'bar',
        data: fin.evolucionMensual.map(m => m.cobradoVerificado),
        itemStyle: { color: '#C61D26', borderRadius: [5, 5, 0, 0] },
        barMaxWidth: 52,
        emphasis: { itemStyle: { color: '#A01520' } },
      }],
    }, true);
  }

  private async renderPipeline(): Promise<void> {
    const pipe = this.pipelineData();
    if (!this.chartPipeEl?.nativeElement || !pipe || pipe.estados.length === 0) return;

    const sorted = [...pipe.estados].sort((a, b) => a.cantidad - b.cantidad);
    const inst   = await this.getChart(this.chartPipeEl.nativeElement, 'pipe');

    inst.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (p: any[]) => `${p[0].name}<br/><b>${p[0].value} trámites</b>`,
      },
      grid: { left: 160, right: 60, top: 10, bottom: 16 },
      xAxis: {
        type: 'value',
        axisLabel: { ...TEXT_STYLE },
        splitLine: GRID_LIGHT,
      },
      yAxis: {
        type: 'category',
        data: sorted.map(e => e.etiquetaCliente),
        axisLabel: { ...TEXT_STYLE, width: 148, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: sorted.map(e => e.cantidad),
        itemStyle: { color: '#C61D26', borderRadius: [0, 5, 5, 0] },
        barMaxWidth: 36,
        label: { show: true, position: 'right', ...TEXT_STYLE, color: '#4B5162', fontWeight: 600 },
        emphasis: { itemStyle: { color: '#A01520' } },
      }],
    }, true);

    // Click → navegar a tramites
    inst.off('click');
    inst.on('click', (params: any) => {
      const estado = sorted[params.dataIndex]?.estado;
      if (estado) this.router.navigate(['/tramites'], { queryParams: { estado } });
    });
  }

  private async renderProductividad(): Promise<void> {
    const prod = this.productividad();
    if (!this.chartProdEl?.nativeElement || !prod || prod.tramitadores.length === 0) return;

    const inst = await this.getChart(this.chartProdEl.nativeElement, 'prod');
    inst.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Activos', 'Cerrados'], bottom: 0, textStyle: TEXT_STYLE },
      grid: { left: 20, right: 20, top: 16, bottom: 52, containLabel: true },
      xAxis: {
        type: 'category',
        data: prod.tramitadores.map(t => t.nombre),
        axisLabel: { ...TEXT_STYLE, rotate: prod.tramitadores.length > 4 ? 25 : 0 },
        axisLine: { lineStyle: { color: '#E4E7EC' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: TEXT_STYLE,
        splitLine: GRID_LIGHT,
        minInterval: 1,
      },
      series: [
        {
          name: 'Activos',
          type: 'bar',
          data: prod.tramitadores.map(t => t.tramitesActivos),
          itemStyle: { color: '#C61D26', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 36,
        },
        {
          name: 'Cerrados',
          type: 'bar',
          data: prod.tramitadores.map(t => t.tramitesCerradosPeriodo),
          itemStyle: { color: '#16A34A', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 36,
        },
      ],
    }, true);
  }

  private async renderGastos(): Promise<void> {
    const g = this.gastos();
    if (!this.chartGastosEl?.nativeElement || !g || g.porCategoria.length === 0) return;

    const inst = await this.getChart(this.chartGastosEl.nativeElement, 'gastos');
    inst.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (p: any) =>
          `${p.name}<br/><b>${(p.value as number).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}</b> (${p.percent}%)`,
      },
      legend: { bottom: 0, textStyle: TEXT_STYLE, type: 'scroll' },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        data: g.porCategoria.map((c, i) => ({
          name: c.categoria,
          value: c.total,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,.15)' } },
      }],
    }, true);
  }

  private async renderCotizaciones(): Promise<void> {
    const cot = this.cotizaciones();
    if (!this.chartCotEl?.nativeElement || !cot) return;

    const pendientes = Math.max(0,
      cot.totalEmitidas - cot.totalAceptadas - cot.totalRechazadas - cot.totalExpiradas
    );

    const inst = await this.getChart(this.chartCotEl.nativeElement, 'cot');
    inst.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: <b>${p.value}</b> (${p.percent}%)`,
      },
      legend: { bottom: 0, textStyle: TEXT_STYLE },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        data: [
          { value: cot.totalAceptadas,   name: 'Aceptadas',  itemStyle: { color: '#16A34A' } },
          { value: cot.totalRechazadas,  name: 'Rechazadas', itemStyle: { color: '#C61D26' } },
          { value: cot.totalExpiradas,   name: 'Expiradas',  itemStyle: { color: '#D97706' } },
          { value: pendientes,           name: 'Pendientes', itemStyle: { color: '#2563EB' } },
        ].filter(d => d.value > 0),
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,.15)' } },
      }],
    }, true);
  }

  // ─────────────────────────────────────────────────────────────────────
  // HELPERS DE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────
  barWidth(value: number): number {
    const max = Math.max(...(this.cotizaciones()?.topClientes.map(x => x.totalCotizaciones) ?? [1]));
    return max === 0 ? 0 : Math.max(6, (value / max) * 100);
  }

  totalPipeline(pipe: ReportePipelineDto): number {
    return pipe.estados.reduce((s, e) => s + e.montoTotal, 0);
  }

  // Comparativo: ¿es positivo (mejor) el cambio? (higherIsBetter=true para cobrado/margen)
  deltaPositive(actual: number, anterior: number, higherIsBetter = true): boolean {
    return higherIsBetter ? actual >= anterior : actual <= anterior;
  }

  deltaStr(actual: number, anterior: number): string {
    if (!anterior) return '';
    const pct = ((actual - anterior) / Math.abs(anterior)) * 100;
    const sign = pct >= 0 ? '▲' : '▼';
    return `${sign} ${Math.abs(pct).toFixed(1)}%`;
  }
}
