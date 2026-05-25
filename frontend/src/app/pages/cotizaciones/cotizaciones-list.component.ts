import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CotizacionListDto, CotizacionService } from '../../services/cotizacion.service';
import { ExcelExportService } from '../../services/excel-export.service';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div>
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#9EA3AE] mb-1">
            {{ total() }} registros
          </p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] leading-none">Cotizaciones</h1>
        </div>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          <button
            (click)="exportarExcel()"
            [disabled]="exportando()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
            style="background: #F3F4F6; color: #4B5162; border: 1px solid #E4E7EC;"
          >
            @if (exportando()) {
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
              Exportando...
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Excel
            }
          </button>
          <button
            (click)="router.navigate(['/cotizaciones/nueva'])"
            class="btn-primary px-4 py-2 rounded-xl text-[13px]"
          >
            Nueva cotización
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3 mb-5 flex-wrap">
        <input
          [(ngModel)]="search"
          (input)="buscar()"
          placeholder="Buscar folio, VIN o modelo"
          class="w-full max-w-[320px] px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px] outline-none focus:border-[#C61D26]"
        />
        <select
          [(ngModel)]="estado"
          (change)="buscar()"
          class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]"
        >
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="ACEPTADA">Aceptada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="EXPIRADA">Expirada</option>
        </select>
      </div>

      <div class="card-elevated rounded-2xl overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-[13px] text-[#9EA3AE]">Cargando cotizaciones...</div>
        } @else if (items().length === 0) {
          <div class="p-12 text-center">
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">Sin cotizaciones</p>
            <button
              (click)="router.navigate(['/cotizaciones/nueva'])"
              class="btn-primary px-4 py-2 rounded-xl text-[13px] mt-3"
            >
              Crear primera cotización
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr
                  class="text-[11px] uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]"
                >
                  <th class="text-left px-5 py-3 font-medium">Folio</th>
                  <th class="text-left px-5 py-3 font-medium">Vehículo</th>
                  <th class="text-left px-5 py-3 font-medium">Cliente</th>
                  <th class="text-left px-5 py-3 font-medium">Estado</th>
                  <th class="text-left px-5 py-3 font-medium">Trámite</th>
                  <th class="text-right px-5 py-3 font-medium">Total</th>
                  <th class="text-left px-5 py-3 font-medium">Fecha</th>
                  <th class="text-left px-5 py-3 font-medium">Expira</th>
                </tr>
              </thead>
              <tbody>
                @for (c of items(); track c.id) {
                  <tr
                    (click)="router.navigate(['/cotizaciones', c.id])"
                    class="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] cursor-pointer text-[13.5px]"
                  >
                    <td class="px-5 py-3 font-mono-data font-semibold">{{ c.folio || '—' }}</td>
                    <td class="px-5 py-3">
                      {{ c.vehiculo || c.vin || '—' }}
                      @if (c.anno) {
                        <span class="text-[#9EA3AE]">({{ c.anno }})</span>
                      }
                    </td>
                    <td class="px-5 py-3">{{ c.clienteNombre || 'Sin cliente' }}</td>
                    <td class="px-5 py-3">
                      <span
                        class="px-2 py-1 rounded-lg text-[11px] font-semibold"
                        [style]="pill(c.estado)"
                        >{{ c.estado }}</span
                      >
                    </td>
                    <td class="px-5 py-3">
                      @if (c.tramiteId) {
                        <button
                          type="button"
                          (click)="
                            $event.stopPropagation(); router.navigate(['/tramites', c.tramiteId])
                          "
                          class="rounded-lg bg-[#DBEAFE] px-2 py-1 text-[11px] font-semibold text-[#1E40AF]"
                        >
                          {{ c.tramiteNumero || 'Ver tramite' }}
                        </button>
                      } @else {
                        <span class="text-[12px] text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3 text-right font-mono-data">
                      \${{ c.total | number: '1.2-2' }}
                    </td>
                    <td class="px-5 py-3 text-[#6B717F]">
                      {{ c.fechaCreacion | date: 'dd/MM/yyyy' }}
                    </td>
                    <td
                      class="px-5 py-3 text-[12px]"
                      [style.color]="expirada(c) ? '#B0181F' : '#9EA3AE'"
                    >
                      {{ c.fechaExpiracion ? (c.fechaExpiracion | date: 'dd/MM/yyyy') : '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC]">
              <span class="text-[12.5px] text-[#9EA3AE]"
                >Página {{ page() }} de {{ totalPages() }} · {{ total() }} registros</span
              >
              <div class="flex items-center gap-1.5">
                <button
                  (click)="irAPagina(page() - 1)"
                  [disabled]="page() <= 1"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Anterior
                </button>
                @for (p of paginas(); track p) {
                  <button
                    (click)="irAPagina(p)"
                    class="w-8 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150"
                    [style]="p === page() ? 'background:#0D1017;color:#fff;' : 'color:#6B717F;'"
                  >
                    {{ p === -1 ? '...' : p }}
                  </button>
                }
                <button
                  (click)="irAPagina(page() + 1)"
                  [disabled]="page() >= totalPages()"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class CotizacionesListComponent {
  private service = inject(CotizacionService);
  private excelExport = inject(ExcelExportService);
  router = inject(Router);

  items = signal<CotizacionListDto[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(0);
  readonly pageSize = 20;
  loading = signal(false);
  exportando = signal(false);
  search = '';
  estado = '';

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  buscar(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
  }

  load(): void {
    this.loading.set(true);
    this.service
      .getList({
        search: this.search || undefined,
        estado: this.estado || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: res => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  irAPagina(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  paginas(): number[] {
    const tp = this.totalPages();
    const cp = this.page();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, cp - delta); i <= Math.min(tp - 1, cp + delta); i++) range.push(i);
    const pages = [1];
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < tp - 1) pages.push(-1);
    if (tp > 1) pages.push(tp);
    return pages;
  }

  exportarExcel(): void {
    if (this.exportando()) return;
    this.exportando.set(true);
    this.service
      .getList({
        search: this.search || undefined,
        estado: this.estado || undefined,
        page: 1,
        pageSize: 9999,
      })
      .subscribe({
        next: res => {
          this.excelExport.exportCotizacionesList(res.items);
          this.exportando.set(false);
        },
        error: () => this.exportando.set(false),
      });
  }

  expirada(c: CotizacionListDto): boolean {
    if (!c.fechaExpiracion || c.estado === 'ACEPTADA' || c.estado === 'RECHAZADA') return false;
    return new Date(c.fechaExpiracion) < new Date();
  }

  pill(estado: string): string {
    const map: Record<string, string> = {
      BORRADOR: 'background:#F3F4F6;color:#4B5162;',
      ENVIADA: 'background:#DBEAFE;color:#1E40AF;',
      ACEPTADA: 'background:#DCFCE7;color:#166534;',
      RECHAZADA: 'background:#FEE2E2;color:#991B1B;',
      EXPIRADA: 'background:#FEF3C7;color:#92400E;',
    };
    return map[estado] || map['BORRADOR'];
  }
}
