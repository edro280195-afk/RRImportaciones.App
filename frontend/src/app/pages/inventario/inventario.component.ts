import { Component, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { VehiculoService, VehiculoListDto } from '../../services/vehiculo.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="flex items-center justify-between mb-6 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
            {{ vehiculos().length }} vehículos en patio
          </p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">
            Inventario
          </h1>
        </div>
        @if (sinClienteCount() > 0) {
          <div class="sc-alert" title="Vehículos registrados sin cliente — asígnalos">
            <span class="sc-dot"></span>
            {{ sinClienteCount() }} sin cliente
          </div>
        }
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
                <tr
                  class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]"
                >
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
                  <tr
                    class="text-[13.5px] text-[#1E2330] border-b border-[#F3F4F6]"
                    [style.background]="!v.clienteApodo ? '#FFFBFB' : null"
                  >
                    <td class="px-5 py-3.5 font-mono-data font-semibold">
                      {{ v.vinCorto || v.vin }}
                    </td>
                    <td class="px-5 py-3.5">
                      {{ v.marcaNombre || '—' }} {{ v.modeloNombre || '' }}
                    </td>
                    <td class="px-5 py-3.5">
                      @if (v.clienteApodo) {
                        {{ v.clienteApodo }}
                      } @else {
                        <span class="sc-badge" title="Vehículo sin cliente — asígnalo">
                          <span class="sc-dot"></span>
                          Sin cliente
                        </span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-[#6B717F] font-mono-data text-[12px]">
                      {{ v.fechaIngresoPatio | date: 'dd/MM/yyyy' }}
                    </td>
                    <td class="px-5 py-3.5">{{ v.ubicacionActual || '—' }}</td>
                    <td class="px-5 py-3.5 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <span
                          class="w-2.5 h-2.5 rounded-full"
                          [style]="
                            v.tieneTramiteActivo ? 'background: #D97706;' : 'background: #D1D5DB;'
                          "
                          title="Trámite activo"
                        ></span>
                        <span
                          class="w-2.5 h-2.5 rounded-full"
                          [style]="
                            v.cumplioRequisitos ? 'background: #16A34A;' : 'background: #D1D5DB;'
                          "
                          title="Requisitos"
                        ></span>
                        <span
                          class="w-2.5 h-2.5 rounded-full"
                          [style]="
                            v.tieneSelloAduanal ? 'background: #2563EB;' : 'background: #D1D5DB;'
                          "
                          title="Sello aduanal"
                        ></span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        (click)="openFotos(v)"
                        [disabled]="!hasFotos(v)"
                        class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors"
                        [class.border-[#C61D26]]="hasFotos(v)"
                        [class.text-[#C61D26]]="hasFotos(v)"
                        [class.bg-[#FFF5F5]]="hasFotos(v)"
                        [class.hover:bg-[#FEE2E2]]="hasFotos(v)"
                        [class.border-[#E4E7EC]]="!hasFotos(v)"
                        [class.text-[#9EA3AE]]="!hasFotos(v)"
                        [class.bg-[#F8FAFC]]="!hasFotos(v)"
                        [title]="hasFotos(v) ? 'Ver fotos del vehiculo' : 'Sin fotos cargadas'"
                      >
                        Fotos
                        @if (v.fotosUrls.length > 0) {
                          <span class="font-mono-data">{{ v.fotosUrls.length }}</span>
                        }
                      </button>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <button
                        (click)="
                          router.navigate(['/cotizaciones/nueva'], {
                            queryParams: { vehiculoId: v.id },
                          })
                        "
                        class="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#0D1017] text-white hover:bg-[#1E2330] transition-colors"
                      >
                        Cotizar
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
        <div
          class="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
          (click)="closeFotos()"
        >
          <div
            class="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between gap-4 border-b border-[#E4E7EC] p-5">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#9EA3AE]">
                  Fotos del vehiculo
                </p>
                <h2 class="mt-1 text-[18px] font-semibold text-[#0D1017]">
                  {{ v.marcaNombre || 'Vehiculo' }} {{ v.modeloNombre || '' }} {{ v.anno || '' }}
                </h2>
                <p class="mt-1 font-mono-data text-[12px] text-[#6B717F]">
                  {{ v.vin || 'Sin VIN' }}
                </p>
              </div>
              <button
                type="button"
                (click)="closeFotos()"
                class="rounded-lg px-3 py-1.5 text-[13px] text-[#6B717F] hover:bg-[#F3F4F6]"
              >
                Cerrar
              </button>
            </div>

            <div class="p-5">
              @if (v.fotosUrls.length > 0) {
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  @for (foto of v.fotosUrls; track foto) {
                    <a
                      [href]="fileUrl(foto)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block aspect-[4/3] overflow-hidden rounded-xl border border-[#E4E7EC] bg-[#F8FAFC]"
                    >
                      <img
                        [src]="fileUrl(foto)"
                        alt="Foto del vehiculo"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  }
                </div>
              } @else {
                <div
                  class="rounded-xl border border-dashed border-[#D8DEE8] bg-[#F8FAFC] p-10 text-center"
                >
                  <svg
                    class="w-8 h-8 text-[#D1D5DB] mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <p class="text-[13px] text-[#9EA3AE]">Sin preview disponible.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sc-alert {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 999px;
        background: #feecec;
        color: #c61d26;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid #f6c5c5;
      }
      .sc-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px 3px 8px;
        border-radius: 999px;
        background: #feecec;
        color: #c61d26;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid #f6c5c5;
      }
      .sc-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #c61d26;
        box-shadow: 0 0 0 0 rgba(198, 29, 38, 0.55);
        animation: sc-pulse 1.4s infinite;
      }
      @keyframes sc-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(198, 29, 38, 0.55);
        }
        70% {
          box-shadow: 0 0 0 7px rgba(198, 29, 38, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(198, 29, 38, 0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .sc-dot {
          animation: none;
        }
      }
    `,
  ],
})
export class InventarioComponent {
  private vehiculoService = inject(VehiculoService);
  router = inject(Router);

  vehiculos = signal<VehiculoListDto[]>([]);
  loading = signal(true);
  fotosModalVehiculo = signal<VehiculoListDto | null>(null);

  sinClienteCount = computed(() => this.vehiculos().filter(v => !v.clienteApodo).length);

  constructor() {
    this.vehiculoService.getInventarioActual().subscribe({
      next: res => {
        this.vehiculos.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  hasFotos(v: VehiculoListDto): boolean {
    return v.fotosUrls.length > 0;
  }

  openFotos(v: VehiculoListDto): void {
    if (!this.hasFotos(v)) return;
    this.fotosModalVehiculo.set(v);
  }

  closeFotos(): void {
    this.fotosModalVehiculo.set(null);
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }
}
