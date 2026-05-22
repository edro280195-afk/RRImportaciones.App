import {
  Component, signal, inject, OnInit, OnDestroy,
  viewChild, effect, ElementRef,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ConversionCotizacionesDto, ReporteFinancieroDto, ReportePipelineDto,
  ReporteProductividadDto, GastoHormigaResumenDto, ReporteService,
} from '../../services/reporte.service';
import { ExcelExportService } from '../../services/excel-export.service';

const PALETTE = ['#C61D26','#0D1017','#16A34A','#D97706','#2563EB','#7C3AED','#0891B2','#F97316','#84CC16','#EC4899'];
const TEXT_STYLE = { fontFamily: 'Onest, Inter, system-ui, sans-serif', fontSize: 12, color: '#6B717F' };
const GRID_LIGHT = { lineStyle: { color: '#F1F2F4', type: 'dashed' as const } };
const MXN0 = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

type TabKey = 'Financiero' | 'Pipeline' | 'Productividad' | 'Gastos' | 'Cotizaciones';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe, FormsModule, NgClass],
  template: `
    <div class="space-y-4 pb-10">

      <!-- ══ HEADER ══ -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="mb-1 text-[11px] font-semibold uppercase tracking-[1.4px] text-[#A4A0A5]">Análisis</p>
          <h1 class="text-[26px] font-bold leading-none text-[#0D1017] tracking-tight">Panel de Reportes</h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1.5 rounded-xl border border-[#E4E7EC] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(16,18,23,.04)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 stroke-2 text-[#A4A0A5] shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
            </svg>
            <input [(ngModel)]="desde" (ngModelChange)="onRangeChange()" type="date" class="border-0 bg-transparent text-[13px] text-[#0D1017] outline-none w-[122px]" />
            <span class="text-[#C9C5CA]">→</span>
            <input [(ngModel)]="hasta" (ngModelChange)="onRangeChange()" type="date" class="border-0 bg-transparent text-[13px] text-[#0D1017] outline-none w-[122px]" />
          </div>

          @if (activeTab() === 'Financiero') {
            <button (click)="toggleComparativo()"
              class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all border active:scale-95"
              [ngClass]="comparativoActivo()
                ? 'bg-[#0D1017] text-white border-[#0D1017] shadow-[0_2px_8px_rgba(13,16,23,.25)]'
                : 'bg-white text-[#4B5162] border-[#E4E7EC] hover:border-[#C9C5CA]'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5 stroke-[2.5]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5M16.5 3L21 7.5m0 0L16.5 12M21 7.5H7.5"/>
              </svg>
              vs. anterior
            </button>
          }

          <button (click)="load(true)" [disabled]="loading()"
            class="flex items-center gap-1.5 rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#231F23] transition-colors active:scale-95 disabled:opacity-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 stroke-2" [class.animate-spin]="loading()">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
            Actualizar
          </button>

          <button (click)="exportar()"
            class="flex items-center gap-1.5 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/8 px-3.5 py-2 text-[13px] font-semibold text-[#15803D] hover:bg-[#16A34A]/15 transition-colors active:scale-95">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
            Excel
          </button>
        </div>
      </div>

      <!-- ══ TABS ══ -->
      <div class="overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
        <div class="flex gap-1 rounded-2xl bg-[#EDEBEE] p-1 w-fit min-w-full lg:min-w-fit">
          @for (tab of tabs; track tab.key) {
            <button (click)="selectTab(tab.key)"
              class="shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200"
              [ngClass]="activeTab() === tab.key
                ? 'bg-white shadow-[0_1px_3px_rgba(16,18,23,.12)] text-[#0D1017] font-semibold'
                : 'text-[#8B8790] hover:text-[#0D1017]'">
              <span [innerHTML]="tab.icon" class="shrink-0"></span>
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- ══ LOADING SKELETON ══ -->
      @if (loading()) {
        <div class="space-y-4 animate-in">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            @for (i of [1,2,3,4]; track i) {
              <div class="rounded-2xl border border-[#E4E7EC] bg-white p-4 h-[92px]">
                <div class="h-2.5 w-20 rounded-full bg-[#EDEBEE] shimmer"></div>
                <div class="mt-3 h-6 w-28 rounded-lg bg-[#EDEBEE] shimmer"></div>
              </div>
            }
          </div>
          <div class="rounded-2xl border border-[#E4E7EC] bg-white p-5">
            <div class="h-3 w-44 rounded-full bg-[#EDEBEE] shimmer"></div>
            <div class="mt-4 h-[240px] w-full rounded-xl bg-[#F5F4F6] shimmer"></div>
          </div>
        </div>
      }

      <!-- ══════════════ FINANCIERO ══════════════ -->
      @if (!loading() && activeTab() === 'Financiero' && financiero()) {
        @let fin = financiero()!;
        <div class="space-y-4 animate-in">

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="kpi kpi-accent">
              <span class="kpi-label">Cobrado Total</span>
              <strong class="kpi-val">{{ fin.cobradoTotal | currency:'MXN':'symbol':'1.0-0' }}</strong>
              @if (comparativoActivo() && financieroAnt()) {
                <span class="kpi-delta" [ngClass]="deltaPositive(fin.cobradoTotal, financieroAnt()!.cobradoTotal) ? 'delta-up' : 'delta-down'">
                  {{ deltaStr(fin.cobradoTotal, financieroAnt()!.cobradoTotal) }}<span class="delta-ref">vs. anterior</span>
                </span>
              }
            </div>
            <div class="kpi">
              <span class="kpi-label">Por Cobrar</span>
              <strong class="kpi-val" [style.color]="fin.porCobrarTotal > 0 ? '#D97706' : null">{{ fin.porCobrarTotal | currency:'MXN':'symbol':'1.0-0' }}</strong>
              @if (comparativoActivo() && financieroAnt()) {
                <span class="kpi-delta" [ngClass]="deltaPositive(fin.porCobrarTotal, financieroAnt()!.porCobrarTotal, false) ? 'delta-up' : 'delta-down'">
                  {{ deltaStr(fin.porCobrarTotal, financieroAnt()!.porCobrarTotal) }}<span class="delta-ref">vs. anterior</span>
                </span>
              }
            </div>
            <div class="kpi">
              <span class="kpi-label">Margen Bruto</span>
              <strong class="kpi-val" [style.color]="fin.margenBruto >= 0 ? '#16A34A' : '#C61D26'">{{ fin.margenBruto | currency:'MXN':'symbol':'1.0-0' }}</strong>
              @if (comparativoActivo() && financieroAnt()) {
                <span class="kpi-delta" [ngClass]="deltaPositive(fin.margenBruto, financieroAnt()!.margenBruto) ? 'delta-up' : 'delta-down'">
                  {{ deltaStr(fin.margenBruto, financieroAnt()!.margenBruto) }}<span class="delta-ref">vs. anterior</span>
                </span>
              }
            </div>
            <div class="kpi">
              <span class="kpi-label">Gastos Hormiga</span>
              <strong class="kpi-val">{{ fin.gastosHormigaTotal | currency:'MXN':'symbol':'1.0-0' }}</strong>
              @if (comparativoActivo() && financieroAnt()) {
                <span class="kpi-delta" [ngClass]="deltaPositive(fin.gastosHormigaTotal, financieroAnt()!.gastosHormigaTotal, false) ? 'delta-up' : 'delta-down'">
                  {{ deltaStr(fin.gastosHormigaTotal, financieroAnt()!.gastosHormigaTotal) }}<span class="delta-ref">vs. anterior</span>
                </span>
              }
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="kpi kpi-sm"><span class="kpi-label">Cerrados</span><strong class="kpi-val-sm">{{ fin.tramitesCerradosPeriodo }}</strong></div>
            <div class="kpi kpi-sm"><span class="kpi-label">Activos</span><strong class="kpi-val-sm">{{ fin.tramitesActivosActual }}</strong></div>
            <div class="kpi kpi-sm"><span class="kpi-label">Pend. verificar</span><strong class="kpi-val-sm" [style.color]="fin.pagosPendientesVerificacion > 0 ? '#D97706' : null">{{ fin.pagosPendientesVerificacion }}</strong></div>
          </div>

          <div class="card p-5">
            <h2 class="card-title mb-4">Evolución Mensual — Cobrado Verificado</h2>
            @if (fin.evolucionMensual.length > 0) {
              <div #chartFin class="h-[280px] w-full"></div>
            } @else {
              <div class="empty">Sin datos de evolución en el período.</div>
            }
          </div>

          @if (fin.evolucionMensual.length > 0) {
            <div class="card overflow-hidden">
              <div class="overflow-x-auto">
                <table class="rep-table">
                  <thead><tr><th>Mes</th><th class="text-right">Cobrado Verificado</th></tr></thead>
                  <tbody>
                    @for (m of fin.evolucionMensual; track m.mesNombre) {
                      <tr><td>{{ m.mesNombre }}</td><td class="text-right font-mono-data font-semibold">{{ m.cobradoVerificado | currency:'MXN':'symbol':'1.0-0' }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- ══════════════ PIPELINE ══════════════ -->
      @if (!loading() && activeTab() === 'Pipeline' && pipelineData()) {
        @let pipe = pipelineData()!;
        <div class="space-y-4 animate-in">

          <div class="grid grid-cols-3 gap-3">
            <div class="kpi kpi-accent"><span class="kpi-label">Total Activos</span><strong class="kpi-val">{{ pipe.totalActivos }}</strong></div>
            <div class="kpi"><span class="kpi-label">Estados</span><strong class="kpi-val">{{ pipe.estados.length }}</strong></div>
            <div class="kpi"><span class="kpi-label">Valor en proceso</span><strong class="kpi-val text-[20px]">{{ totalPipeline(pipe) | currency:'MXN':'symbol':'1.0-0' }}</strong></div>
          </div>

          <div class="card p-5">
            <h2 class="card-title">Trámites por Estado</h2>
            <p class="card-sub mb-4">Toca una barra para ver los trámites de ese estado</p>
            @if (pipe.estados.length > 0) {
              <div #chartPipe class="h-[340px] w-full"></div>
            } @else {
              <div class="empty">No hay trámites activos.</div>
            }
          </div>

          <div class="card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="rep-table">
                <thead><tr><th>Estado</th><th class="text-center">Cant.</th><th class="text-right">Monto Total</th><th class="text-right">Días Prom.</th></tr></thead>
                <tbody>
                  @for (e of pipe.estados; track e.estado) {
                    <tr class="cursor-pointer" (click)="irATramites(e.estado)">
                      <td><span class="font-medium">{{ e.etiquetaCliente }}</span><span class="ml-1.5 text-[11px] text-[#A4A0A5]">{{ e.estado }}</span></td>
                      <td class="text-center font-mono-data font-semibold">{{ e.cantidad }}</td>
                      <td class="text-right font-mono-data">{{ e.montoTotal | currency:'MXN':'symbol':'1.0-0' }}</td>
                      <td class="text-right font-mono-data">{{ e.diasPromedioEnEstado | number:'1.1-1' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════ PRODUCTIVIDAD ══════════════ -->
      @if (!loading() && activeTab() === 'Productividad' && productividad()) {
        @let prod = productividad()!;
        <div class="space-y-4 animate-in">
          <div class="card p-5">
            <h2 class="card-title mb-4">Productividad por Tramitador</h2>
            @if (prod.tramitadores.length > 0) {
              <div #chartProd class="h-[300px] w-full"></div>
            } @else {
              <div class="empty">Sin datos en el período.</div>
            }
          </div>

          <div class="card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="rep-table">
                <thead><tr><th>Tramitador</th><th class="text-center">Activos</th><th class="text-center">Cerrados</th><th class="text-right">Cobrado</th><th class="text-right">Verificado</th><th class="text-right">Días Prom.</th></tr></thead>
                <tbody>
                  @for (t of prod.tramitadores; track t.tramitadorId) {
                    <tr>
                      <td class="font-medium">{{ t.nombre }}</td>
                      <td class="text-center font-mono-data">{{ t.tramitesActivos }}</td>
                      <td class="text-center font-mono-data">{{ t.tramitesCerradosPeriodo }}</td>
                      <td class="text-right font-mono-data">{{ t.montoTotalCobrado | currency:'MXN':'symbol':'1.0-0' }}</td>
                      <td class="text-right font-mono-data text-[#16A34A] font-semibold">{{ t.montoTotalVerificado | currency:'MXN':'symbol':'1.0-0' }}</td>
                      <td class="text-right font-mono-data">{{ t.diasPromedioResolucion | number:'1.1-1' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════ GASTOS ══════════════ -->
      @if (!loading() && activeTab() === 'Gastos' && gastos()) {
        @let g = gastos()!;
        <div class="space-y-4 animate-in">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="kpi kpi-accent"><span class="kpi-label">Gasto Total</span><strong class="kpi-val">{{ g.totalPeriodo | currency:'MXN':'symbol':'1.0-0' }}</strong></div>
            <div class="kpi"><span class="kpi-label">Cargable al Cliente</span><strong class="kpi-val text-[#16A34A]">{{ g.totalCargableCliente | currency:'MXN':'symbol':'1.0-0' }}</strong></div>
            <div class="kpi"><span class="kpi-label">Costo Propio</span><strong class="kpi-val">{{ g.totalCostoPropio | currency:'MXN':'symbol':'1.0-0' }}</strong></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="card p-5">
              <h2 class="card-title mb-4">Distribución por Categoría</h2>
              @if (g.porCategoria.length > 0) {
                <div #chartGastos class="h-[280px] w-full"></div>
              } @else {
                <div class="empty">Sin gastos en el período.</div>
              }
            </div>

            <div class="card overflow-hidden">
              <div class="px-5 pt-5 pb-2"><h2 class="card-title">Detalle por Categoría</h2></div>
              <div class="overflow-x-auto max-h-[300px]">
                <table class="rep-table">
                  <thead><tr><th>Categoría</th><th class="text-center">Cant.</th><th class="text-right">Total</th></tr></thead>
                  <tbody>
                    @for (c of g.porCategoria; track c.categoria) {
                      <tr><td>{{ c.categoria }}</td><td class="text-center font-mono-data">{{ c.cantidad }}</td><td class="text-right font-mono-data font-semibold">{{ c.total | currency:'MXN':'symbol':'1.0-0' }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          @if (g.porCliente?.length) {
            <div class="card overflow-hidden">
              <div class="px-5 pt-5 pb-2"><h2 class="card-title">Gastos por Cliente</h2></div>
              <div class="overflow-x-auto">
                <table class="rep-table">
                  <thead><tr><th>Cliente</th><th class="text-center">Cant.</th><th class="text-right">Total</th></tr></thead>
                  <tbody>
                    @for (c of g.porCliente; track c.clienteId) {
                      <tr><td>{{ c.cliente }}</td><td class="text-center font-mono-data">{{ c.cantidad }}</td><td class="text-right font-mono-data font-semibold">{{ c.total | currency:'MXN':'symbol':'1.0-0' }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- ══════════════ COTIZACIONES ══════════════ -->
      @if (!loading() && activeTab() === 'Cotizaciones' && cotizaciones()) {
        @let cot = cotizaciones()!;
        <div class="space-y-4 animate-in">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div class="kpi kpi-sm"><span class="kpi-label">Emitidas</span><strong class="kpi-val-sm">{{ cot.totalEmitidas }}</strong></div>
            <div class="kpi kpi-sm"><span class="kpi-label">Aceptadas</span><strong class="kpi-val-sm text-[#16A34A]">{{ cot.totalAceptadas }}</strong></div>
            <div class="kpi kpi-sm"><span class="kpi-label">Rechazadas</span><strong class="kpi-val-sm text-[#C61D26]">{{ cot.totalRechazadas }}</strong></div>
            <div class="kpi kpi-sm"><span class="kpi-label">Expiradas</span><strong class="kpi-val-sm text-[#D97706]">{{ cot.totalExpiradas }}</strong></div>
            <div class="kpi kpi-sm kpi-accent col-span-2 sm:col-span-1"><span class="kpi-label">Tasa Conversión</span><strong class="kpi-val-sm">{{ cot.tasaConversionGlobal | number:'1.1-1' }}%</strong></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="card p-5">
              <h2 class="card-title mb-4">Resultado de Cotizaciones</h2>
              @if (cot.totalEmitidas > 0) {
                <div #chartCot class="h-[280px] w-full"></div>
              } @else {
                <div class="empty">Sin cotizaciones en el período.</div>
              }
            </div>

            <div class="card p-5">
              <h2 class="card-title">Top Clientes</h2>
              <p class="card-sub mb-4">Por total de cotizaciones emitidas</p>
              <div class="space-y-3">
                @for (c of cot.topClientes.slice(0, 8); track c.cliente) {
                  <div class="flex items-center gap-3">
                    <span class="w-[140px] shrink-0 truncate text-[13px] font-medium text-[#0D1017]">{{ c.cliente }}</span>
                    <div class="flex-1 h-2.5 overflow-hidden rounded-full bg-[#F1F2F4]">
                      <div class="h-full rounded-full bg-gradient-to-r from-[#C61D26] to-[#E0353E] transition-all duration-700" [style.width.%]="barWidth(c.totalCotizaciones)"></div>
                    </div>
                    <span class="w-7 text-right font-mono-data text-[12px] text-[#6B717F]">{{ c.totalCotizaciones }}</span>
                  </div>
                }
                @if (cot.topClientes.length === 0) {
                  <div class="empty">Sin datos de clientes.</div>
                }
              </div>

              @if (cot.tiempoPromedioAceptacionDias > 0) {
                <div class="mt-5 pt-4 border-t border-[#F1F2F4] flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-[#2563EB]"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <p class="text-[12px] text-[#6B717F]">Tiempo promedio de aceptación</p>
                    <p class="text-[15px] font-semibold text-[#0D1017]">{{ cot.tiempoPromedioAceptacionDias | number:'1.1-1' }} días</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .card {
      border: 1px solid #E4E7EC;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(16,18,23,.04), 0 1px 3px rgba(16,18,23,.03);
    }
    .card-title { font-size: 15px; font-weight: 600; color: #0D1017; letter-spacing: -.2px; }
    .card-sub { font-size: 12px; color: #8B8790; margin-top: 2px; }

    .kpi {
      position: relative;
      border: 1px solid #E4E7EC;
      border-radius: 16px;
      background: #fff;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: 0 1px 2px rgba(16,18,23,.04);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .kpi:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,18,23,.08); }
    .kpi-sm { padding: 14px; }
    .kpi-accent { background: linear-gradient(135deg,#fff 0%,#FDF2F2 100%); border-color: #F4D5D6; }
    .kpi-accent::before {
      content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px;
      border-radius: 0 3px 3px 0; background: #C61D26;
    }

    .kpi-label { font-size: 11px; color: #8B8790; text-transform: uppercase; letter-spacing: .7px; font-weight: 600; }
    .kpi-val { font-size: 26px; color: #0D1017; font-weight: 700; letter-spacing: -.6px; line-height: 1.15; margin-top: 4px; }
    .kpi-val-sm { font-size: 22px; color: #0D1017; font-weight: 700; letter-spacing: -.4px; line-height: 1.2; margin-top: 4px; }

    .kpi-delta { font-size: 11px; font-weight: 700; margin-top: 5px; display: flex; align-items: center; gap: 5px; }
    .delta-up { color: #16A34A; }
    .delta-down { color: #C61D26; }
    .delta-ref { color: #A4A0A5; font-weight: 500; }

    .rep-table { width: 100%; text-align: left; font-size: 13px; border-collapse: collapse; min-width: 320px; }
    .rep-table thead tr { border-bottom: 1px solid #E4E7EC; background: #FAF9FB; }
    .rep-table th { padding: 11px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; color: #8B8790; }
    .rep-table tbody tr { border-bottom: 1px solid #F3F1F3; transition: background .12s; }
    .rep-table tbody tr:last-child { border-bottom: 0; }
    .rep-table tbody tr:hover { background: #FAF9FB; }
    .rep-table td { padding: 10px 16px; color: #383438; }

    .empty { text-align: center; font-size: 13px; color: #8B8790; padding: 40px 0; }

    .shimmer { position: relative; overflow: hidden; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 100% { transform: translateX(100%); } }

    @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .animate-in { animation: fadeInUp .35s cubic-bezier(.16,1,.3,1) both; }
  `],
})
export class ReportesComponent implements OnInit, OnDestroy {
  private readonly service = inject(ReporteService);
  private readonly exportService = inject(ExcelExportService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  // ─── Referencias de gráficas como signals (se actualizan al montar/desmontar el @if) ───
  private chartFinEl    = viewChild<ElementRef<HTMLDivElement>>('chartFin');
  private chartPipeEl   = viewChild<ElementRef<HTMLDivElement>>('chartPipe');
  private chartProdEl   = viewChild<ElementRef<HTMLDivElement>>('chartProd');
  private chartGastosEl = viewChild<ElementRef<HTMLDivElement>>('chartGastos');
  private chartCotEl    = viewChild<ElementRef<HTMLDivElement>>('chartCot');

  // Filtros
  desde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  hasta = new Date().toISOString().slice(0, 10);

  // UI state
  tabs: { key: TabKey; label: string; icon: SafeHtml }[] = [
    { key: 'Financiero',    label: 'Financiero',    icon: this.svg('M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941') },
    { key: 'Pipeline',      label: 'Pipeline',      icon: this.svg('M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z') },
    { key: 'Productividad', label: 'Productividad', icon: this.svg('M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z') },
    { key: 'Gastos',        label: 'Gastos',        icon: this.svg('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z') },
    { key: 'Cotizaciones',  label: 'Cotizaciones',  icon: this.svg('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z') },
  ];
  activeTab = signal<TabKey>('Financiero');
  loading   = signal(false);
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
  private observers = new Map<string, ResizeObserver>();

  constructor() {
    // Cada effect dispara EXACTAMENTE cuando su <div> entra al DOM y hay datos.
    // No depende de setTimeout ni del orden de change detection: es 100% reactivo.
    effect(() => { const el = this.chartFinEl()?.nativeElement;    const d = this.financiero();    if (el && d) this.renderFinanciero(el, d); });
    effect(() => { const el = this.chartPipeEl()?.nativeElement;   const d = this.pipelineData();  if (el && d) this.renderPipeline(el, d); });
    effect(() => { const el = this.chartProdEl()?.nativeElement;   const d = this.productividad(); if (el && d) this.renderProductividad(el, d); });
    effect(() => { const el = this.chartGastosEl()?.nativeElement; const d = this.gastos();        if (el && d) this.renderGastos(el, d); });
    effect(() => { const el = this.chartCotEl()?.nativeElement;    const d = this.cotizaciones();  if (el && d) this.renderCotizaciones(el, d); });
  }

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void {
    this.observers.forEach(o => o.disconnect());
    this.charts.forEach(c => { try { c.dispose(); } catch {} });
    this.charts.clear();
    this.observers.clear();
  }

  // ─────────────────────────── NAVEGACIÓN ───────────────────────────
  selectTab(tab: TabKey): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.load();
  }

