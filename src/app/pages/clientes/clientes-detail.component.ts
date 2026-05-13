import { Component, signal, inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ClienteService, ClienteDetailDto } from '../../services/cliente.service';
import { ClienteFormDialogComponent } from './cliente-form-dialog.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-clientes-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ClienteFormDialogComponent],
  template: `
    <div style="font-family: var(--font-body);">

      @if (cliente(); as c) {
        <!-- Back -->
        <a routerLink="/clientes" class="inline-flex items-center gap-1.5 text-[13px] text-[#6B717F] hover:text-[#1E2330] transition-colors duration-150 mb-4 no-underline">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Clientes
        </a>

        <!-- Header -->
        <div class="flex items-start justify-between mb-6 gap-6 stagger-item">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
              {{ c.fechaRegistro | date:'dd/MM/yyyy' }}
            </p>
            <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none mb-1">
              {{ c.apodo }}
            </h1>
            @if (c.nombreCompleto) {
              <p class="text-[14px] text-[#6B717F]">{{ c.nombreCompleto }}</p>
            }
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="formDialog.openForEdit(c)"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
              style="background: #F3F4F6; color: #4B5162; border: 1px solid #E4E7EC;"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Editar
            </button>
            <button
              (click)="deleteCliente()"
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 stagger-item" style="animation-delay: 40ms;">
          @for (item of infoItems; track item.label) {
            <div class="card-elevated rounded-2xl p-5">
              <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1">{{ item.label }}</p>
              <p class="text-[14px] font-medium text-[#1E2330] font-mono-data">{{ item.value }}</p>
            </div>
          }
        </div>

        <!-- Notas -->
        @if (c.notas) {
          <div class="card-elevated rounded-2xl p-5 mb-6 stagger-item" style="animation-delay: 60ms;">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1.5">Notas</p>
            <p class="text-[14px] text-[#4B5162] leading-relaxed whitespace-pre-wrap">{{ c.notas }}</p>
          </div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-item" style="animation-delay: 80ms;">

          <!-- Vehicles -->
          <div class="card-elevated rounded-2xl overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
              <span class="text-[13px] font-semibold text-[#1E2330]">Vehículos</span>
              <span class="text-[11px] text-[#9EA3AE] font-mono-data">{{ c.vehiculos.length }}</span>
            </div>
            @if (c.vehiculos.length === 0) {
              <div class="p-8 text-center">
                <p class="text-[13px] text-[#9EA3AE]">Sin vehículos registrados</p>
              </div>
            } @else {
              <div class="divide-y divide-[#F3F4F6]">
                @for (v of c.vehiculos; track v.id) {
                  <div
                    (click)="router.navigate(['/vehiculos', v.id])"
                    class="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#FAFBFC] transition-all duration-100"
                  >
                    <div>
                      <p class="text-[13.5px] font-semibold text-[#0D1017] font-mono-data">{{ v.vin }}</p>
                      <p class="text-[12.5px] text-[#6B717F]">{{ v.marcaNombre || '' }} {{ v.modeloNombre || '' }} {{ v.anno ? '· ' + v.anno : '' }}</p>
                    </div>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 text-[#9EA3AE] stroke-2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Tramites -->
          <div class="card-elevated rounded-2xl overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC]">
              <span class="text-[13px] font-semibold text-[#1E2330]">Últimos trámites</span>
              <span class="text-[11px] text-[#9EA3AE] font-mono-data">{{ c.ultimosTramites.length }}</span>
            </div>
            @if (c.ultimosTramites.length === 0) {
              <div class="p-8 text-center">
                <p class="text-[13px] text-[#9EA3AE]">Sin trámites registrados</p>
              </div>
            } @else {
              <div class="divide-y divide-[#F3F4F6]">
                @for (t of c.ultimosTramites; track t.id) {
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

        </div>
      } @else if (loading()) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item">
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <svg class="w-6 h-6 text-[#9EA3AE] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p class="text-[14px] text-[#9EA3AE]">Cargando cliente…</p>
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
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">Cliente no encontrado</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">{{ error() }}</p>
            <a routerLink="/clientes" class="btn-primary px-4 py-2 rounded-xl text-[13px] no-underline">
              Volver a clientes
            </a>
          </div>
        </div>
      }
    </div>

    <app-cliente-form-dialog #formDialog (saved)="loadCliente()" />
  `,
})
export class ClientesDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(ClienteService);
  private notifications = inject(NotificationService);
  router = inject(Router);

  @ViewChild('formDialog') formDialog!: ClienteFormDialogComponent;

  cliente = signal<ClienteDetailDto | null>(null);
  loading = signal(true);
  error = signal('');
  deleting = signal(false);

  infoItems: { label: string; value: string }[] = [];

  constructor() {
    this.loadCliente();
  }

  loadCliente(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('ID no válido'); this.loading.set(false); return; }
    this.loading.set(true);
    this.error.set('');
    this.service.getById(id).subscribe({
      next: (c) => {
        this.cliente.set(c);
        this.infoItems = [
          { label: 'RFC', value: c.rfc || '—' },
          { label: 'Email', value: c.email || '—' },
          { label: 'Teléfono', value: c.telefono || '—' },
          { label: 'Procedencia', value: c.procedencia || '—' },
          { label: 'Dirección', value: c.direccion || '—' },
          { label: 'Vehículos', value: String(c.totalVehiculos) },
          { label: 'Trámites', value: String(c.totalTramites) },
          { label: 'Facturado', value: c.totalFacturado > 0 ? `$${c.totalFacturado.toFixed(2)}` : '$0.00' },
        ];
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar cliente');
        this.loading.set(false);
      },
    });
  }

  async deleteCliente(): Promise<void> {
    const c = this.cliente();
    if (!c) return;
    const confirmed = await this.notifications.confirm({
      title: 'Eliminar cliente',
      message: `Eliminar a "${c.apodo}"? Esta accion no se puede deshacer.`,
      confirmText: 'Eliminar',
    });
    if (!confirmed) return;
    this.deleting.set(true);
    this.service.delete(c.id).subscribe({
      next: () => {
        this.notifications.success('Cliente eliminado correctamente.');
        this.router.navigate(['/clientes']);
      },
      error: err => {
        this.deleting.set(false);
        this.notifications.fromHttpError(err, 'Error al eliminar cliente');
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
