import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import {
  GastoHormigaListDto,
  GastoHormigaResumenDto,
  GastoHormigaService,
  TipoGastoDto,
} from '../../services/gasto-hormiga.service';
import { TramiteListDto, TramiteService } from '../../services/tramite.service';
import { VehiculoListDto, VehiculoService } from '../../services/vehiculo.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';

type GastoScope = 'tramite' | 'general';

@Component({
  selector: 'app-gastos-hormiga-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE] mb-1">
            Finanzas
          </p>
          <h1 class="text-[26px] font-semibold text-[#0D1017] tracking-[-0.6px]">Gastos operativos</h1>
        </div>
        <button
          (click)="openCreate()"
          class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Registrar gasto
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div class="card-elevated rounded-xl p-4">
          <p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Periodo</p>
          <p class="text-[20px] font-semibold">{{ resumen.totalPeriodo | currency: 'MXN' }}</p>
        </div>
        <div class="card-elevated rounded-xl p-4">
          <p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Cargables</p>
          <p class="text-[20px] font-semibold text-[#D97706]">
            {{ resumen.totalCargableCliente | currency: 'MXN' }}
          </p>
        </div>
        <div class="card-elevated rounded-xl p-4">
          <p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Costo propio</p>
          <p class="text-[20px] font-semibold text-[#16A34A]">
            {{ resumen.totalCostoPropio | currency: 'MXN' }}
          </p>
        </div>
      </div>

      <div class="card-elevated rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[700px]">
            <thead>
              <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                <th class="px-4 py-3 text-left">Fecha</th>
                <th class="px-4 py-3 text-left">Trámite</th>
                <th class="px-4 py-3 text-left">Concepto</th>
                <th class="px-4 py-3 text-right">Monto</th>
                <th class="px-4 py-3 text-left">Destino</th>
                <th class="px-4 py-3 text-left">Comprobante</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (g of gastos; track g.id) {
                <tr class="border-b border-[#F3F4F6] text-[13px] hover:bg-[#FAFBFC] transition-colors">
                  <td class="px-4 py-3 text-[#6B717F] font-mono-data">
                    {{ g.fechaGasto | date: 'dd/MM/yyyy' }}
                  </td>
                  <td class="px-4 py-3">
                    @if (g.numeroConsecutivo) {
                      <span class="font-mono-data font-semibold text-[#0D1017]">#{{ g.numeroConsecutivo }}</span>
                      @if (g.clienteNombre) {
                        <span class="text-[#6B717F] ml-1">· {{ g.clienteNombre }}</span>
                      }
                    } @else {
                      <span class="text-[#9EA3AE] text-[12px] font-medium px-2 py-0.5 rounded bg-[#F3F4F6]">Gasto general</span>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F3F4F6] text-[#4B5162]">{{ g.tipoGasto }}</span>
                      <span>{{ g.concepto }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-mono-data">
                    {{ g.monto | currency: g.moneda }}
                  </td>
                  <td class="px-4 py-3">
                    @if (g.seCargaAlCliente) {
                      <span class="badge badge-pendiente">Cargable</span>
                    } @else {
                      <span class="badge badge-neutral">Propio</span>
                    }
                  </td>
                  <td class="px-4 py-3">
                    @if (g.comprobanteUrl) {
                      <a
                        [href]="fileUrl(g.comprobanteUrl)"
                        target="_blank"
                        class="text-[12px] font-medium text-[#C61D26] hover:underline"
                        >Ver comprobante</a
                      >
                    } @else {
                      <span class="text-[#9EA3AE] text-[11px]">—</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-3">
                      <button
                        (click)="openEdit(g)"
                        class="text-[12px] font-medium text-[#4B5162] hover:text-[#0D1017]"
                      >
                        Editar
                      </button>
                      <button
                        (click)="deleteGasto(g)"
                        class="text-[12px] font-medium text-[#991B1B] hover:text-[#7F1D1D]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (showModal) {
        <div
          class="fixed inset-0 bg-black/45 z-50 flex items-start justify-center px-4 pt-[5vh] overflow-y-auto"
          (click)="showModal = false"
        >
          <form
            class="bg-white rounded-2xl p-6 w-full max-w-[560px] shadow-2xl my-auto"
            (click)="$event.stopPropagation()"
            (ngSubmit)="save()"
          >
            <div class="flex items-start justify-between gap-4 mb-5">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#C61D26]">
                  {{ editingGasto ? 'Editar' : 'Nuevo' }}
                </p>
                <h3 class="text-[18px] font-semibold text-[#0D1017] mt-1">
                  Gasto operativo
                </h3>
              </div>
              <button
                type="button"
                (click)="showModal = false"
                class="h-9 w-9 rounded-xl border border-[#E4E7EC] text-[#6B717F] hover:text-[#0D1017] hover:border-[#9EA3AE] transition-colors flex items-center justify-center"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-[1fr_auto] gap-3 mb-4">
              <div class="rounded-2xl border border-[#EEF0F4] bg-[#F9FAFB] p-4">
                <p class="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#9EA3AE] mb-1">
                  Importe
                </p>
                <div class="flex items-baseline gap-2">
                  <span class="text-[32px] font-semibold text-[#0D1017] font-mono-data">
                    {{ form.monto || 0 | currency: form.moneda }}
                  </span>
                </div>
              </div>
              <div class="rounded-2xl border border-[#EEF0F4] bg-[#F9FAFB] p-4 flex flex-col justify-between">
                <p class="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#9EA3AE] mb-1">
                  Moneda
                </p>
                <select
                  [(ngModel)]="form.moneda"
                  name="moneda"
                  class="bg-transparent border-0 p-0 text-[15px] font-semibold text-[#0D1017] outline-none"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 mb-4">
              <div class="grid grid-cols-2 gap-3">
                <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                  Fecha
                  <input
                    [(ngModel)]="form.fechaGasto"
                    name="fechaGasto"
                    type="date"
                    class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]"
                  />
                </label>
                <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                  Tipo
                  <select
                    [(ngModel)]="form.tipoGastoId"
                    name="tipoGastoId"
                    class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]"
                  >
                    <option value="">Selecciona</option>
                    @for (t of tipos; track t.id) {
                      <option [value]="t.id">{{ t.nombre }}</option>
                    }
                  </select>
                </label>
              </div>

              <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                Concepto
                <input
                  [(ngModel)]="form.concepto"
                  name="concepto"
                  placeholder="Ej. Caseta de cruce, copia certificada, estacionamiento"
                  class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]"
                />
              </label>

              <div class="space-y-3">
                <p class="text-[12px] font-medium text-[#4B5162]">¿A qué corresponde este gasto?</p>

                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    (click)="form.scope = 'tramite'; form.tramiteId = null"
                    class="px-4 py-3 rounded-xl border-2 text-left transition-all"
                    [class.border-[#C61D26]]="form.scope === 'tramite'"
                    [class.border-[#E4E7EC]]="form.scope !== 'tramite'"
                    [class.bg-[#FFF5F5]]="form.scope === 'tramite'"
                  >
                    <div class="text-[13px] font-semibold text-[#0D1017]">Gasto de trámite</div>
                    <div class="text-[11px] text-[#6B717F] mt-0.5">Asociado a un # de trámite</div>
                  </button>
                  <button
                    type="button"
                    (click)="form.scope = 'general'; form.tramiteId = null"
                    class="px-4 py-3 rounded-xl border-2 text-left transition-all"
                    [class.border-[#0D1017]]="form.scope === 'general'"
                    [class.border-[#E4E7EC]]="form.scope !== 'general'"
                    [class.bg-[#F9FAFB]]="form.scope === 'general'"
                  >
                    <div class="text-[13px] font-semibold text-[#0D1017]">Gasto general</div>
                    <div class="text-[11px] text-[#6B717F] mt-0.5">Costo operativo sin trámite</div>
                  </button>
                </div>

                @if (form.scope === 'tramite') {
                  <div class="space-y-2 mt-3">
                    <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                      Buscar trámite
                      <div class="relative">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-2 text-[#9EA3AE] pointer-events-none">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input
                          [(ngModel)]="tramiteSearch"
                          name="tramiteSearch"
                          (input)="onTramiteSearch()"
                          placeholder="Buscar por #, cliente o vehículo..."
                          class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017] bg-[#F9FAFB] focus:bg-white focus:border-[#C61D26] outline-none transition-colors"
                        />
                      </div>
                    </label>

                    @if (showTramiteDropdown()) {
                      <div class="border border-[#E4E7EC] rounded-xl max-h-[240px] overflow-y-auto bg-white shadow-lg">
                        @if (filteredTramites().length === 0) {
                          <div class="p-4 text-center text-[#6B717F] text-[12px]">
                            No se encontraron trámites
                          </div>
                        }
                        @for (t of filteredTramites(); track t.id) {
                          <button
                            type="button"
                            (click)="selectTramite(t)"
                            class="w-full text-left px-4 py-3 hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
                          >
                            <div class="flex items-center justify-between">
                              <div>
                                <span class="font-mono-data font-semibold text-[#0D1017]">#{{ t.numeroConsecutivo }}</span>
                                <span class="text-[#6B717F] text-[12px] ml-2">{{ t.clienteApodo || 'Sin cliente' }}</span>
                              </div>
                              @if (form.tramiteId === t.id) {
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-[#16A34A]">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                </svg>
                              }
                            </div>
                            @if (t.vehiculoMarcaModelo) {
                              <div class="text-[11px] text-[#9EA3AE] mt-0.5">{{ t.vehiculoMarcaModelo }}</div>
                            }
                          </button>
                        }
                      </div>
                    }

                    @if (selectedTramitePreview()) {
                      <div class="rounded-xl border border-[#C61D26] bg-[#FFF5F5] p-4 mt-3">
                        <div class="flex items-start justify-between">
                          <div>
                            <p class="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#C61D26] mb-1">Trámite seleccionado</p>
                            <p class="font-mono-data font-semibold text-[#0D1017] text-[15px]">#{{ selectedTramitePreview()?.numeroConsecutivo }}</p>
                            @if (selectedTramitePreview()?.clienteApodo) {
                              <p class="text-[12px] text-[#6B717F] mt-0.5">{{ selectedTramitePreview()?.clienteApodo }}</p>
                            }
                            @if (selectedTramitePreview()?.vehiculoMarcaModelo) {
                              <p class="text-[11px] text-[#9EA3AE] mt-0.5">{{ selectedTramitePreview()?.vehiculoMarcaModelo }}</p>
                            }
                          </div>
                          <button
                            type="button"
                            (click)="clearTramite()"
                            class="text-[11px] font-medium text-[#9EA3AE] hover:text-[#4B5162]"
                          >
                            Cambiar
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <label
                class="flex items-center justify-between rounded-xl border border-[#E4E7EC] px-4 py-3 text-[13px] cursor-pointer hover:border-[#C61D26] transition-colors"
              >
                <div>
                  <span class="font-medium text-[#0D1017]">Se le carga al cliente</span>
                  @if (form.scope === 'tramite' && form.tramiteId) {
                    <p class="text-[11px] text-[#9EA3AE]">Este gasto se recupera del cliente del trámite</p>
                  }
                </div>
                <div
                  class="relative w-10 h-6 rounded-full transition-colors"
                  [class.bg-[#C61D26]]="form.seCargaAlCliente"
                  [class.bg-[#D1D5DB]]="!form.seCargaAlCliente"
                >
                  <div
                    class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                    [class.translate-x-5]="form.seCargaAlCliente"
                    [class.translate-x-1]="!form.seCargaAlCliente"
                  ></div>
                </div>
                <input
                  [(ngModel)]="form.seCargaAlCliente"
                  name="seCargaAlCliente"
                  type="checkbox"
                  class="absolute opacity-0 pointer-events-none"
                />
              </label>

              <div class="grid grid-cols-2 gap-3">
                <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                  Monto numérico
                  <input
                    [(ngModel)]="form.monto"
                    name="monto"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017] font-mono-data"
                  />
                </label>
                <div></div>
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-5 pt-4 border-t border-[#F3F4F6]">
              <button
                type="button"
                (click)="showModal = false"
                class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC] text-[#4B5162] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn-primary px-4 py-2 rounded-xl text-[12.5px]"
                [disabled]="!canSave()"
              >
                {{ editingGasto ? 'Guardar cambios' : 'Registrar gasto' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class GastosHormigaListComponent implements OnInit {
  private gastoService = inject(GastoHormigaService);
  private clienteService = inject(ClienteService);
  private tramiteService = inject(TramiteService);
  private notifications = inject(NotificationService);

  gastos: GastoHormigaListDto[] = [];
  tipos: TipoGastoDto[] = [];
  tramites: TramiteListDto[] = [];
  resumen: GastoHormigaResumenDto = {
    totalPeriodo: 0,
    totalCargableCliente: 0,
    totalCostoPropio: 0,
    porCategoria: [],
    porCliente: [],
    porTramitador: [],
  };
  filters = { fechaDesde: '', fechaHasta: '', tipoGastoId: '' };
  showModal = false;
  editingGasto: GastoHormigaListDto | null = null;

  tramiteSearch = '';
  private tramiteSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  private emptyForm() {
    return {
      scope: 'tramite' as GastoScope,
      tramiteId: null as string | null,
      tipoGastoId: '',
      concepto: '',
      monto: 0,
      moneda: 'MXN',
      gastoUsd: null as number | null,
      comprobanteUrl: null as string | null,
      seCargaAlCliente: true,
      fechaGasto: new Date().toISOString().slice(0, 10),
    };
  }

  form = this.emptyForm();

  filteredTramites = computed(() => {
    if (!this.tramiteSearch.trim()) {
      return this.tramites.slice(0, 30);
    }
    const q = this.tramiteSearch.toLowerCase().trim();
    return this.tramites.filter(t => {
      if (t.numeroConsecutivo?.toLowerCase().includes(q)) return true;
      if (t.clienteApodo?.toLowerCase().includes(q)) return true;
      if (t.vehiculoMarcaModelo?.toLowerCase().includes(q)) return true;
      return false;
    }).slice(0, 20);
  });

  selectedTramitePreview = computed(() => {
    if (!this.form.tramiteId) return null;
    return this.tramites.find(t => t.id === this.form.tramiteId) || null;
  });

  showTramiteDropdown = computed(() => {
    return this.form.scope === 'tramite' && !this.form.tramiteId && (this.tramiteSearch.trim() || this.tramites.length > 0);
  });

  ngOnInit(): void {
    this.gastoService.getTiposGasto().subscribe(t => (this.tipos = t));
    this.tramiteService
      .getList({ pageSize: 500, orderBy: 'numero', orderDir: 'desc' })
      .subscribe(r => (this.tramites = r.items));
    this.load();
  }

  load(): void {
    this.gastoService
      .getList({
        fechaDesde: this.filters.fechaDesde || undefined,
        fechaHasta: this.filters.fechaHasta || undefined,
        tipoGastoId: this.filters.tipoGastoId || undefined,
        pageSize: 100,
      })
      .subscribe(r => (this.gastos = r.items));
    this.gastoService
      .getResumen(this.filters.fechaDesde || undefined, this.filters.fechaHasta || undefined)
      .subscribe(r => (this.resumen = r));
  }

  openCreate(): void {
    this.editingGasto = null;
    this.form = this.emptyForm();
    this.tramiteSearch = '';
    this.showModal = true;
  }

  openEdit(gasto: GastoHormigaListDto): void {
    this.editingGasto = gasto;
    this.tramiteSearch = '';
    this.form = {
      scope: gasto.tramiteId ? 'tramite' : 'general',
      tramiteId: gasto.tramiteId,
      tipoGastoId: gasto.tipoGastoId,
      concepto: gasto.concepto,
      monto: gasto.monto,
      moneda: gasto.moneda,
      gastoUsd: null,
      comprobanteUrl: gasto.comprobanteUrl,
      seCargaAlCliente: gasto.seCargaAlCliente,
      fechaGasto: gasto.fechaGasto.slice(0, 10),
    };
    this.showModal = true;
  }

  onTramiteSearch(): void {
    if (this.tramiteSearchTimeout) clearTimeout(this.tramiteSearchTimeout);
    this.tramiteSearchTimeout = setTimeout(() => {}, 200);
  }

  selectTramite(t: TramiteListDto): void {
    this.form.tramiteId = t.id;
    this.tramiteSearch = '';
  }

  clearTramite(): void {
    this.form.tramiteId = null;
    this.tramiteSearch = '';
  }

  canSave(): boolean {
    if (!this.form.tipoGastoId) return false;
    if (!this.form.concepto.trim()) return false;
    if (this.form.monto <= 0) return false;
    if (this.form.scope === 'tramite' && !this.form.tramiteId) return false;
    return true;
  }

  save(): void {
    if (!this.canSave()) return;

    const request = {
      tramiteId: this.form.tramiteId ? this.form.tramiteId : null,
      clienteId: null,
      vehiculoId: null,
      tipoGastoId: this.form.tipoGastoId,
      concepto: this.form.concepto,
      monto: this.form.monto,
      moneda: this.form.moneda,
      gastoUsd: this.form.gastoUsd,
      comprobanteUrl: this.form.comprobanteUrl,
      seCargaAlCliente: this.form.seCargaAlCliente,
      fechaGasto: this.form.fechaGasto,
    };

    const isEditing = !!this.editingGasto;
    const req = this.editingGasto
      ? this.gastoService.update(this.editingGasto.id, request)
      : this.gastoService.create(request);

    req.subscribe({
      next: () => {
        this.showModal = false;
        this.editingGasto = null;
        this.notifications.success(
          isEditing ? 'Gasto actualizado correctamente.' : 'Gasto registrado correctamente.'
        );
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo guardar el gasto'),
    });
  }

  async deleteGasto(gasto: GastoHormigaListDto): Promise<void> {
    const confirmed = await this.notifications.confirm({
      title: 'Eliminar gasto',
      message: 'Se eliminará de la lista. El movimiento queda registrado en auditoría.',
      detail: `${gasto.concepto} | ${gasto.monto.toLocaleString('es-MX', { style: 'currency', currency: gasto.moneda })}`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    this.gastoService.delete(gasto.id).subscribe({
      next: () => {
        this.notifications.success('Gasto eliminado correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo eliminar el gasto'),
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }
}