  onRangeChange(): void {
    // Al cambiar fechas, invalidar datos dependientes del período para forzar recarga limpia
    this.financieroAnt.set(null);
  }

  irATramites(estado: string): void {
    this.router.navigate(['/tramites'], { queryParams: { estado } });
  }

  // ─────────────────────────── CARGA DE DATOS ───────────────────────────
  load(force = false): void {
    const tab = this.activeTab();
    const ya = this.hasData(tab);
    if (!ya || force) this.loading.set(true);

    const done = () => this.loading.set(false);
    const fail = () => this.loading.set(false);

    switch (tab) {
      case 'Financiero':
        this.service.financiero(this.desde, this.hasta).subscribe({
          next: d => { this.financiero.set(d); done(); if (this.comparativoActivo()) this.loadComparativo(); },
          error: fail,
        });
        break;
      case 'Pipeline':
        this.service.pipeline().subscribe({ next: d => { this.pipelineData.set(d); done(); }, error: fail });
        break;
      case 'Productividad':
        this.service.tramitadores(this.desde, this.hasta).subscribe({ next: d => { this.productividad.set(d); done(); }, error: fail });
        break;
      case 'Gastos':
        this.service.gastosHormiga(this.desde, this.hasta).subscribe({ next: d => { this.gastos.set(d); done(); }, error: fail });
        break;
      case 'Cotizaciones':
        this.service.conversionCotizaciones(this.desde, this.hasta).subscribe({ next: d => { this.cotizaciones.set(d); done(); }, error: fail });
        break;
    }
  }

