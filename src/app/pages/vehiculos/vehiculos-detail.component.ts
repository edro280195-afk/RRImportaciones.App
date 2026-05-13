import { Component, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculoService, VehiculoDetailDto, UpdateInventarioRequest } from '../../services/vehiculo.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-vehiculos-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div style="font-family: var(--font-body);">

      @if (vehiculo(); as v) {
        <!-- Back -->
        <a routerLink="/vehiculos" class="inline-flex items-center gap-1.5 text-[13px] text-[#6B717F] hover:text-[#1E2330] transition-colors duration-150 mb-4 no-underline">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Vehículos
        </a>

        <!-- Header -->
        <div class="flex items-start justify-between mb-6 gap-6 stagger-item">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
              {{ v.fechaRegistro | date:'dd/MM/yyyy' }}
            </p>
            <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none mb-1 font-mono-data">
              {{ v.vin }}
            </h1>
            @if (v.marcaNombre) {
              <p class="text-[14px] text-[#6B717F]">
                {{ v.marcaNombre }}{{ v.modeloNombre ? ' · ' + v.modeloNombre : '' }}{{ v.anno ? ' · ' + v.anno : '' }}
              </p>
            }
          </div>
          <div class="flex items-center gap-2">
            <a routerLink="/vehiculos" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 no-underline"
               style="background: #F3F4F6; color: #4B5162; border: 1px solid #E4E7EC;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Editar
            </a>
            <button
              (click)="deleteVehiculo()"
              [disabled]="deleting()"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
              style="background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA;"
            >
              @if (deleting()) {
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              } @else {
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              }
              Eliminar
            </button>
          </div>
        </div>

        <!-- Info grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-item" style="animation-delay: 40ms;">
          @for (item of infoItems; track item.label) {
            <div class="card-elevated rounded-2xl p-5">
              <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1">{{ item.label }}</p>
              <p class="text-[14px] font-medium text-[#1E2330] font-mono-data">{{ item.value }}</p>
            </div>
          }
        </div>

        <!-- Badges -->
        <div class="flex items-center gap-2 mb-6 stagger-item" style="animation-delay: 60ms;">
          @if (v.tieneTramiteActivo) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                  style="background: #FEF3C7; color: #78350F;">
              <span class="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
              Trámite activo
            </span>
          }
          @if (v.cumplioRequisitos) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                  style="background: #DCFCE7; color: #14532D;">
              <span class="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              Requisitos cumplidos
            </span>
          }
          @if (v.tieneSelloAduanal) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                  style="background: #DBEAFE; color: #1E3A8A;">
              <span class="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
              Sello aduanal
            </span>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-item" style="animation-delay: 80ms;">

          <!-- Cliente card -->
          <div class="card-elevated rounded-2xl p-5">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-2">Cliente</p>
            @if (v.clienteApodo) {
              <p class="text-[14px] font-semibold text-[#0D1017]">{{ v.clienteApodo }}</p>
            } @else {
              <p class="text-[14px] text-[#9EA3AE]">Sin cliente asignado</p>
            }
          </div>

          <!-- Value card -->
          <div class="card-elevated rounded-2xl p-5">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-2">Valor factura</p>
            @if (v.valorFactura) {
              <p class="text-[14px] font-semibold font-mono-data">{{ v.moneda }} {{ v.valorFactura.toFixed(2) }}</p>
            } @else {
              <p class="text-[14px] text-[#9EA3AE]">—</p>
            }
          </div>
        </div>

        <!-- Inventory management -->
        <div class="card-elevated rounded-2xl overflow-hidden mt-4 stagger-item" style="animation-delay: 100ms;">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
            <span class="text-[13px] font-semibold text-[#1E2330]">Inventario</span>
          </div>
          <div class="p-5">
            @if (inventarioSaved()) {
              <div class="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[13px] mb-4"
                   style="background: #DCFCE7; border: 1px solid #BBF7D0; color: #14532D;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 shrink-0 stroke-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Inventario actualizado correctamente
              </div>
            }
            <form (ngSubmit)="saveInventario()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Ubicación actual</label>
                <input
                  type="text"
                  [(ngModel)]="invForm.ubicacionActual" name="ubicacionActual"
                  placeholder="Ej. Patio principal"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Fecha pedimento próforma</label>
                <input
                  type="date"
                  [ngModel]="invForm.fechaPedimentoProforma ? (invForm.fechaPedimentoProforma | date:'yyyy-MM-dd') : ''"
                  (ngModelChange)="invForm.fechaPedimentoProforma = $event ? $event + 'T00:00:00Z' : null"
                  name="fechaPedimentoProforma"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1 flex items-end gap-4 pb-1">
                <label class="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="invForm.cumplioRequisitos" name="cumplioRequisitos"
                    class="w-4 h-4 rounded border-[#C9C5CA] text-[#C61D26] focus:ring-[#C61D26]"
                  />
                  <span class="text-[13px] text-[#1E2330]">Cumplió requisitos</span>
                </label>
                <label class="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="invForm.tieneSelloAduanal" name="tieneSelloAduanal"
                    class="w-4 h-4 rounded border-[#C9C5CA] text-[#C61D26] focus:ring-[#C61D26]"
                  />
                  <span class="text-[13px] text-[#1E2330]">Tiene sello aduanal</span>
                </label>
              </div>
              <div class="col-span-2 flex justify-end pt-2 border-t border-[#E4E7EC]">
                <button
                  type="submit"
                  [disabled]="savingInv()"
                  class="btn-primary px-5 py-2.5 rounded-xl text-[13px]"
                >
                  @if (savingInv()) {
                    <span class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Guardando…
                    </span>
                  } @else {
                    Actualizar inventario
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Trámites history -->
        <div class="card-elevated rounded-2xl overflow-hidden mt-4 stagger-item" style="animation-delay: 120ms;">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
            <span class="text-[13px] font-semibold text-[#1E2330]">Historial de trámites</span>
            <span class="text-[11px] text-[#9EA3AE] font-mono-data">{{ v.historialTramites.length }}</span>
          </div>
          @if (v.historialTramites.length === 0) {
            <div class="p-8 text-center">
              <p class="text-[13px] text-[#9EA3AE]">Sin trámites registrados</p>
            </div>
          } @else {
            <div class="divide-y divide-[#F3F4F6]">
              @for (t of v.historialTramites; track t.id) {
                <div class="flex items-center justify-between px-5 py-3">
                  <div>
                    <p class="text-[13.5px] font-semibold text-[#0D1017]">{{ t.numeroConsecutivo }}</p>
                    <p class="text-[12px] text-[#6B717F]">{{ t.fechaCreacion | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        [style]="statusStyle(t.estatus)">{{ t.estatus }}</span>
                </div>
              }
            </div>
          }
        </div>
      } @else if (loading()) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item">
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <svg class="w-6 h-6 text-[#9EA3AE] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p class="text-[14px] text-[#9EA3AE]">Cargando vehículo…</p>
          </div>
        </div>
      } @else {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item">
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <div class="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-[#DC2626]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">Vehículo no encontrado</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">{{ error() }}</p>
            <a routerLink="/vehiculos" class="btn-primary px-4 py-2 rounded-xl text-[13px] no-underline">Volver a vehículos</a>
          </div>
        </div>
      }
    </div>
  `,
})
export class VehiculosDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(VehiculoService);
  private notifications = inject(NotificationService);
  router = inject(Router);

  vehiculo = signal<VehiculoDetailDto | null>(null);
  loading = signal(true);
  error = signal('');
  deleting = signal(false);
  savingInv = signal(false);
  inventarioSaved = signal(false);

  infoItems: { label: string; value: string }[] = [];

  invForm: UpdateInventarioRequest = {
    ubicacionActual: null,
    cumplioRequisitos: false,
    tieneSelloAduanal: false,
    fechaPedimentoProforma: null,
  };

  constructor() {
    this.loadVehiculo();
  }

  loadVehiculo(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('ID no válido'); this.loading.set(false); return; }
    this.loading.set(true);
    this.error.set('');
    this.service.getById(id).subscribe({
      next: (v) => {
        this.vehiculo.set(v);
        this.infoItems = [
          { label: 'VIN corto', value: v.vinCorto || '—' },
          { label: 'Cilindrada', value: v.cilindradaCm3 ? `${v.cilindradaCm3} cm³` : '—' },
          { label: 'Categoría', value: v.categoria || '—' },
          { label: 'Fracción arancelaria', value: v.fraccionArancelaria || '—' },
          { label: 'Color', value: v.color || '—' },
          { label: 'No. Motor', value: v.numMotor || '—' },
          { label: 'Ingreso patio', value: v.fechaIngresoPatio ? new Date(v.fechaIngresoPatio).toLocaleDateString('es-MX') : '—' },
          { label: 'Ubicación', value: v.ubicacionActual || '—' },
        ];
        this.invForm = {
          ubicacionActual: v.ubicacionActual,
          cumplioRequisitos: v.cumplioRequisitos,
          tieneSelloAduanal: v.tieneSelloAduanal,
          fechaPedimentoProforma: (v as any).fechaPedimentoProforma || null,
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar vehículo');
        this.loading.set(false);
      },
    });
  }

  saveInventario(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.savingInv.set(true);
    this.inventarioSaved.set(false);
    this.service.updateInventario(id, this.invForm).subscribe({
      next: () => {
        this.savingInv.set(false);
        this.inventarioSaved.set(true);
        setTimeout(() => this.inventarioSaved.set(false), 3000);
      },
      error: err => {
        this.savingInv.set(false);
        this.notifications.fromHttpError(err, 'Error al actualizar inventario');
      },
    });
  }

  async deleteVehiculo(): Promise<void> {
    const v = this.vehiculo();
    if (!v) return;
    const confirmed = await this.notifications.confirm({
      title: 'Eliminar vehiculo',
      message: `Eliminar vehiculo VIN "${v.vin}"? Esta accion no se puede deshacer.`,
      confirmText: 'Eliminar',
    });
    if (!confirmed) return;

    this.deleting.set(true);
    this.service.delete(v.id).subscribe({
      next: () => {
        this.notifications.success('Vehiculo eliminado correctamente.');
        this.router.navigate(['/vehiculos']);
      },
      error: err => {
        this.deleting.set(false);
        this.notifications.fromHttpError(err, 'Error al eliminar vehiculo');
      },
    });
  }

  statusStyle(estatus: string): Record<string, string> {
    const map: Record<string, { bg: string; color: string }> = {
      'ACTIVO': { bg: '#DCFCE7', color: '#14532D' },
      'PENDIENTE': { bg: '#FEF3C7', color: '#78350F' },
      'FINALIZADO': { bg: '#DBEAFE', color: '#1E3A8A' },
      'CANCELADO': { bg: '#FEE2E2', color: '#7F1D1D' },
    };
    const s = map[estatus] || { bg: '#F3F4F6', color: '#4B5162' };
    return { background: s.bg, color: s.color };
  }
}
