import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversionCotizacionesDto, ReporteService } from '../../services/reporte.service';

@Component({
  selector: 'app-reporte-cotizaciones',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Reportes</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Conversión de cotizaciones</h1>
        </div>
        <div class="flex gap-2">
          <input [(ngModel)]="desde" type="date" class="rounded-xl border border-[#E4E7EC] px-3 py-2 text-[13px]" />
          <input [(ngModel)]="hasta" type="date" class="rounded-xl border border-[#E4E7EC] px-3 py-2 text-[13px]" />
          <button (click)="load()" class="btn-primary rounded-xl px-4 py-2 text-[13px]">Actualizar</button>
        </div>
      </div>

      @if (data) {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div class="metric"><span>Emitidas</span><strong>{{ data.totalEmitidas }}</strong></div>
          <div class="metric"><span>Aceptadas</span><strong>{{ data.totalAceptadas }}</strong></div>
          <div class="metric"><span>Rechazadas</span><strong>{{ data.totalRechazadas }}</strong></div>
          <div class="metric"><span>Expiradas</span><strong>{{ data.totalExpiradas }}</strong></div>
          <div class="metric"><span>Conversión</span><strong>{{ data.tasaConversionGlobal | number:'1.0-2' }}%</strong></div>
        </div>

        <section class="card-elevated rounded-2xl p-5">
          <div #chart class="mb-6 h-[280px] w-full"></div>
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Top clientes por cotizaciones</h2>
          @for (c of data.topClientes; track c.clienteId || c.cliente) {
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
export class ReporteCotizacionesComponent implements AfterViewInit {
  private service = inject(ReporteService);
  @ViewChild('chart', { static: false }) chart?: ElementRef<HTMLDivElement>;
  desde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  hasta = new Date().toISOString().slice(0, 10);
  data: ConversionCotizacionesDto | null = null;
  private chartInstance: any;

  constructor() {
    this.load();
  }

  load(): void {
    this.service.conversionCotizaciones(this.desde, this.hasta).subscribe((data) => {
      this.data = data;
      setTimeout(() => this.renderChart(), 0);
    });
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  barWidth(value: number): number {
    const max = Math.max(...(this.data?.topClientes.map(x => x.totalCotizaciones) || [1]));
    return max === 0 ? 0 : Math.max(8, value / max * 100);
  }

  private async renderChart(): Promise<void> {
    if (!this.chart?.nativeElement || !this.data) return;
    const echarts = await import('echarts');
    this.chartInstance ??= echarts.init(this.chart.nativeElement);
    this.chartInstance.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        data: [
          { value: this.data.totalAceptadas, name: 'Aceptadas' },
          { value: this.data.totalRechazadas, name: 'Rechazadas' },
          { value: this.data.totalExpiradas, name: 'Expiradas' },
          { value: Math.max(0, this.data.totalEmitidas - this.data.totalAceptadas - this.data.totalRechazadas - this.data.totalExpiradas), name: 'Pendientes' },
        ],
        color: ['#16A34A', '#DC2626', '#D97706', '#2563EB'],
      }],
    });
  }
}