  private hasData(tab: TabKey): boolean {
    switch (tab) {
      case 'Financiero':    return !!this.financiero();
      case 'Pipeline':      return !!this.pipelineData();
      case 'Productividad': return !!this.productividad();
      case 'Gastos':        return !!this.gastos();
      case 'Cotizaciones':  return !!this.cotizaciones();
    }
  }

  // ─────────────────────────── COMPARATIVO ───────────────────────────
  toggleComparativo(): void {
    this.comparativoActivo.update(v => !v);
    if (this.comparativoActivo() && !this.financieroAnt()) this.loadComparativo();
  }

  private loadComparativo(): void {
    const { desde, hasta } = this.periodoAnterior();
    this.service.financiero(desde, hasta).subscribe(d => this.financieroAnt.set(d));
  }

  private periodoAnterior(): { desde: string; hasta: string } {
    const d = new Date(this.desde + 'T00:00:00');
    const h = new Date(this.hasta + 'T00:00:00');
    const dias = Math.round((h.getTime() - d.getTime()) / 86400000) + 1;
    const hastaAnt = new Date(d); hastaAnt.setDate(hastaAnt.getDate() - 1);
    const desdeAnt = new Date(hastaAnt); desdeAnt.setDate(desdeAnt.getDate() - dias + 1);
    return { desde: desdeAnt.toISOString().slice(0, 10), hasta: hastaAnt.toISOString().slice(0, 10) };
  }

