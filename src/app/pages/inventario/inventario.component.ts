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
                  <th class="text-center px-5 py-3.5">Fotos</th>
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
                      <button type="button" (click)="openFotos(v)" [disabled]="!hasFotos(v)"
                        class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors"
                        [class.border-[#C61D26]]="hasFotos(v)"
                        [class.text-[#C61D26]]="hasFotos(v)"
                        [class.bg-[#FFF5F5]]="hasFotos(v)"
                        [class.hover:bg-[#FEE2E2]]="hasFotos(v)"
                        [class.border-[#E4E7EC]]="!hasFotos(v)"
                        [class.text-[#9EA3AE]]="!hasFotos(v)"
                        [class.bg-[#F8FAFC]]="!hasFotos(v)"
                        [title]="hasFotos(v) ? 'Ver fotos del vehiculo' : 'Sin fotos cargadas'">
                        Fotos
                        @if (v.fotosCount) {
                          <span class="font-mono-data">{{ v.fotosCount }}</span>
                        }
                      </button>
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

      @if (fotosModalVehiculo(); as v) {
        <div class="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" (click)="closeFotos()">
          <div class="w-full max-w-2xl rounded-2xl bg-white shadow-xl" (click)="$event.stopPropagation()">
            <div class="flex items-start justify-between gap-4 border-b border-[#E4E7EC] p-5">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9EA3AE]">Fotos del vehiculo</p>
                <h2 class="mt-1 text-[18px] font-semibold text-[#0D1017]">{{ v.marcaNombre || 'Vehiculo' }} {{ v.modeloNombre || '' }} {{ v.anno || '' }}</h2>
                <p class="mt-1 font-mono-data text-[12px] text-[#6B717F]">{{ v.vin || 'Sin VIN' }}</p>
              </div>
              <button type="button" (click)="closeFotos()" class="rounded-lg px-3 py-1.5 text-[13px] text-[#6B717F] hover:bg-[#F3F4F6]">Cerrar</button>
            </div>

            <div class="p-5">
              @if (v.fotoPreviewUrl) {
                <img [src]="fileUrl(v.fotoPreviewUrl)" alt="Foto del vehiculo" class="max-h-[420px] w-full rounded-xl object-contain bg-[#F8FAFC]" />
              } @else {
                <div class="rounded-xl border border-dashed border-[#D8DEE8] bg-[#F8FAFC] p-10 text-center">
                  <p class="text-[14px] font-medium text-[#1E2330]">Este vehiculo indica fotos, pero todavia no hay preview disponible.</p>
                  <p class="mt-1 text-[13px] text-[#8B93A1]">Cuando conectemos Cloudflare R2 aqui se mostrara la galeria completa.</p>
                </div>
              }
            </div>
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
  fotosModalVehiculo = signal<VehiculoListDto | null>(null);

  constructor() {
    this.vehiculoService.getInventarioActual().subscribe({
      next: (res) => { this.vehiculos.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  hasFotos(v: VehiculoListDto): boolean {
    return (v.fotosCount ?? 0) > 0 || !!v.fotoPreviewUrl;
  }

  openFotos(v: VehiculoListDto): void {
    if (!this.hasFotos(v)) return;
    this.fotosModalVehiculo.set(v);
  }

  closeFotos(): void {
    this.fotosModalVehiculo.set(null);
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }
}
