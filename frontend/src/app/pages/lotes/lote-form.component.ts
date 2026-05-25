import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AduanaDto, AduanaService } from '../../services/aduana.service';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import {
  CreateLoteRequest,
  LoteImportacionService,
  LoteVehiculoItemRequest,
} from '../../services/lote-importacion.service';
import { TramitadorDto, TramitadorService } from '../../services/tramitador.service';

interface LoteVehiculoRow {
  vin: string;
  marcaTexto: string;
  modelo: string;
  anno: number | null;
  categoria: string;
  color: string;
  valorFactura: number | null;
  descripcionMercancia: string;
  cobroTotal: number;
  honorarios: number;
  tipoTramite: string;
  notas: string;
}

@Component({
  selector: 'app-lote-form',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
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

      <div class="mb-6">
        <p class="mb-1 text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE]">Nuevo lote</p>
        <h1 class="text-[26px] font-semibold tracking-[-0.6px] text-[#0D1017]">
          Alta masiva de vehiculos
        </h1>
      </div>

      @if (error()) {
        <div class="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
          {{ error() }}
        </div>
      }

      <form (ngSubmit)="submit()" class="space-y-5">
        <section class="card-elevated rounded-2xl p-5">
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Datos generales</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Cliente
              <select
                [(ngModel)]="clienteId"
                name="clienteId"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
                required
              >
                <option value="">Seleccionar cliente</option>
                @for (cliente of clientes(); track cliente.id) {
                  <option [value]="cliente.id">{{ cliente.apodo }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Aduana
              <select
                [(ngModel)]="aduanaId"
                name="aduanaId"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
              >
                <option value="">Sin aduana</option>
                @for (aduana of aduanas(); track aduana.id) {
                  <option [value]="aduana.id">{{ aduana.claveAduana }} - {{ aduana.nombre }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Tramitador
              <select
                [(ngModel)]="tramitadorId"
                name="tramitadorId"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
              >
                <option value="">Sin tramitador</option>
                @for (tramitador of tramitadores(); track tramitador.id) {
                  <option [value]="tramitador.id">{{ tramitador.nombre }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Tipo
              <select
                [(ngModel)]="tipoTramite"
                name="tipoTramite"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
              >
                <option value="NORMAL">Normal</option>
                <option value="EXPRESS">Express</option>
                <option value="ASESORIA_LOGISTICA">Asesoria logistica</option>
              </select>
            </label>
          </div>
          <label class="mt-4 flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
            Notas del lote
            <textarea
              [(ngModel)]="notas"
              name="notas"
              rows="2"
              class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
            ></textarea>
          </label>
        </section>

        <section class="card-elevated overflow-hidden rounded-2xl">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] px-5 py-4">
            <div>
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Vehiculos</h2>
              <p class="text-[12px] text-[#6B717F]">
                Captura una fila por unidad. El sistema creara un tramite por vehiculo.
              </p>
            </div>
            <button
              type="button"
              (click)="addRow()"
              class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[12.5px] font-medium text-[#4B5162]"
            >
              Agregar fila
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[1160px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">
                  <th class="px-3 py-3 text-left">VIN</th>
                  <th class="px-3 py-3 text-left">Marca</th>
                  <th class="px-3 py-3 text-left">Modelo</th>
                  <th class="px-3 py-3 text-left">Año</th>
                  <th class="px-3 py-3 text-left">Categoria</th>
                  <th class="px-3 py-3 text-right">Cobro</th>
                  <th class="px-3 py-3 text-right">Honorarios</th>
                  <th class="px-3 py-3 text-left">Notas</th>
                  <th class="px-3 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track $index; let i = $index) {
                  <tr class="border-b border-[#F3F4F6]">
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.vin" [name]="'vin' + i" class="cell-input font-mono-data" required />
                    </td>
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.marcaTexto" [name]="'marca' + i" class="cell-input" />
                    </td>
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.modelo" [name]="'modelo' + i" class="cell-input" />
                    </td>
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.anno" [name]="'anno' + i" type="number" class="cell-input w-[84px] font-mono-data" />
                    </td>
                    <td class="px-3 py-2">
                      <select [(ngModel)]="row.categoria" [name]="'categoria' + i" class="cell-input">
                        <option value="">N/D</option>
                        <option value="AUTOMOVIL">Automovil</option>
                        <option value="CAMIONETA">Camioneta</option>
                        <option value="CAMION">Camion</option>
                        <option value="MOTO">Moto</option>
                        <option value="TRACTOR">Tractor</option>
                      </select>
                    </td>
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.cobroTotal" [name]="'cobro' + i" type="number" min="0" step="0.01" class="cell-input w-[120px] text-right font-mono-data" />
                    </td>
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.honorarios" [name]="'honorarios' + i" type="number" min="0" step="0.01" class="cell-input w-[120px] text-right font-mono-data" />
                    </td>
                    <td class="px-3 py-2">
                      <input [(ngModel)]="row.notas" [name]="'notas' + i" class="cell-input" />
                    </td>
                    <td class="px-3 py-2 text-right">
                      <button
                        type="button"
                        (click)="removeRow(i)"
                        [disabled]="rows().length === 1"
                        class="rounded-lg px-2 py-1 text-[12px] font-medium text-[#991B1B] disabled:opacity-30"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E7EC] px-5 py-4">
            <div class="text-[13px] text-[#6B717F]">
              {{ rows().length }} vehiculos / total
              <span class="font-mono-data font-semibold text-[#0D1017]">{{ totalLote() | currency: 'MXN' }}</span>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                (click)="router.navigate(['/lotes'])"
                class="rounded-xl border border-[#E4E7EC] px-4 py-2 text-[13px] font-medium text-[#4B5162]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="btn-primary rounded-xl px-4 py-2 text-[13px] disabled:opacity-40"
              >
                {{ saving() ? 'Creando...' : 'Crear lote y tramites' }}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  `,
  styles: [
    `
      .cell-input {
        width: 100%;
        border: 1px solid #e4e7ec;
        border-radius: 10px;
        background: #f9fafb;
        padding: 8px 10px;
        font-size: 13px;
        color: #0d1017;
        outline: none;
      }

      .cell-input:focus {
        border-color: #c61d26;
        background: #fff;
      }
    `,
  ],
})
export class LoteFormComponent {
  private loteService = inject(LoteImportacionService);
  private clienteService = inject(ClienteService);
  private aduanaService = inject(AduanaService);
  private tramitadorService = inject(TramitadorService);
  router = inject(Router);

  clientes = signal<ClienteListDto[]>([]);
  aduanas = signal<AduanaDto[]>([]);
  tramitadores = signal<TramitadorDto[]>([]);
  rows = signal<LoteVehiculoRow[]>([this.emptyRow()]);
  saving = signal(false);
  error = signal<string | null>(null);

  clienteId = '';
  aduanaId = '';
  tramitadorId = '';
  tipoTramite = 'NORMAL';
  notas = '';

  constructor() {
    this.clienteService.getList({ pageSize: 500 }).subscribe(res => this.clientes.set(res.items));
    this.aduanaService.getAll().subscribe(res => this.aduanas.set(res));
    this.tramitadorService.getAll(true).subscribe(res => this.tramitadores.set(res));
  }

  addRow(): void {
    this.rows.update(rows => [...rows, this.emptyRow()]);
  }

  removeRow(index: number): void {
    if (this.rows().length === 1) return;
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  totalLote(): number {
    return this.rows().reduce((sum, row) => sum + Number(row.cobroTotal || 0), 0);
  }

  submit(): void {
    this.error.set(null);
    if (!this.clienteId) {
      this.error.set('Selecciona un cliente.');
      return;
    }

    const vehiculos = this.rows().map(row => this.mapRow(row));
    const invalid = vehiculos.find(v => !v.vin || v.cobroTotal < 0 || v.honorarios < 0);
    if (invalid) {
      this.error.set('Cada vehiculo debe tener VIN y montos validos.');
      return;
    }

    const request: CreateLoteRequest = {
      clienteId: this.clienteId,
      aduanaId: this.aduanaId || null,
      tramitadorId: this.tramitadorId || null,
      tipoTramite: this.tipoTramite,
      notas: this.notas || null,
      vehiculos,
    };

    this.saving.set(true);
    this.loteService.create(request).subscribe({
      next: lote => {
        this.saving.set(false);
        this.router.navigate(['/lotes', lote.id]);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'No se pudo crear el lote.');
      },
    });
  }

  private mapRow(row: LoteVehiculoRow): LoteVehiculoItemRequest {
    return {
      vin: row.vin.trim().toUpperCase(),
      marcaTexto: row.marcaTexto || null,
      modelo: row.modelo || null,
      anno: row.anno,
      categoria: row.categoria || null,
      color: row.color || null,
      valorFactura: row.valorFactura,
      moneda: 'USD',
      descripcionMercancia:
        row.descripcionMercancia ||
        [row.marcaTexto, row.modelo, row.anno?.toString()].filter(Boolean).join(' ') ||
        null,
      cobroTotal: Number(row.cobroTotal || 0),
      honorarios: Number(row.honorarios || 0),
      tipoTramite: row.tipoTramite || this.tipoTramite,
      notas: row.notas || null,
    };
  }

  private emptyRow(): LoteVehiculoRow {
    return {
      vin: '',
      marcaTexto: '',
      modelo: '',
      anno: null,
      categoria: '',
      color: '',
      valorFactura: null,
      descripcionMercancia: '',
      cobroTotal: 0,
      honorarios: 0,
      tipoTramite: '',
      notas: '',
    };
  }
}