  // ─────────────────────────── EXPORTAR ───────────────────────────
  exportar(): void {
    const tab = this.activeTab();
    if (tab === 'Financiero' && this.financiero())       this.exportService.exportFinanciero(this.financiero()!, this.desde, this.hasta);
    else if (tab === 'Pipeline' && this.pipelineData())  this.exportService.exportPipeline(this.pipelineData()!);
    else if (tab === 'Productividad' && this.productividad()) this.exportService.exportProductividad(this.productividad()!, this.desde, this.hasta);
    else if (tab === 'Gastos' && this.gastos())          this.exportService.exportGastos(this.gastos()!, this.desde, this.hasta);
    else if (tab === 'Cotizaciones' && this.cotizaciones()) this.exportService.exportCotizaciones(this.cotizaciones()!, this.desde, this.hasta);
  }

  // ─────────────────────────── GRÁFICAS ───────────────────────────
  private async getChart(el: HTMLDivElement, key: string): Promise<any> {
    const echarts = await import('echarts');
    let inst = this.charts.get(key);
    // Si el instance está dispuesto o apunta a un <div> viejo (tab re-montado), recrear.
    if (inst && (inst.isDisposed?.() || inst.getDom?.() !== el)) {
      try { inst.dispose(); } catch {}
      this.observers.get(key)?.disconnect();
      inst = undefined;
    }
    if (!inst) {
      inst = echarts.init(el, null, { renderer: 'canvas' });
      this.charts.set(key, inst);
      const ro = new ResizeObserver(() => { try { inst.resize(); } catch {} });
      ro.observe(el);
      this.observers.set(key, ro);
    }
    return inst;
  }

