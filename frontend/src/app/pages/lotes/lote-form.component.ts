import { CurrencyPipe, DecimalPipe } from '@angular/common';
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
import { CotizacionService, CotizacionInput } from '../../services/cotizacion.service';

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
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
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
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Datos generales del lote</h2>
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
              rows="1"
              class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
            ></textarea>
          </label>
        </section>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <!-- Panel Izquierdo: Cotizador Auto -->
          <section class="card-elevated flex flex-col rounded-2xl bg-white">
            <div class="border-b border-[#E4E7EC] px-5 py-4">
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Agregar vehiculo</h2>
              <p class="text-[12px] text-[#6B717F]">Ingresa el VIN y calcula los montos automaticamente.</p>
            </div>
            <div class="flex-1 p-5">
              <div class="mb-4">
                <label class="mb-1 block text-[12px] font-medium text-[#4B5162]">VIN del vehiculo</label>
                <div class="relative">
                  <input
                    [(ngModel)]="currentVin"
                    name="currentVin"
                    (input)="onVinInput()"
                    maxlength="17"
                    placeholder="17 caracteres"
                    class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-mono font-medium outline-none transition-colors focus:border-[#C61D26] focus:bg-white"
                  />
                  <div
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium"
                    [class.text-[#16A34A]]="currentVin().length === 17"
                    [class.text-[#9EA3AE]]="currentVin().length !== 17"
                  >
                    {{ currentVin().length }}/17
                  </div>
                </div>
                @if (decodingVin()) {
                  <p class="mt-1 text-[11px] text-[#D97706]">Decodificando VIN en NHTSA...</p>
                } @else if (vinDecoded() && currentMarca()) {
                  <p class="mt-1 text-[11px] text-[#16A34A]">{{ currentMarca() }} {{ currentModelo() }} {{ currentAnno() }}</p>
                }
              </div>

              <div class="mb-4 grid grid-cols-2 gap-3">
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Marca
                  <input [(ngModel)]="currentMarca" name="currentMarca" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]" />
                </label>
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Modelo
                  <input [(ngModel)]="currentModelo" name="currentModelo" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]" />
                </label>
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Año
                  <input [(ngModel)]="currentAnno" type="number" name="currentAnno" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]" />
                </label>
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Categoria
                  <select [(ngModel)]="currentCategoria" name="currentCategoria" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]">
                    <option value="AUTOMOVIL">Automovil</option>
                    <option value="CAMIONETA">Camioneta</option>
                    <option value="PICKUP">Pick up</option>
                    <option value="TRACTOCAMION">Tractocamion</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                (click)="calcularCotizacion()"
                [disabled]="calculando() || !currentVin()"
                class="w-full rounded-xl bg-[#0D1017] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
              >
                {{ calculando() ? 'Calculando...' : 'Calcular montos' }}
              </button>

              @if (calcError()) {
                <p class="mt-2 text-center text-[12px] text-[#991B1B]">{{ calcError() }}</p>
              }

              @if (calcResult()) {
                <div class="mt-4 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                  <div class="mb-3 flex items-center justify-between border-b border-[#E4E7EC] pb-2">
                    <span class="text-[12px] text-[#6B717F]">Aduana e Impuestos</span>
                    <span class="font-mono-data text-[13px] font-semibold">{{ (calcResult()?.total! - calcResult()?.honorarios!) | currency:'MXN' }}</span>
                  </div>
                  <div class="mb-3 flex items-center justify-between border-b border-[#E4E7EC] pb-2">
                    <span class="text-[12px] text-[#6B717F]">Honorarios</span>
                    <span class="font-mono-data text-[13px] font-semibold">{{ calcResult()?.honorarios | currency:'MXN' }}</span>
                  </div>
                  <div class="mb-4 flex items-center justify-between">
                    <span class="text-[13px] font-bold text-[#0D1017]">TOTAL</span>
                    <span class="font-mono-data text-[15px] font-bold text-[#C61D26]">{{ calcResult()?.total | currency:'MXN' }}</span>
                  </div>

                  <button
                    type="button"
                    (click)="addCalculatedRow()"
                    class="w-full rounded-xl bg-[#16A34A] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#15803d]"
                  >
                    Añadir al lote
                  </button>
                </div>
              }
            </div>
          </section>

          <!-- Panel Derecho: Lista de Vehiculos -->
          <section class="card-elevated flex flex-col overflow-hidden rounded-2xl">
            <div class="flex flex-wrap items-center justify-between border-b border-[#E4E7EC] px-5 py-4">
              <div>
                <h2 class="text-[15px] font-semibold text-[#0D1017]">Vehiculos en el lote</h2>
                <p class="text-[12px] text-[#6B717F]">Listado de unidades a procesar</p>
              </div>
              <button
                type="button"
                (click)="addEmptyRow()"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[12.5px] font-medium text-[#4B5162]"
              >
                + Fila manual
              </button>
            </div>

            <div class="flex-1 overflow-x-auto">
              <table class="w-full min-w-[800px]">
                <thead>
                  <tr class="border-b border-[#E4E7EC] text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">
                    <th class="px-3 py-3 text-left">VIN</th>
                    <th class="px-3 py-3 text-left">Vehiculo</th>
                    <th class="px-3 py-3 text-right">Cobro Aduana</th>
                    <th class="px-3 py-3 text-right">Honorarios</th>
                    <th class="px-3 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  @if (rows().length === 0) {
                    <tr>
                      <td colspan="5" class="py-8 text-center text-[13px] text-[#9EA3AE]">No hay vehiculos en el lote.</td>
                    </tr>
                  }
                  @for (row of rows(); track $index; let i = $index) {
                    <tr class="border-b border-[#F3F4F6]">
                      <td class="px-3 py-2">
                        <input [(ngModel)]="row.vin" [name]="'vin' + i" class="cell-input font-mono-data" placeholder="17 caracteres" required />
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex gap-1">
                          <input [(ngModel)]="row.marcaTexto" [name]="'marca' + i" class="cell-input w-1/3" placeholder="Marca" />
                          <input [(ngModel)]="row.modelo" [name]="'modelo' + i" class="cell-input w-1/3" placeholder="Modelo" />
                          <input [(ngModel)]="row.anno" type="number" [name]="'anno' + i" class="cell-input w-1/3" placeholder="Año" />
                        </div>
                      </td>
                      <td class="px-3 py-2">
                        <input [(ngModel)]="row.cobroTotal" [name]="'cobro' + i" type="number" min="0" step="0.01" class="cell-input text-right font-mono-data" />
                      </td>
                      <td class="px-3 py-2">
                        <input [(ngModel)]="row.honorarios" [name]="'honorarios' + i" type="number" min="0" step="0.01" class="cell-input text-right font-mono-data" />
                      </td>
                      <td class="px-3 py-2 text-right">
                        <button
                          type="button"
                          (click)="removeRow(i)"
                          class="rounded-lg px-2 py-1 text-[12px] font-medium text-[#991B1B] hover:bg-[#FEF2F2]"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center justify-between border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4">
              <div class="text-[13px] text-[#6B717F]">
                Total Lote ({{ rows().length }} vehiculos)
                <span class="ml-2 font-mono-data text-[16px] font-bold text-[#0D1017]">{{ totalLote() | currency: 'MXN' }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="saving() || rows().length === 0"
                  class="btn-primary rounded-xl px-5 py-2.5 text-[14px] disabled:opacity-40"
                >
                  {{ saving() ? 'Guardando...' : 'Guardar lote' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .cell-input {
        width: 100%;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
        background: #fff;
        padding: 6px 8px;
        font-size: 12px;
        color: #0d1017;
        outline: none;
      }

      .cell-input:focus {
        border-color: #c61d26;
        box-shadow: 0 0 0 1px #c61d26;
      }
    `,
  ],
})
export class LoteFormComponent {
  private loteService = inject(LoteImportacionService);
  private clienteService = inject(ClienteService);
  private aduanaService = inject(AduanaService);
  private tramitadorService = inject(TramitadorService);
  private cotizacionService = inject(CotizacionService);
  router = inject(Router);

  clientes = signal<ClienteListDto[]>([]);
  aduanas = signal<AduanaDto[]>([]);
  tramitadores = signal<TramitadorDto[]>([]);
  rows = signal<LoteVehiculoRow[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);

  clienteId = '';
  aduanaId = '';
  tramitadorId = '';
  tipoTramite = 'NORMAL';
  notas = '';

  // Panel Izquierdo
  currentVin = signal('');
  currentMarca = signal('');
  currentModelo = signal('');
  currentAnno = signal<number | null>(null);
  currentCategoria = signal('AUTOMOVIL');
  
  decodingVin = signal(false);
  vinDecoded = signal(false);
  calculando = signal(false);
  calcError = signal('');
  calcResult = signal<any>(null);

  private calcTimer: any = null;

  constructor() {
    this.clienteService.getList({ pageSize: 500 }).subscribe(res => this.clientes.set(res.items));
    this.aduanaService.getAll().subscribe(res => this.aduanas.set(res));
    this.tramitadorService.getAll(true).subscribe(res => this.tramitadores.set(res));
  }

  onVinInput(): void {
    const val = this.currentVin().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    this.currentVin.set(val);
    this.vinDecoded.set(false);
    this.calcResult.set(null);

    if (this.calcTimer) clearTimeout(this.calcTimer);

    if (val.length === 17) {
      this.decodingVin.set(true);
      this.calcTimer = setTimeout(() => {
        this.cotizacionService.decodeVin(val).subscribe({
          next: res => {
            this.decodingVin.set(false);
            this.vinDecoded.set(true);
            this.currentMarca.set(res.make || '');
            this.currentModelo.set(res.model || '');
            this.currentAnno.set(res.modelYear || null);
            this.currentCategoria.set(res.vehicleType === 'TRUCK' ? 'CAMIONETA' : 'AUTOMOVIL');
          },
          error: () => {
            this.decodingVin.set(false);
            this.calcError.set('No se pudo decodificar el VIN automáticamente.');
          }
        });
      }, 500);
    }
  }

  calcularCotizacion(): void {
    if (!this.currentVin()) return;
    this.calculando.set(true);
    this.calcError.set('');

    const input: CotizacionInput = {
      vin: this.currentVin(),
      marcaId: null,
      marca: this.currentMarca(),
      modelo: this.currentModelo(),
      anno: this.currentAnno(),
      cilindradaCm3: null,
      tipoVehiculo: this.currentCategoria(),
      valorAduanaUsdOverride: null,
      precioEstimadoIdOverride: null,
      categoriaAmparoOverride: null,
      tcMargen: 0,
      tipoTramite: this.tipoTramite,
      honorariosOverride: null
    };

    this.cotizacionService.calcular(input).subscribe({
      next: res => {
        this.calculando.set(false);
        this.calcResult.set(res);
      },
      error: err => {
        this.calculando.set(false);
        this.calcError.set(err.error?.message || 'Error al calcular montos.');
      }
    });
  }

  addCalculatedRow(): void {
    const res = this.calcResult();
    if (!res) return;

    this.rows.update(rows => [
      ...rows,
      {
        vin: this.currentVin(),
        marcaTexto: this.currentMarca(),
        modelo: this.currentModelo(),
        anno: this.currentAnno(),
        categoria: this.currentCategoria(),
        color: '',
        valorFactura: null,
        descripcionMercancia: '',
        cobroTotal: res.total - res.honorarios,
        honorarios: res.honorarios,
        tipoTramite: this.tipoTramite,
        notas: ''
      }
    ]);

    // Reset
    this.currentVin.set('');
    this.currentMarca.set('');
    this.currentModelo.set('');
    this.currentAnno.set(null);
    this.calcResult.set(null);
    this.vinDecoded.set(false);
  }

  addEmptyRow(): void {
    this.rows.update(rows => [...rows, this.emptyRow()]);
  }

  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  totalLote(): number {
    return this.rows().reduce((sum, row) => sum + Number(row.cobroTotal || 0) + Number(row.honorarios || 0), 0);
  }

  submit(): void {
    this.error.set(null);
    if (!this.clienteId) {
      this.error.set('Selecciona un cliente.');
      return;
    }

    if (this.rows().length === 0) {
      this.error.set('Agrega al menos un vehiculo al lote.');
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
