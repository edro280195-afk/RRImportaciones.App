import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CotizacionListDto, CotizacionService } from '../../services/cotizacion.service';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div>
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#9EA3AE] mb-1">{{ total() }} registros</p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] leading-none">Cotizaciones</h1>
        </div>
        <button (click)="router.navigate(['/cotizaciones/nueva'])" class="btn-primary px-4 py-2 rounded-xl text-[13px]">Nueva cotización</button>
      </div>

      <div class="flex items-center gap-3 mb-5 flex-wrap">
        <input [(ngModel)]="search" (input)="load()" placeholder="Buscar folio, VIN o modelo"
          class="w-full max-w-[320px] px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px] outline-none focus:border-[#C61D26]" />
        <select [(ngModel)]="estado" (change)="load()" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="ACEPTADA">Aceptada</option>
          <option value="RECHAZADA">Rechazada</option>
        </select>
      </div>

      <div class="card-elevated rounded-2xl overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-[13px] text-[#9EA3AE]">Cargando cotizaciones...</div>
        } @else if (items().length === 0) {
          <div class="p-12 text-center">
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">Sin cotizaciones</p>
            <button (click)="router.navigate(['/cotizaciones/nueva'])" class="btn-primary px-4 py-2 rounded-xl text-[13px] mt-3">Crear primera cotización</button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-[11px] uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                  <th class="text-left px-5 py-3 font-medium">Folio</th>
                  <th class="text-left px-5 py-3 font-medium">Vehículo</th>
                  <th class="text-left px-5 py-3 font-medium">Cliente</th>
                  <th class="text-left px-5 py-3 font-medium">Estado</th>
                  <th class="text-left px-5 py-3 font-medium">Convertida</th>
                  <th class="text-right px-5 py-3 font-medium">Total</th>
                  <th class="text-left px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                @for (c of items(); track c.id) {
                  <tr (click)="router.navigate(['/cotizaciones', c.id])" class="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] cursor-pointer text-[13.5px]">
                    <td class="px-5 py-3 font-mono-data font-semibold">{{ c.folio || '—' }}</td>
                    <td class="px-5 py-3">{{ c.vehiculo || c.vin || '—' }} @if (c.anno) { <span class="text-[#9EA3AE]">({{ c.anno }})</span> }</td>
                    <td class="px-5 py-3">{{ c.clienteNombre || 'Sin cliente' }}</td>
                    <td class="px-5 py-3"><span class="px-2 py-1 rounded-lg text-[11px] font-semibold" [style]="pill(c.estado)">{{ c.estado }}</span></td>
                    <td class="px-5 py-3">
                      @if (c.tramiteId) {
                        <button type="button" (click)="$event.stopPropagation(); router.navigate(['/tramites', c.tramiteId])" class="rounded-lg bg-[#DBEAFE] px-2 py-1 text-[11px] font-semibold text-[#1E40AF]">{{ c.tramiteNumero || 'Ver tramite' }}</button>
                      } @else {
                        <span class="text-[12px] text-[#9EA3AE]">No</span>
                      }
                    </td>
                    <td class="px-5 py-3 text-right font-mono-data">\${{ c.total | number:'1.2-2' }}</td>
                    <td class="px-5 py-3 text-[#6B717F]">{{ c.fechaCreacion | date:'dd/MM/yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class CotizacionesListComponent {
  private service = inject(CotizacionService);
  router = inject(Router);

  items = signal<CotizacionListDto[]>([]);
  total = signal(0);
  loading = signal(false);
  search = '';
  estado = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getList({ search: this.search || undefined, estado: this.estado || undefined }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  pill(estado: string): string {
    const map: Record<string, string> = {
      BORRADOR: 'background:#F3F4F6;color:#4B5162;',
      ENVIADA: 'background:#DBEAFE;color:#1E40AF;',
      ACEPTADA: 'background:#DCFCE7;color:#166534;',
      RECHAZADA: 'background:#FEE2E2;color:#991B1B;',
    };
    return map[estado] || map['BORRADOR'];
  }
}