  private async renderFinanciero(el: HTMLDivElement, fin: ReporteFinancieroDto): Promise<void> {
    if (fin.evolucionMensual.length === 0) return;
    const inst = await this.getChart(el, 'fin');
    inst.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any[]) => `${p[0].name}<br/><b>${MXN0(p[0].value)}</b>` },
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category', data: fin.evolucionMensual.map(m => m.mesNombre),
        axisLabel: { ...TEXT_STYLE, interval: 0, rotate: fin.evolucionMensual.length > 6 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#E4E7EC' } }, axisTick: { show: false },
      },
      yAxis: { type: 'value', axisLabel: { ...TEXT_STYLE, formatter: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}` }, splitLine: GRID_LIGHT },
      series: [{
        type: 'bar', data: fin.evolucionMensual.map(m => m.cobradoVerificado), barMaxWidth: 48,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#E0353E' }, { offset: 1, color: '#C61D26' }] }, borderRadius: [6, 6, 0, 0] },
        emphasis: { itemStyle: { color: '#A01520' } },
      }],
    }, true);
    inst.resize();
  }

  private async renderPipeline(el: HTMLDivElement, pipe: ReportePipelineDto): Promise<void> {
    if (pipe.estados.length === 0) return;
    const sorted = [...pipe.estados].sort((a, b) => a.cantidad - b.cantidad);
    const inst = await this.getChart(el, 'pipe');
    inst.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any[]) => `${p[0].name}<br/><b>${p[0].value} trámites</b>` },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { ...TEXT_STYLE }, splitLine: GRID_LIGHT, minInterval: 1 },
      yAxis: {
        type: 'category', data: sorted.map(e => e.etiquetaCliente),
        axisLabel: { ...TEXT_STYLE, width: 140, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'bar', data: sorted.map(e => e.cantidad), barMaxWidth: 30,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#C61D26' }, { offset: 1, color: '#E0353E' }] }, borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', ...TEXT_STYLE, color: '#4B5162', fontWeight: 700 },
        emphasis: { itemStyle: { color: '#A01520' } },
      }],
    }, true);
    inst.resize();
    inst.off('click');
    inst.on('click', (params: any) => { const estado = sorted[params.dataIndex]?.estado; if (estado) this.irATramites(estado); });
  }

  private async renderProductividad(el: HTMLDivElement, prod: ReporteProductividadDto): Promise<void> {
    if (prod.tramitadores.length === 0) return;
    const inst = await this.getChart(el, 'prod');
    inst.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Activos', 'Cerrados'], bottom: 0, textStyle: TEXT_STYLE, icon: 'roundRect', itemWidth: 12, itemHeight: 12 },
      grid: { left: 8, right: 16, top: 16, bottom: 44, containLabel: true },
      xAxis: {
        type: 'category', data: prod.tramitadores.map(t => t.nombre),
        axisLabel: { ...TEXT_STYLE, rotate: prod.tramitadores.length > 4 ? 22 : 0, width: 90, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#E4E7EC' } }, axisTick: { show: false },
      },
      yAxis: { type: 'value', axisLabel: TEXT_STYLE, splitLine: GRID_LIGHT, minInterval: 1 },
      series: [
        { name: 'Activos',  type: 'bar', data: prod.tramitadores.map(t => t.tramitesActivos),          itemStyle: { color: '#C61D26', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
        { name: 'Cerrados', type: 'bar', data: prod.tramitadores.map(t => t.tramitesCerradosPeriodo),  itemStyle: { color: '#16A34A', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
      ],
    }, true);
    inst.resize();
  }

  private async renderGastos(el: HTMLDivElement, g: GastoHormigaResumenDto): Promise<void> {
    if (g.porCategoria.length === 0) return;
    const inst = await this.getChart(el, 'gastos');
    inst.setOption({
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/><b>${MXN0(p.value)}</b> (${p.percent}%)` },
      legend: { bottom: 0, textStyle: TEXT_STYLE, type: 'scroll', icon: 'circle', itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: g.porCategoria.map((c, i) => ({ name: c.categoria, value: c.total, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
        label: { show: false }, labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 6, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,.18)' } },
      }],
    }, true);
    inst.resize();
  }

  private async renderCotizaciones(el: HTMLDivElement, cot: ConversionCotizacionesDto): Promise<void> {
    if (cot.totalEmitidas === 0) return;
    const pendientes = Math.max(0, cot.totalEmitidas - cot.totalAceptadas - cot.totalRechazadas - cot.totalExpiradas);
    const inst = await this.getChart(el, 'cot');
    inst.setOption({
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: <b>${p.value}</b> (${p.percent}%)` },
      legend: { bottom: 0, textStyle: TEXT_STYLE, icon: 'circle', itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: cot.totalAceptadas,  name: 'Aceptadas',  itemStyle: { color: '#16A34A' } },
          { value: cot.totalRechazadas, name: 'Rechazadas', itemStyle: { color: '#C61D26' } },
          { value: cot.totalExpiradas,  name: 'Expiradas',  itemStyle: { color: '#D97706' } },
          { value: pendientes,          name: 'Pendientes', itemStyle: { color: '#2563EB' } },
        ].filter(d => d.value > 0),
        label: { show: false }, labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 6, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,.18)' } },
      }],
    }, true);
    inst.resize();
  }

  // ─────────────────────────── HELPERS ───────────────────────────
  barWidth(value: number): number {
    const max = Math.max(...(this.cotizaciones()?.topClientes.map(x => x.totalCotizaciones) ?? [1]));
    return max === 0 ? 0 : Math.max(6, (value / max) * 100);
  }

  totalPipeline(pipe: ReportePipelineDto): number {
    return pipe.estados.reduce((s, e) => s + e.montoTotal, 0);
  }

  deltaPositive(actual: number, anterior: number, higherIsBetter = true): boolean {
    return higherIsBetter ? actual >= anterior : actual <= anterior;
  }

  deltaStr(actual: number, anterior: number): string {
    if (!anterior) return '—';
    const pct = ((actual - anterior) / Math.abs(anterior)) * 100;
    return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
  }

  private svg(path: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:15px;height:15px;stroke-width:2"><path stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg>`
    );
  }
}
