import { Component, OnDestroy, signal, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  AprobarClienteTemporalRequest,
  ClienteService,
  ClienteListDto,
  ClienteTemporalDto,
} from '../../services/cliente.service';
import { ClienteFormDialogComponent } from './cliente-form-dialog.component';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { RealtimeService } from '../../services/realtime.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [FormsModule, DatePipe, ClienteFormDialogComponent],
  template: `
    <div style="font-family: var(--font-body);">
      <!-- Page head -->
      <div class="flex items-center justify-between mb-6 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
            {{ total() }} registros
          </p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">
            Clientes
          </h1>
        </div>
        @if (auth.can('CLIENTES_CREAR')) {
          <button
            (click)="formDialog.openForCreate()"
            class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo cliente
          </button>
        }
      </div>

      <!-- Search + filters -->
      <div class="flex items-center gap-3 mb-5 stagger-item" style="animation-delay: 40ms;">
        <div class="relative flex-1 max-w-[380px]">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9EA3AE] stroke-2 pointer-events-none"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            [(ngModel)]="search"
            (input)="onSearch()"
            placeholder="Buscar por apodo, nombre o teléfono…"
            class="w-full pl-9 pr-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
          />
        </div>
      </div>

      @if (temporales().length > 0) {
        <section
          class="mb-5 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-4 stagger-item"
          style="animation-delay: 60ms;"
        >
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-[14px] font-semibold text-[#9A3412]">
                Clientes capturados en campo
              </p>
              <p class="text-[12.5px] text-[#C2410C]">
                Valida los datos y crea el cliente oficial para relacionarlo automáticamente con su vehículo.
              </p>
            </div>
            <span class="self-start rounded-full bg-[#FFEDD5] px-2.5 py-1 text-[12px] font-semibold text-[#9A3412]">
              {{ temporales().length }} pendiente{{ temporales().length === 1 ? '' : 's' }}
            </span>
          </div>

          <div class="mt-3 grid gap-2">
            @for (temporal of temporales(); track temporal.id) {
              <div class="flex flex-col gap-3 rounded-xl border border-[#FED7AA] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-[13.5px] font-semibold text-[#1E2330]">
                    {{ temporal.nombrePropuesto }}
                  </p>
                  <p class="text-[12px] text-[#6B717F]">
                    {{ temporal.vehiculoResumen || 'Unidad sin descripción' }}
                    @if (temporal.vin) { · VIN {{ temporal.vin }} }
                    @if (temporal.operadorNombre) { · {{ temporal.operadorNombre }} }
                  </p>
                </div>
                @if (auth.can('CLIENTES_CREAR')) {
                  <button
                    type="button"
                    class="shrink-0 rounded-xl bg-[#C61D26] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#A01520]"
                    (click)="openTemporal(temporal)"
                  >
                    Revisar y vincular
                  </button>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- Table -->
      @if (loading()) {
        <div
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay: 80ms;"
        >
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <svg class="w-6 h-6 text-[#9EA3AE] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
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
            <p class="text-[14px] text-[#9EA3AE]">Cargando clientes…</p>
          </div>
        </div>
      } @else if (clientes().length === 0) {
        <div
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay: 80ms;"
        >
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <div class="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-5 h-5 stroke-2 text-[#9EA3AE]"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">No hay clientes</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">Crea tu primer cliente para empezar.</p>
            <button
              (click)="formDialog.openForCreate()"
              class="btn-primary px-4 py-2 rounded-xl text-[13px]"
            >
              Nuevo cliente
            </button>
          </div>
        </div>
      } @else {
        <div
          class="card-elevated rounded-2xl overflow-hidden stagger-item"
          style="animation-delay: 80ms;"
        >
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr
                  class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]"
                >
                  <th class="text-left px-5 py-3.5 font-medium">Apodo</th>
                  <th class="text-left px-5 py-3.5 font-medium">Nombre completo</th>
                  <th class="text-left px-5 py-3.5 font-medium">Teléfono</th>
                  <th class="text-left px-5 py-3.5 font-medium">Procedencia</th>
                  <th class="text-center px-5 py-3.5 font-medium">Vehículos</th>
                  <th class="text-center px-5 py-3.5 font-medium">Trámites</th>
                  <th class="text-right px-5 py-3.5 font-medium">Facturado</th>
                  <th class="text-left px-5 py-3.5 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                @for (c of clientes(); track c.id; let i = $index) {
                  <tr
                    (click)="router.navigate(['/clientes', c.id])"
                    class="text-[13.5px] text-[#1E2330] border-b border-[#F3F4F6] cursor-pointer transition-all duration-100 hover:bg-[#FAFBFC]"
                    style="animation: fadeIn 300ms ease-out;"
                  >
                    <td class="px-5 py-3.5">
                      <span class="font-semibold text-[#0D1017]">{{ c.apodo }}</span>
                    </td>
                    <td class="px-5 py-3.5 text-[#6B717F]">{{ c.nombreCompleto || '—' }}</td>
                    <td class="px-5 py-3.5 font-mono-data text-[13px] text-[#6B717F]">
                      {{ c.telefono || '—' }}
                    </td>
                    <td class="px-5 py-3.5">
                      @if (c.procedencia) {
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-medium"
                          style="background: #F3F4F6; color: #4B5162;"
                          >{{ c.procedencia }}</span
                        >
                      } @else {
                        <span class="text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-center font-mono-data text-[14px]">
                      {{ c.totalVehiculos }}
                    </td>
                    <td class="px-5 py-3.5 text-center font-mono-data text-[14px]">
                      {{ c.totalTramites }}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono-data text-[14px]">
                      @if (c.totalFacturado > 0) {
                        <span>{{ formatMoney(c.totalFacturado) }}</span>
                      } @else {
                        <span class="text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-[#6B717F] font-mono-data">
                      {{ c.fechaRegistro | date: 'dd/MM/yyyy' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC]">
              <span class="text-[12.5px] text-[#9EA3AE]">
                Página {{ page() }} de {{ totalPages() }}
              </span>
              <div class="flex items-center gap-1.5">
                <button
                  (click)="goToPage(page() - 1)"
                  [disabled]="page() <= 1"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Anterior
                </button>
                @for (p of pages(); track p) {
                  <button
                    (click)="goToPage(p)"
                    class="w-8 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150"
                    [style]="
                      p === page()
                        ? 'background: #0D1017; color: #fff;'
                        : 'color: #6B717F; hover:background: #F3F4F6;'
                    "
                    [class.hover:bg-[#F3F4F6]]="p !== page()"
                  >
                    {{ p }}
                  </button>
                }
                <button
                  (click)="goToPage(page() + 1)"
                  [disabled]="page() >= totalPages()"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-cliente-form-dialog #formDialog (saved)="loadClientes()" />

    @if (temporalEnRevision(); as temporal) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" (click)="closeTemporal()">
        <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" (click)="$event.stopPropagation()">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#C2410C]">Cliente de campo</p>
              <h2 class="mt-1 text-[20px] font-semibold text-[#0D1017]">Validar y registrar cliente</h2>
              <p class="mt-1 text-[13px] text-[#6B717F]">
                La unidad quedará vinculada automáticamente al guardar.
              </p>
            </div>
            <button type="button" class="text-2xl leading-none text-[#9EA3AE]" (click)="closeTemporal()">×</button>
          </div>

          <div class="mb-5 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 text-[13px] text-[#4B5162]">
            <p><strong>Nombre capturado:</strong> {{ temporal.nombrePropuesto }}</p>
            <p><strong>Vehículo:</strong> {{ temporal.vehiculoResumen || '—' }}</p>
            @if (temporal.vin) { <p><strong>VIN:</strong> {{ temporal.vin }}</p> }
            @if (temporal.ubicacion) { <p><strong>Ubicación:</strong> {{ temporal.ubicacion }}</p> }
          </div>

          @if (temporalError()) {
            <p class="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2.5 text-[13px] text-[#991B1B]">{{ temporalError() }}</p>
          }

          <form (ngSubmit)="aprobarTemporal()" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="text-[12px] font-semibold text-[#4B5162]">
              Apodo <span class="text-[#DC2626]">*</span>
              <input [(ngModel)]="temporalForm.apodo" name="temporalApodo" required class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162]">
              Nombre completo
              <input [(ngModel)]="temporalForm.nombreCompleto" name="temporalNombreCompleto" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162]">
              RFC
              <input [(ngModel)]="temporalForm.rfc" name="temporalRfc" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] uppercase outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162]">
              Teléfono
              <input [(ngModel)]="temporalForm.telefono" name="temporalTelefono" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162]">
              Email
              <input [(ngModel)]="temporalForm.email" name="temporalEmail" type="email" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162]">
              Procedencia
              <input [(ngModel)]="temporalForm.procedencia" name="temporalProcedencia" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162] sm:col-span-2">
              Dirección
              <input [(ngModel)]="temporalForm.direccion" name="temporalDireccion" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]" />
            </label>
            <label class="text-[12px] font-semibold text-[#4B5162] sm:col-span-2">
              Notas
              <textarea [(ngModel)]="temporalForm.notas" name="temporalNotas" rows="3" class="mt-1 w-full resize-none rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]"></textarea>
            </label>

            <div class="mt-2 flex flex-col-reverse gap-2 border-t border-[#E4E7EC] pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[13px] font-semibold text-[#B91C1C]" [disabled]="temporalSaving()" (click)="rechazarTemporal()">
                Rechazar
              </button>
              <button type="submit" class="rounded-xl bg-[#C61D26] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50" [disabled]="temporalSaving() || !temporalForm.apodo.trim()">
                {{ temporalSaving() ? 'Guardando…' : 'Crear y vincular cliente' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientesListComponent implements OnDestroy {
  private service = inject(ClienteService);
  router = inject(Router);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private realtime = inject(RealtimeService);

  @ViewChild('formDialog') formDialog!: ClienteFormDialogComponent;

  clientes = signal<ClienteListDto[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(true);
  search = signal('');
  temporales = signal<ClienteTemporalDto[]>([]);
  temporalEnRevision = signal<ClienteTemporalDto | null>(null);
  temporalSaving = signal(false);
  temporalError = signal<string | null>(null);
  temporalForm: AprobarClienteTemporalRequest = this.emptyTemporalForm();

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private realtimeSub?: Subscription;
  private targetTemporalId: string | null = null;

  formatMoney(amount: number): string {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  pages = () => {
    const tp = this.totalPages();
    const cp = this.page();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, cp - delta); i <= Math.min(tp - 1, cp + delta); i++) {
      range.push(i);
    }
    const pages = [1];
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < tp - 1) pages.push(-1);
    if (tp > 1) pages.push(tp);
    return pages;
  };

  constructor() {
    this.targetTemporalId = this.route.snapshot.queryParamMap.get('clienteTemporalId');
    this.realtimeSub = this.realtime.notificacion$.subscribe(event => {
      if (event.tipo === 'cliente_temporal_creado') this.loadTemporales();
    });
    this.loadClientes();
    this.loadTemporales();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.realtimeSub?.unsubscribe();
  }

  loadClientes(): void {
    this.loading.set(true);
    this.service
      .getList({
        search: this.search() || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.clientes.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadTemporales(): void {
    this.service.getTemporales().subscribe({
      next: items => {
        this.temporales.set(items);
        if (this.targetTemporalId) {
          const target = items.find(item => item.id === this.targetTemporalId);
          if (target) {
            this.openTemporal(target);
            this.targetTemporalId = null;
          }
        }
      },
      error: () => this.temporales.set([]),
    });
  }

  openTemporal(temporal: ClienteTemporalDto): void {
    this.temporalError.set(null);
    this.temporalForm = {
      clienteExistenteId: null,
      apodo: temporal.nombrePropuesto,
      nombreCompleto: temporal.nombrePropuesto,
      rfc: null,
      telefono: null,
      email: null,
      procedencia: null,
      direccion: null,
      notas: null,
    };
    this.temporalEnRevision.set(temporal);
  }

  closeTemporal(): void {
    if (this.temporalSaving()) return;
    this.temporalEnRevision.set(null);
    this.temporalError.set(null);
  }

  aprobarTemporal(): void {
    const temporal = this.temporalEnRevision();
    if (!temporal || !this.temporalForm.apodo.trim()) return;

    this.temporalSaving.set(true);
    this.temporalError.set(null);
    this.service.aprobarTemporal(temporal.id, {
      ...this.temporalForm,
      apodo: this.temporalForm.apodo.trim(),
    }).subscribe({
      next: () => {
        this.temporalSaving.set(false);
        this.temporales.update(items => items.filter(item => item.id !== temporal.id));
        this.temporalEnRevision.set(null);
        this.loadClientes();
      },
      error: err => {
        this.temporalSaving.set(false);
        this.temporalError.set(err?.error?.message || 'No se pudo aprobar el cliente temporal.');
      },
    });
  }

  rechazarTemporal(): void {
    const temporal = this.temporalEnRevision();
    if (!temporal || !window.confirm('¿Rechazar este cliente capturado en campo?')) return;

    this.temporalSaving.set(true);
    this.temporalError.set(null);
    this.service.rechazarTemporal(temporal.id, 'No validado por administración').subscribe({
      next: () => {
        this.temporalSaving.set(false);
        this.temporales.update(items => items.filter(item => item.id !== temporal.id));
        this.temporalEnRevision.set(null);
      },
      error: err => {
        this.temporalSaving.set(false);
        this.temporalError.set(err?.error?.message || 'No se pudo rechazar el cliente temporal.');
      },
    });
  }

  private emptyTemporalForm(): AprobarClienteTemporalRequest {
    return {
      clienteExistenteId: null,
      apodo: '',
      nombreCompleto: null,
      rfc: null,
      telefono: null,
      email: null,
      procedencia: null,
      direccion: null,
      notas: null,
    };
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.loadClientes();
    }, 350);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadClientes();
  }
}
