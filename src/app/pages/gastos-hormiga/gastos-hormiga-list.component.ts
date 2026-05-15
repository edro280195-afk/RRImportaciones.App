import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import { GastoHormigaListDto, GastoHormigaResumenDto, GastoHormigaService, TipoGastoDto } from '../../services/gasto-hormiga.service';
import { VehiculoListDto, VehiculoService } from '../../services/vehiculo.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-gastos-hormiga-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE] mb-1">Finanzas</p>
          <h1 class="text-[26px] font-semibold text-[#0D1017] tracking-[-0.6px]">Gastos hormiga</h1>
        </div>
        <button (click)="openCreate()" class="px-4 py-2 rounded-xl bg-[#0D1017] text-white text-[13px] font-medium">Nuevo gasto</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        <aside class="card-elevated rounded-2xl p-4 h-fit">
          <p class="text-[12px] font-semibold text-[#0D1017] mb-3">Filtros</p>
          <input [(ngModel)]="filters.fechaDesde" type="date" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mb-2" (change)="load()">
          <input [(ngModel)]="filters.fechaHasta" type="date" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mb-2" (change)="load()">
          <select [(ngModel)]="filters.tipoGastoId" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]" (change)="load()">
            <option value="">Todos los tipos</option>
            @for (t of tipos; track t.id) {
              <option [value]="t.id">{{ t.nombre }}</option>
            }
          </select>
        </aside>

        <section>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Periodo</p><p class="text-[20px] font-semibold">{{ resumen.totalPeriodo | currency:'MXN' }}</p></div>
            <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Cargable</p><p class="text-[20px] font-semibold">{{ resumen.totalCargableCliente | currency:'MXN' }}</p></div>
            <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Costo propio</p><p class="text-[20px] font-semibold">{{ resumen.totalCostoPropio | currency:'MXN' }}</p></div>
          </div>

          <div class="card-elevated rounded-2xl overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                  <th class="px-4 py-3 text-left">Fecha</th>
                  <th class="px-4 py-3 text-left">Cliente</th>
                  <th class="px-4 py-3 text-left">Vehículo</th>
                  <th class="px-4 py-3 text-left">Tipo</th>
                  <th class="px-4 py-3 text-left">Concepto</th>
                  <th class="px-4 py-3 text-right">Monto</th>
                  <th class="px-4 py-3 text-left">Cargable</th>
                  <th class="px-4 py-3 text-left">Comprobante</th>
                  <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (g of gastos; track g.id) {
                  <tr class="border-b border-[#F3F4F6] text-[13px]">
                    <td class="px-4 py-3 text-[#6B717F]">{{ g.fechaGasto | date:'dd/MM/yyyy' }}</td>
                    <td class="px-4 py-3">{{ g.clienteNombre || 'Sin cliente' }}</td>
                    <td class="px-4 py-3 font-mono-data">{{ g.vehiculoVin || '—' }}</td>
                    <td class="px-4 py-3">{{ g.tipoGasto }}</td>
                    <td class="px-4 py-3">{{ g.concepto }}</td>
                    <td class="px-4 py-3 text-right font-mono-data">{{ g.monto | currency:g.moneda }}</td>
                    <td class="px-4 py-3">{{ g.seCargaAlCliente ? 'Sí' : 'No' }}</td>
                    <td class="px-4 py-3">
                      @if (g.comprobanteUrl) { <a [href]="fileUrl(g.comprobanteUrl)" target="_blank" class="text-[#C61D26] font-medium">Ver</a> }
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-3">
                        <button (click)="openEdit(g)" class="text-[12px] font-medium text-[#4B5162]">Editar</button>
                        <button (click)="deleteGasto(g)" class="text-[12px] font-medium text-[#991B1B]">Borrar</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      @if (showModal) {
        <div class="fixed inset-0 bg-black/35 z-50 flex items-start justify-center px-4 pt-[7vh]" (click)="showModal = false">
          <form class="bg-white rounded-2xl p-6 w-[min(680px,100%)] shadow-2xl" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between gap-4 mb-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#C61D26]">Gasto operativo</p>
                <h3 class="text-[18px] font-semibold text-[#0D1017] mt-1">{{ editingGasto ? 'Editar gasto hormiga' : 'Nuevo gasto hormiga' }}</h3>
                <p class="text-[12px] text-[#6B717F] mt-1">{{ editingGasto ? 'Los cambios quedaran visibles en auditoria.' : 'Captura el costo, relacionalo y define si se recupera.' }}</p>
              </div>
              <button type="button" (click)="showModal = false" class="h-9 w-9 rounded-xl border border-[#E4E7EC] text-[#6B717F] hover:text-[#0D1017]">x</button>
            </div>
            <div class="rounded-2xl border border-[#EEF0F4] bg-[#F9FAFB] p-4 mb-4">
              <p class="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#9EA3AE]">Importe capturado</p>
              <div class="flex flex-wrap items-end justify-between gap-2 mt-1">
                <p class="text-[28px] font-semibold text-[#0D1017] font-mono-data">{{ form.monto || 0 | currency:form.moneda }}</p>
                <span class="px-3 py-1 rounded-full text-[11px] font-semibold" [class.bg-[#DCFCE7]]="form.seCargaAlCliente" [class.text-[#166534]]="form.seCargaAlCliente" [class.bg-[#FEE2E2]]="!form.seCargaAlCliente" [class.text-[#991B1B]]="!form.seCargaAlCliente">
                  {{ form.seCargaAlCliente ? 'Cargable al cliente' : 'Costo propio' }}
                </span>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                Fecha
                <input [(ngModel)]="form.fechaGasto" name="fechaGasto" type="date" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]">
              </label>
              <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                Tipo de gasto
                <select [(ngModel)]="form.tipoGastoId" name="tipoGastoId" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]">
                  <option value="">Selecciona tipo</option>
                  @for (t of tipos; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
                </select>
              </label>
              <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                Cliente
                <select [(ngModel)]="form.clienteId" name="clienteId" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]">
                  <option [ngValue]="null">Sin cliente</option>
                  @for (c of clientes; track c.id) { <option [value]="c.id">{{ c.apodo }}</option> }
                </select>
              </label>
              <select [(ngModel)]="form.vehiculoId" name="vehiculoId" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option [ngValue]="null">Sin vehículo</option>
                @for (v of vehiculos; track v.id) { <option [value]="v.id">{{ v.vinCorto || v.vin }}</option> }
              </select>
              <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                Monto
                <input [(ngModel)]="form.monto" name="monto" type="number" min="0.01" step="0.01" placeholder="0.00" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017] font-mono-data">
              </label>
              <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
                Moneda
                <select [(ngModel)]="form.moneda" name="moneda" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]">
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162] mt-3">
              Concepto
              <input [(ngModel)]="form.concepto" name="concepto" placeholder="Ej. caseta, copia, estacionamiento" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] font-normal text-[#0D1017]">
            </label>
            <label class="mt-4 flex items-center justify-between rounded-2xl border border-[#E4E7EC] px-4 py-3 text-[13px] text-[#4B5162]">
              <span>Se carga al cliente</span>
              <input [(ngModel)]="form.seCargaAlCliente" name="seCargaAlCliente" type="checkbox" class="h-4 w-4 accent-[#C61D26]">
            </label>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" (click)="showModal = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">{{ editingGasto ? 'Guardar cambios' : 'Guardar gasto' }}</button>
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
  private vehiculoService = inject(VehiculoService);
  private notifications = inject(NotificationService);

  gastos: GastoHormigaListDto[] = [];
  tipos: TipoGastoDto[] = [];
  clientes: ClienteListDto[] = [];
  vehiculos: VehiculoListDto[] = [];
  resumen: GastoHormigaResumenDto = { totalPeriodo: 0, totalCargableCliente: 0, totalCostoPropio: 0, porCategoria: [], porCliente: [], porTramitador: [] };
  filters = { fechaDesde: '', fechaHasta: '', tipoGastoId: '' };
  showModal = false;
  editingGasto: GastoHormigaListDto | null = null;
  form = this.emptyForm();

  ngOnInit(): void {
    this.gastoService.getTiposGasto().subscribe(t => this.tipos = t);
    this.clienteService.getList({ pageSize: 100 }).subscribe(r => this.clientes = r.items);
    this.vehiculoService.getList({ pageSize: 100 }).subscribe(r => this.vehiculos = r.items);
    this.load();
  }

  load(): void {
    this.gastoService.getList({
      fechaDesde: this.filters.fechaDesde || undefined,
      fechaHasta: this.filters.fechaHasta || undefined,
      tipoGastoId: this.filters.tipoGastoId || undefined,
      pageSize: 100,
    }).subscribe(r => this.gastos = r.items);
    this.gastoService.getResumen(this.filters.fechaDesde || undefined, this.filters.fechaHasta || undefined).subscribe(r => this.resumen = r);
  }

  openCreate(): void {
    this.editingGasto = null;
    this.form = this.emptyForm();
    this.showModal = true;
  }

  openEdit(gasto: GastoHormigaListDto): void {
    this.editingGasto = gasto;
    this.form = {
      tramiteId: gasto.tramiteId,
      clienteId: gasto.clienteId,
      vehiculoId: gasto.vehiculoId,
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

  save(): void {
    if (!this.form.tipoGastoId || !this.form.concepto || this.form.monto <= 0) {
      this.notifications.warning('Tipo, concepto y monto son obligatorios.');
      return;
    }

    const isEditing = !!this.editingGasto;
    const request = this.editingGasto
      ? this.gastoService.update(this.editingGasto.id, this.form)
      : this.gastoService.create(this.form);

    request.subscribe({
      next: () => {
        this.showModal = false;
        this.editingGasto = null;
        this.notifications.success(isEditing ? 'Gasto actualizado correctamente.' : 'Gasto registrado correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo guardar el gasto'),
    });
  }

  async deleteGasto(gasto: GastoHormigaListDto): Promise<void> {
    const confirmed = await this.notifications.confirm({
      title: 'Borrar gasto hormiga',
      message: 'Se ocultara de reportes operativos. La bitacora administrativa conservara el movimiento.',
      detail: `${gasto.concepto} | ${gasto.monto.toLocaleString('es-MX', { style: 'currency', currency: gasto.moneda })}`,
      confirmText: 'Borrar gasto',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    this.gastoService.delete(gasto.id).subscribe({
      next: () => {
        this.notifications.success('Gasto borrado correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo borrar el gasto'),
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }

  private emptyForm() {
    return {
      tramiteId: null as string | null,
      clienteId: null as string | null,
      vehiculoId: null as string | null,
      tipoGastoId: '',
      concepto: '',
      monto: 0,
      moneda: 'MXN',
      gastoUsd: null as number | null,
      comprobanteUrl: null as string | null,
      seCargaAlCliente: false,
      fechaGasto: new Date().toISOString().slice(0, 10),
    };
  }
}
