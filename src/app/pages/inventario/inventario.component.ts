import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { VehiculoService, VehiculoListDto } from '../../services/vehiculo.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="flex items-center justify-between mb-6 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">{{ vehiculos().length }} vehículos en patio</p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">Inventario</h1>
        </div>
      </div>

      @if (loading()) {
        <div class="card-elevated rounded-2xl p-16 text-center">
          <p class="text-[14px] text-[#9EA3AE]">Cargando…</p>
        </div>
      } @else if (vehiculos().length === 0) {
        <div class="card-elevated rounded-2xl p-16 text-center">
          <p class="text-[14px] font-medium text-[#1E2330] mb-1">Sin vehículos en patio</p>
          <p class="text-[13px] text-[#9EA3AE]">No hay vehículos sin trámite activo.</p>
        </div>
      } @else {
        <div class="card-elevated rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                  <th class="text-left px-5 py-3.5">VIN corto</th>
                  <th class="text-left px-5 py-3.5">Marca / Modelo</th>
                  <th class="text-left px-5 py-3.5">Cliente</th>
                  <th class="text-left px-5 py-3.5">Ingreso patio</th>
                  <th class="text-left px-5 py-3.5">Ubicación</th>
                  <th class="text-center px-5 py-3.5">Checkpoints</th>
                  <th class="text-center px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                @for (v of vehiculos(); track v.id) {
                  <tr class="text-[13.5px] text-[#1E2330] border-b border-[#F3F4F6]">
                    <td class="px-5 py-3.5 font-mono-data font-semibold">{{ v.vinCorto || v.vin }}</td>
                    <td class="px-5 py-3.5">{{ v.marcaNombre || '—' }} {{ v.modeloNombre || '' }}</td>
                    <td class="px-5 py-3.5">{{ v.clienteApodo || '—' }}</td>
                    <td class="px-5 py-3.5 text-[#6B717F] font-mono-data text-[12px]">{{ v.fechaIngresoPatio | date:'dd/MM/yyyy' }}</td>
                    <td class="px-5 py-3.5">{{ v.ubicacionActual || '—' }}</td>
                    <td class="px-5 py-3.5 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full" [style]="v.tieneTramiteActivo ? 'background: #D97706;' : 'background: #D1D5DB;'" title="Trámite activo"></span>
                        <span class="w-2.5 h-2.5 rounded-full" [style]="v.cumplioRequisitos ? 'background: #16A34A;' : 'background: #D1D5DB;'" title="Requisitos"></span>
                        <span class="w-2.5 h-2.5 rounded-full" [style]="v.tieneSelloAduanal ? 'background: #2563EB;' : 'background: #D1D5DB;'" title="Sello aduanal"></span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <button (click)="router.navigate(['/tramites'])"
                        class="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#0D1017] text-white hover:bg-[#1E2330] transition-colors">
                        Iniciar trámite
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class InventarioComponent {
  private vehiculoService = inject(VehiculoService);
  router = inject(Router);

  vehiculos = signal<VehiculoListDto[]>([]);
  loading = signal(true);

  constructor() {
    this.vehiculoService.getInventarioActual().subscribe({
      next: (res) => { this.vehiculos.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
