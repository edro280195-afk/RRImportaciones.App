import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ConversionCotizacionesDto,
  ReporteFinancieroDto,
  ReportePipelineDto,
  ReporteProductividadDto,
  GastoHormigaResumenDto,
  ReporteService
} from '../../services/reporte.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe, DatePipe, FormsModule, NgClass],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Reportes</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Panel de Reportes</h1>
        </div>
        <div class="flex gap-2">
          <input [(ngModel)]="desde" type="date" class="rounded-xl border border-[#E4E7EC] px-3 py-2 text-[13px]" />
          <input [(ngModel)]="hasta" type="date" class="rounded-xl border border-[#E4E7EC] px-3 py-2 text-[13px]" />
          <button (click)="load()" class="btn-primary rounded-xl px-4 py-2 text-[13px]">Actualizar</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex space-x-1 rounded-xl bg-[#E4E7EC] p-1">
        @for (tab of tabs; track tab) {
          <button
            (click)="selectTab(tab)"
            [ngClass]="activeTab === tab ? 'bg-white shadow-sm text-[#0D1017] font-semibold' : 'text-[#8B93A1] hover:text-[#0D1017] hover:bg-white/50'"
            class="flex-1 rounded-lg px-3 py-2 text-[13px] transition-all"
          >
            {{ tab }}
          </button>
        }
      </div>

      @if (activeTab === 'Financiero' && financiero) {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div class="metric"><span>Cobrado Total</span><strong>{{ financiero.cobradoTotal | currency }}</strong></div>
          <div class="metric"><span>Por Cobrar</span><strong>{{ financiero.porCobrarTotal | currency }}</strong></div>
          <div class="metric"><span>Gastos Hormiga</span><strong>{{ financiero.gastosHormigaTotal | currency }}</strong></div>
          <div class="metric"><span>Margen Bruto</span><strong>{{ financiero.margenBruto | currency }}</strong></div>
        </div>

        <section class="card-elevated mt-5 rounded-2xl p-5">
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Evolución Mensual (Cobrado)</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[#8B93A1]">
                  <th class="py-2 font-medium">Mes</th>
                  <th class="py-2 text-right font-medium">Monto Verificado</th>
                </tr>
              </thead>
              <tbody>
                @for (m of financiero.evolucionMensual; track m.mesNombre) {
                  <tr class="border-b border-[#EEF1F5] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="py-2">{{ m.mesNombre }}</td>
                    <td class="py-2 text-right font-mono-data">{{ m.cobradoVerificado | currency }}</td>
                  </tr>
                }
                @if (financiero.evolucionMensual.length === 0) {
                  <tr>
                    <td colspan="2" class="py-4 text-center text-[#8B93A1]">No hay datos en este periodo</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activeTab === 'Pipeline' && pipelineData) {
        <div class="metric mb-5"><span>Trámites Activos</span><strong>{{ pipelineData.totalActivos }}</strong></div>
        
        <section class="card-elevated rounded-2xl p-5">
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Trámites por Estado</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[#8B93A1]">
                  <th class="py-2 font-medium">Estado</th>
                  <th class="py-2 text-center font-medium">Cantidad</th>
                  <th class="py-2 text-right font-medium">Monto Total</th>
                  <th class="py-2 text-right font-medium">Días Promedio</th>
                </tr>
              </thead>
              <tbody>
                @for (e of pipelineData.estados; track e.estado) {
                  <tr class="border-b border-[#EEF1F5] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="py-2">{{ e.etiquetaCliente }}</td>
                    <td class="py-2 text-center font-mono-data">{{ e.cantidad }}</td>
                    <td class="py-2 text-right font-mono-data">{{ e.montoTotal | currency }}</td>
                    <td class="py-2 text-right font-mono-data">{{ e.diasPromedioEnEstado | number:'1.1-1' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activeTab === 'Productividad' && productividad) {
        <section class="card-elevated rounded-2xl p-5">
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Productividad por Tramitador</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[#8B93A1]">
                  <th class="py-2 font-medium">Tramitador</th>
                  <th class="py-2 text-center font-medium">Activos</th>
                  <th class="py-2 text-center font-medium">Cerrados</th>
                  <th class="py-2 text-right font-medium">Cobrado</th>
                  <th class="py-2 text-right font-medium">Días Prom.</th>
                </tr>
              </thead>
              <tbody>
                @for (t of productividad.tramitadores; track t.tramitadorId) {
                  <tr class="border-b border-[#EEF1F5] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="py-2 font-medium">{{ t.nombre }}</td>
                    <td class="py-2 text-center font-mono-data">{{ t.tramitesActivos }}</td>
                    <td class="py-2 text-center font-mono-data">{{ t.tramitesCerradosPeriodo }}</td>
                    <td class="py-2 text-right font-mono-data text-green-600">{{ t.montoTotalVerificado | currency }}</td>
                    <td class="py-2 text-right font-mono-data">{{ t.diasPromedioResolucion | number:'1.1-1' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activeTab === 'Gastos' && gastos) {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 mb-5">
          <div class="metric"><span>Gasto Total</span><strong>{{ gastos.totalPeriodo | currency }}</strong></div>
          <div class="metric"><span>Cargable al Cliente</span><strong>{{ gastos.totalCargableCliente | currency }}</strong></div>
          <div class="metric"><span>Costo Propio</span><strong>{{ gastos.totalCostoPropio | currency }}</strong></div>
        </div>

        <section class="card-elevated rounded-2xl p-5">
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Gastos por Categoría</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[13px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[#8B93A1]">
                  <th class="py-2 font-medium">Categoría</th>
                  <th class="py-2 text-center font-medium">Transacciones</th>
                  <th class="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (c of gastos.porCategoria; track c.categoria) {
                  <tr class="border-b border-[#EEF1F5] last:border-0 hover:bg-[#F9FAFB]">
                    <td class="py-2">{{ c.categoria }}</td>
                    <td class="py-2 text-center font-mono-data">{{ c.cantidad }}</td>
                    <td class="py-2 text-right font-mono-data">{{ c.total | currency }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activeTab === 'Cotizaciones' && cotizaciones) {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-5 mb-5">
          <div class="metric"><span>Emitidas</span><strong>{{ cotizaciones.totalEmitidas }}</strong></div>
          <div class="metric"><span>Aceptadas</span><strong>{{ cotizaciones.totalAceptadas }}</strong></div>
          <div class="metric"><span>Rechazadas</span><strong>{{ cotizaciones.totalRechazadas }}</strong></div>
          <div class="metric"><span>Expiradas</span><strong>{{ cotizaciones.totalExpiradas }}</strong></div>
          <div class="metric"><span>Conversión</span><strong>{{ cotizaciones.tasaConversionGlobal | number:'1.0-2' }}%</strong></div>
        </div>

        <section class="card-elevated rounded-2xl p-5">
          <div #chart class="mb-6 h-[280px] w-full"></div>
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Top clientes por cotizaciones</h2>
          @for (c of cotizaciones.topClientes; track c.clienteId || c.cliente) {
            <div class="mb-3 grid grid-cols-[180px_minmax(0,1fr)_70px] items-center gap-3">
              <span class="truncate text-[13px] font-medium">{{ c.cliente }}</span>
              <div class="h-3 overflow-hidden rounded-full bg-[#EEF1F5]">
                <div class="h-full rounded-full bg-[#C61D26]" [style.width.%]="barWidth(c.totalCotizaciones)"></div>
              </div>
              <span class="text-right font-mono-data text-[12px]">{{ c.totalCotizaciones }}</span>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .metric {
      border: 1px solid #E4E7EC;
      border-radius: 16px;
      background: #fff;
      padding: 16px;
    }
    .metric span {
      display: block;
      font-size: 11px;
      color: #8B93A1;
      text-transform: uppercase;
      letter-spacing: .7px;
    }
    .metric strong {
      display: block;
      margin-top: 6px;
      font-size: 28px;
      color: #0D1017;
      font-weight: 650;
    }
  `],
})
export class ReportesComponent implements OnInit {
  private service = inject(ReporteService);
  @ViewChild('chart', { static: false }) chart?: ElementRef<HTMLDivElement>;

  desde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  hasta = new Date().toISOString().slice(0, 10);

  tabs = ['Financiero', 'Pipeline', 'Productividad', 'Gastos', 'Cotizaciones'];
  activeTab = 'Financiero';

  financiero: ReporteFinancieroDto | null = null;
  pipelineData: ReportePipelineDto | null = null;
  productividad: ReporteProductividadDto | null = null;
  gastos: GastoHormigaResumenDto | null = null;
  cotizaciones: ConversionCotizacionesDto | null = null;

  private chartInstance: any;

  ngOnInit(): void {
    this.load();
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.load();
  }

  load(): void {
    if (this.activeTab === 'Financiero') {
      this.service.financiero(this.desde, this.hasta).subscribe(d => this.financiero = d);
    } else if (this.activeTab === 'Pipeline') {
      this.service.pipeline().subscribe(d => this.pipelineData = d);
    } else if (this.activeTab === 'Productividad') {
      this.service.tramitadores(this.desde, this.hasta).subscribe(d => this.productividad = d);
    } else if (this.activeTab === 'Gastos') {
      this.service.gastosHormiga(this.desde, this.hasta).subscribe(d => this.gastos = d);
    } else if (this.activeTab === 'Cotizaciones') {
      this.service.conversionCotizaciones(this.desde, this.hasta).subscribe(d => {
        this.cotizaciones = d;
        setTimeout(() => this.renderChart(), 0);
      });
    }
  }

  barWidth(value: number): number {
    const max = Math.max(...(this.cotizaciones?.topClientes.map(x => x.totalCotizaciones) || [1]));
    return max === 0 ? 0 : Math.max(8, value / max * 100);
  }

  private async renderChart(): Promise<void> {
    if (this.activeTab !== 'Cotizaciones' || !this.chart?.nativeElement || !this.cotizaciones) return;
    const echarts = await import('echarts');
    this.chartInstance ??= echarts.init(this.chart.nativeElement);
    this.chartInstance.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        data: [
          { value: this.cotizaciones.totalAceptadas, name: 'Aceptadas' },
          { value: this.cotizaciones.totalRechazadas, name: 'Rechazadas' },
          { value: this.cotizaciones.totalExpiradas, name: 'Expiradas' },
          { value: Math.max(0, this.cotizaciones.totalEmitidas - this.cotizaciones.totalAceptadas - this.cotizaciones.totalRechazadas - this.cotizaciones.totalExpiradas), name: 'Pendientes' },
        ],
        color: ['#16A34A', '#DC2626', '#D97706', '#2563EB'],
      }],
    });
  }
}
