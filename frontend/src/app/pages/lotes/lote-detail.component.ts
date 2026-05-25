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
          <div class="flex flex-wrap items-center gap-2">
            @if (l.estado !== 'CANCELADO') {
              <button
                (click)="enviarWhatsApp()"
                [disabled]="actionLoading()"
                class="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </button>

              <button
                (click)="descargarPdf()"
                [disabled]="actionLoading()"
                class="rounded-xl border border-[#E4E7EC] bg-white px-4 py-2 text-[13px] font-medium text-[#4B5162] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                PDF
              </button>

              <button
                (click)="cancelarLote()"
                [disabled]="actionLoading()"
                class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-[13px] font-medium text-[#991B1B] hover:bg-[#FEE2E2] disabled:opacity-50"
              >
                Cancelar lote
              </button>
            }
            <button
              (click)="router.navigate(['/lotes/nuevo'])"
              class="rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1E2330]"
            >
              Nuevo lote
            </button>
          </div>
        </div>

        @if (actionError()) {
          <div class="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
            {{ actionError() }}
          </div>
        }

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
                  <th class="px-5 py-3.5 text-right"></th>
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
                    <td class="px-5 py-3.5 text-right">
                      @if (l.estado !== 'CANCELADO' && t.estadoLogistico !== 'CANCELADO') {
                        <button
                          (click)="removerVehiculo(t.id, $event)"
                          title="Remover vehículo"
                          class="rounded p-1 text-[#9EA3AE] transition-colors hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      }
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
  actionLoading = signal(false);
  actionError = signal<string | null>(null);

  constructor() {
    this.cargarLote();
  }

  cargarLote(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loteService.getById(id).subscribe(lote => this.lote.set(lote));
    }
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

  descargarPdf(): void {
    const l = this.lote();
    if (!l) return;
    this.loteService.descargarPdf(l.id);
  }

  enviarWhatsApp(): void {
    const l = this.lote();
    if (!l) return;

    const telefono = window.prompt('Ingrese el número de teléfono (con código de país, ej. +521234567890):', '');
    if (!telefono) return;

    this.actionLoading.set(true);
    this.actionError.set(null);

    this.loteService.enviarWhatsApp(l.id, telefono, 'Hola, te envío el resumen de tu lote.').subscribe({
      next: (res) => {
        this.actionLoading.set(false);
        window.open(res.whatsappUrl, '_blank');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.actionError.set(err.error?.message || 'Error al generar el link de WhatsApp.');
      }
    });
  }

  cancelarLote(): void {
    const l = this.lote();
    if (!l) return;

    if (!window.confirm('¿Está seguro de que desea cancelar este lote y TODOS sus trámites asociados?')) {
      return;
    }

    this.actionLoading.set(true);
    this.actionError.set(null);

    this.loteService.cancelar(l.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.cargarLote();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.actionError.set(err.error?.message || 'Error al cancelar el lote.');
      }
    });
  }

  removerVehiculo(tramiteId: string, event: Event): void {
    event.stopPropagation();
    const l = this.lote();
    if (!l) return;

    if (!window.confirm('¿Está seguro de que desea remover este vehículo del lote? El trámite asociado será eliminado.')) {
      return;
    }

    this.actionLoading.set(true);
    this.actionError.set(null);

    this.loteService.removerVehiculo(l.id, tramiteId).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.cargarLote();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.actionError.set(err.error?.message || 'Error al remover el vehículo.');
      }
    });
  }
}
