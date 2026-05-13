import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import { GastoHormigaListDto, GastoHormigaResumenDto, GastoHormigaService, TipoGastoDto } from '../../services/gasto-hormiga.service';
import { VehiculoListDto, VehiculoService } from '../../services/vehiculo.service';

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
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      @if (showModal) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh]" (click)="showModal = false">
          <form class="bg-white rounded-2xl p-6 w-[560px] shadow-xl" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <h3 class="text-[16px] font-semibold mb-4">Nuevo gasto</h3>
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="form.fechaGasto" name="fechaGasto" type="date" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
              <select [(ngModel)]="form.tipoGastoId" name="tipoGastoId" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option value="">Tipo de gasto</option>
                @for (t of tipos; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
              </select>
              <select [(ngModel)]="form.clienteId" name="clienteId" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option [ngValue]="null">Sin cliente</option>
                @for (c of clientes; track c.id) { <option [value]="c.id">{{ c.apodo }}</option> }
              </select>
              <select [(ngModel)]="form.vehiculoId" name="vehiculoId" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option [ngValue]="null">Sin vehículo</option>
                @for (v of vehiculos; track v.id) { <option [value]="v.id">{{ v.vinCorto || v.vin }}</option> }
              </select>
              <input [(ngModel)]="form.monto" name="monto" type="number" min="0.01" step="0.01" placeholder="Monto" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
              <select [(ngModel)]="form.moneda" name="moneda" class="px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input [(ngModel)]="form.concepto" name="concepto" placeholder="Concepto" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mt-2">
            <label class="flex items-center gap-2 text-[13px] mt-3"><input [(ngModel)]="form.seCargaAlCliente" name="seCargaAlCliente" type="checkbox"> Se carga al cliente</label>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" (click)="showModal = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Guardar</button>
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

  gastos: GastoHormigaListDto[] = [];
  tipos: TipoGastoDto[] = [];
  clientes: ClienteListDto[] = [];
  vehiculos: VehiculoListDto[] = [];
  resumen: GastoHormigaResumenDto = { totalPeriodo: 0, totalCargableCliente: 0, totalCostoPropio: 0, porCategoria: [], porCliente: [], porTramitador: [] };
  filters = { fechaDesde: '', fechaHasta: '', tipoGastoId: '' };
  showModal = false;
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
    this.form = this.emptyForm();
    this.showModal = true;
  }

  save(): void {
    if (!this.form.tipoGastoId || !this.form.concepto || this.form.monto <= 0) return;
    this.gastoService.create(this.form).subscribe(() => {
      this.showModal = false;
      this.load();
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }

  private emptyForm() {
    return {
      tramiteId: null,
      clienteId: null,
      vehiculoId: null,
      tipoGastoId: '',
      concepto: '',
      monto: 0,
      moneda: 'MXN',
      gastoUsd: null,
      comprobanteUrl: null,
      seCargaAlCliente: false,
      fechaGasto: new Date().toISOString().slice(0, 10),
    };
  }
}
