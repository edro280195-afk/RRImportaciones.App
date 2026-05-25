import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoteDetailDto, LoteImportacionService } from '../../services/lote-importacion.service';

@Component({
  selector: 'app-lote-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div style="font-family: var(--font-body);">
      <button
        (click)="router.navigate(['/lotes'])"
        class="mb-4 flex items-center gap-1.5 text-[12.5px] text-[#9EA3AE] transition-colors hover:text-[#0D1017]"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-3.5 w-3.5 stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
        </svg>
        Volver a lotes
      </button>

      @if (lote(); as l) {
        <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="mb-1 flex flex-wrap items-center gap-3">
              <h1 class="text-[28px] font-bold tracking-[-0.8px] text-[#0D1017]">
                {{ l.folioLote }}
              </h1>
              <span class="rounded-lg px-3 py-1 text-[12px] font-semibold" [style]="estadoPill(l.estado)">
                {{ l.estado }}
              </span>
            </div>
            <p class="text-[13px] text-[#6B717F]">
              {{ l.clienteApodo || 'Sin cliente' }} / {{ l.totalTramites }} vehiculos /
              creado {{ l.fechaCreacion | date: 'dd/MM/yyyy HH:mm' }}
            </p>
          </div>
          <button
            (click)="router.navigate(['/lotes/nuevo'])"
            class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2 text-[13px] font-medium text-[#4B5162]"
          >
            Nuevo lote
          </button>
        </div>

        <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div class="card-elevated rounded-xl p-4">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">Cliente</p>
            <p class="text-[15px] font-semibold text-[#0D1017]">{{ l.clienteApodo || 'Sin cliente' }}</p>
            <p class="text-[12px] text-[#6B717F]">{{ l.clienteNombre || '' }}</p>
          </div>
          <div class="card-elevated rounded-xl p-4">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">Operacion</p>
            <p class="text-[15px] font-semibold text-[#0D1017]">{{ l.aduanaNombre || 'Sin aduana' }}</p>
            <p class="text-[12px] text-[#6B717F]">{{ l.tramitadorNombre || 'Sin tramitador' }}</p>
          </div>
          <div class="card-elevated rounded-xl p-4">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">Total</p>
            <p class="font-mono-data text-[16px] font-semibold text-[#0D1017]">
              {{ l.montoTotal | currency: 'MXN' }}
            </p>
            <p class="text-[12px] text-[#6B717F]">Pagado: {{ l.totalPagado | currency: 'MXN' }}</p>
          </div>
          <div class="card-elevated rounded-xl p-4">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">Saldo</p>
            <p class="font-mono-data text-[16px] font-semibold" [style.color]="l.saldoPendiente > 0 ? '#D97706' : '#16A34A'">
              {{ l.saldoPendiente | currency: 'MXN' }}
            </p>
            <p class="text-[12px] text-[#6B717F]">{{ completedCount(l) }}/{{ l.tramites.length }} cerrados</p>
          </div>
        </div>

        @if (l.notas) {
          <div class="card-elevated mb-6 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">Notas</p>
            <p class="text-[13px] text-[#1E2330]">{{ l.notas }}</p>
          </div>
        }

        <div class="card-elevated overflow-hidden rounded-2xl">
          <div class="border-b border-[#E4E7EC] px-5 py-4">
            <h2 class="text-[15px] font-semibold text-[#0D1017]">Vehiculos del lote</h2>
            <p class="text-[12px] text-[#6B717F]">
              Cada fila sigue siendo un tramite normal; el lote solo los agrupa.
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[880px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">
                  <th class="px-5 py-3.5 text-left">Tramite</th>
                  <th class="px-5 py-3.5 text-left">Vehiculo</th>
                  <th class="px-5 py-3.5 text-left">VIN</th>
                  <th class="px-5 py-3.5 text-right">Cobro</th>
                  <th class="px-5 py-3.5 text-right">Saldo</th>
                  <th class="px-5 py-3.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (t of l.tramites; track t.id) {
                  <tr
                    (click)="router.navigate(['/tramites', t.id])"
                    class="cursor-pointer border-b border-[#F3F4F6] text-[13.5px] transition-colors hover:bg-[#FAFBFC]"
                  >
                    <td class="px-5 py-3.5 font-mono-data font-semibold text-[#0D1017]">
                      {{ t.numeroConsecutivo }}
                    </td>
                    <td class="px-5 py-3.5">
                      {{ t.vehiculoMarcaModelo || t.descripcionMercancia || 'Sin descripcion' }}
                    </td>
                    <td class="px-5 py-3.5 font-mono-data text-[#6B717F]">
                      {{ t.vehiculoVin || 'Sin VIN' }}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono-data">
                      {{ t.cobroTotal + t.cargoExpress | currency: 'MXN' }}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono-data" [style.color]="t.saldoPendiente > 0 ? '#D97706' : '#16A34A'">
                      {{ t.saldoPendiente | currency: 'MXN' }}
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <span class="rounded-lg px-2 py-0.5 text-[11px] font-semibold" [style]="tramitePill(t.estadoLogistico)">
                        {{ t.estadoLogistico }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="p-12 text-center text-[13px] text-[#9EA3AE]">Cargando lote...</div>
      }
    </div>
  `,
})
export class LoteDetailComponent {
  private loteService = inject(LoteImportacionService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  lote = signal<LoteDetailDto | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loteService.getById(id).subscribe(lote => this.lote.set(lote));
  }

  completedCount(lote: LoteDetailDto): number {
    return lote.tramites.filter(t =>
      ['ENTREGADO_AL_CLIENTE', 'VERDE_ENTREGADO', 'COBRADO', 'CANCELADO'].includes(t.estadoLogistico)
    ).length;
  }

  estadoPill(estado: string): string {
    const colors: Record<string, string> = {
      EN_PROGRESO: 'background:#DBEAFE;color:#1E40AF;',
      PARCIALMENTE_CERRADO: 'background:#FEF3C7;color:#92400E;',
      CERRADO: 'background:#DCFCE7;color:#166534;',
      CANCELADO: 'background:#F3F4F6;color:#6B7280;',
    };
    return colors[estado] || 'background:#F3F4F6;color:#4B5162;';
  }

  tramitePill(estado: string): string {
    const colors: Record<string, string> = {
      PENDIENTE_TRAMITE: 'background:#FEF3C7;color:#92400E;',
      FOTOS_SOLICITADAS: 'background:#FEE2E2;color:#991B1B;',
      ROJO_DESADUANADO: 'background:#FEE2E2;color:#991B1B;',
      ENTREGADO_AL_CLIENTE: 'background:#DCFCE7;color:#166534;',
      COBRADO: 'background:#DCFCE7;color:#166534;',
      CANCELADO: 'background:#F3F4F6;color:#6B7280;',
    };
    return colors[estado] || 'background:#F3F4F6;color:#4B5162;';
  }
}
