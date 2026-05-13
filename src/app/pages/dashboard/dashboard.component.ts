import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { PagoListDto, PagoService } from '../../services/pago.service';
import { GastoHormigaListDto, GastoHormigaService } from '../../services/gasto-hormiga.service';
import { TramiteListDto, TramiteService, TramiteDashboardDto } from '../../services/tramite.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="flex items-center justify-between mb-8 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">{{ today }}</p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">Dashboard</h1>
        </div>
        <button (click)="router.navigate(['/tramites'])" class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo trámite
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="metric-card stagger-item" style="animation-delay:40ms;">
          <div class="metric-icon bg-[#FEE2E2] text-[#C61D26]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <span class="metric-label">Activos</span>
          <p class="metric-value">{{ dash.activos }}</p>
          <p class="metric-help">{{ dash.verdesEsteMes }} verdes este mes · {{ dash.amarillosPendientePago }} pendientes de pago</p>
        </div>

        <div class="metric-card stagger-item" style="animation-delay:80ms;">
          <div class="metric-icon bg-[#DCFCE7] text-[#16A34A]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <span class="metric-label">Cobrado este mes</span>
          <p class="metric-value">{{ dash.cobradoMes | currency:'MXN':'symbol':'1.0-0' }}</p>
          <p class="metric-help">{{ dash.porCobrar | currency:'MXN':'symbol':'1.0-0' }} por cobrar</p>
        </div>

        <div class="metric-card stagger-item" style="animation-delay:120ms;">
          <div class="metric-icon bg-[#FEF3C7] text-[#D97706]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span class="metric-label">Por cobrar</span>
          <p class="metric-value">{{ dash.porCobrar | currency:'MXN':'symbol':'1.0-0' }}</p>
          <p class="metric-help">{{ dash.amarillosPendientePago }} trámites pendientes de pago</p>
        </div>

        <div class="metric-card stagger-item" style="animation-delay:160ms;">
          <div class="metric-icon bg-[#EEF2FF] text-[#4F46E5]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m8 1H9m4 0h2m4-8h-4l-1-4H7l-1 3H2"/>
            </svg>
          </div>
          <span class="metric-label">En patio</span>
          <p class="metric-value">{{ dash.vehiculosEnPatio }} <span class="text-[14px] font-normal text-[#9EA3AE] tracking-normal">uds</span></p>
          <p class="metric-help">Vehículos sin trámite completo</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5 mb-5">
        <section class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay:200ms;">
          <div class="flex items-center justify-between px-6 py-4 border-b border-[#E4E7EC]">
            <div>
              <p class="text-[13px] font-semibold text-[#1E2330]">Trámites recientes</p>
              <p class="text-[12px] text-[#9EA3AE]">Últimos movimientos registrados</p>
            </div>
            <button (click)="router.navigate(['/tramites'])" class="text-[12px] font-medium text-[#C61D26]">Ver todos</button>
          </div>
          <div>
            @for (t of tramitesRecientes; track t.id) {
              <button (click)="router.navigate(['/tramites', t.id])" class="w-full grid grid-cols-[100px_1fr_120px_120px] gap-3 items-center px-6 py-3 text-left border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                <span class="font-mono-data text-[12px] text-[#0D1017]">{{ t.numeroConsecutivo }}</span>
                <span class="min-w-0">
                  <span class="block text-[13px] font-medium text-[#1E2330] truncate">{{ t.clienteApodo || 'Sin cliente' }}</span>
                  <span class="block text-[12px] text-[#9EA3AE] truncate">{{ t.vehiculoMarcaModelo || t.vehiculoVinCorto || 'Sin vehículo' }}</span>
                </span>
                <span class="text-[11px] text-[#6B717F]">{{ t.estatus }}</span>
                <span class="text-right font-mono-data text-[12px]" [style.color]="t.saldoPendiente > 0 ? '#D97706' : '#16A34A'">{{ t.saldoPendiente | currency:'MXN':'symbol':'1.0-0' }}</span>
              </button>
            } @empty {
              <p class="text-[13px] text-[#9EA3AE] text-center py-12">Sin trámites recientes.</p>
            }
          </div>
        </section>

        <section class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay:240ms;">
          <div class="flex items-center justify-between px-6 py-4 border-b border-[#E4E7EC]">
            <div>
              <p class="text-[13px] font-semibold text-[#1E2330]">Pagos por verificar</p>
              <p class="text-[12px] text-[#9EA3AE]">Control contra banco</p>
            </div>
            <button (click)="router.navigate(['/pagos'])" class="text-[12px] font-medium text-[#C61D26]">Abrir pagos</button>
          </div>
          <div>
            @for (p of pagosPendientes; track p.id) {
              <div class="flex items-center justify-between gap-3 px-6 py-3 border-b border-[#F3F4F6]">
                <div class="min-w-0">
                  <p class="text-[13px] font-medium text-[#1E2330] truncate">{{ p.clienteNombre || 'Sin cliente' }}</p>
                  <p class="text-[12px] text-[#9EA3AE]">{{ p.numeroConsecutivo }} · {{ p.fechaPago | date:'dd/MM/yyyy' }}</p>
                </div>
                <p class="font-mono-data text-[13px] font-semibold">{{ p.monto | currency:p.moneda:'symbol':'1.2-2' }}</p>
              </div>
            } @empty {
              <div class="flex flex-col items-center justify-center py-12 px-6">
                <div class="w-11 h-11 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-3">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-[#16A34A]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p class="text-[14px] font-medium text-[#1E2330] mb-1">Todo al día</p>
                <p class="text-[13px] text-[#9EA3AE]">No hay pagos pendientes.</p>
              </div>
            }
          </div>
        </section>
      </div>

      <section class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay:280ms;">
        <div class="flex items-center justify-between px-6 py-4 border-b border-[#E4E7EC]">
          <div>
            <p class="text-[13px] font-semibold text-[#1E2330]">Gastos hormiga recientes</p>
            <p class="text-[12px] text-[#9EA3AE]">Últimos costos registrados en operación</p>
          </div>
          <button (click)="router.navigate(['/gastos-hormiga'])" class="text-[12px] font-medium text-[#C61D26]">Ver gastos</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F3F4F6]">
          @for (g of gastosRecientes; track g.id) {
            <div class="p-5">
              <div class="flex items-start justify-between gap-3 mb-2">
                <p class="text-[13px] font-semibold text-[#1E2330] line-clamp-1">{{ g.concepto }}</p>
                <span class="px-2 py-1 rounded-lg text-[11px] font-semibold" [style]="g.seCargaAlCliente ? 'background:#FEF3C7;color:#92400E;' : 'background:#F3F4F6;color:#4B5162;'">{{ g.seCargaAlCliente ? 'Cargable' : 'Propio' }}</span>
              </div>
              <p class="text-[12px] text-[#9EA3AE] mb-4">{{ g.clienteNombre || 'Sin cliente' }} · {{ g.fechaGasto | date:'dd/MM/yyyy' }}</p>
              <p class="font-mono-data text-[18px] font-semibold text-[#0D1017]">{{ g.monto | currency:g.moneda }}</p>
            </div>
          } @empty {
            <p class="col-span-3 text-[13px] text-[#9EA3AE] text-center py-10">Sin gastos recientes.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .metric-card {
      position: relative;
      min-height: 120px;
      padding: 18px;
      border-radius: 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-xs);
    }
    .metric-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .metric-label {
      position: absolute;
      top: 18px;
      right: 18px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--n-400);
    }
    .metric-value {
      font-size: 34px;
      line-height: 1;
      font-weight: 650;
      letter-spacing: 0;
      color: var(--n-900);
      margin-bottom: 6px;
    }
    .metric-help {
      font-size: 12px;
      color: var(--n-400);
    }
  `],
})
export class DashboardComponent {
  private tramiteService = inject(TramiteService);
  private pagoService = inject(PagoService);
  private gastoService = inject(GastoHormigaService);
  router = inject(Router);

  today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  dash: TramiteDashboardDto = { activos: 0, verdesEsteMes: 0, amarillosPendientePago: 0, cobradoMes: 0, porCobrar: 0, vehiculosEnPatio: 0 };
  tramitesRecientes: TramiteListDto[] = [];
  pagosPendientes: PagoListDto[] = [];
  gastosRecientes: GastoHormigaListDto[] = [];

  constructor() {
    this.tramiteService.getDashboard().subscribe(d => this.dash = d);
    this.tramiteService.getList({ pageSize: 5 }).subscribe(r => this.tramitesRecientes = r.items);
    this.pagoService.getList({ verificado: false, pageSize: 5 }).subscribe(r => this.pagosPendientes = r.items);
    this.gastoService.getList({ pageSize: 3 }).subscribe(r => this.gastosRecientes = r.items);
  }
}
