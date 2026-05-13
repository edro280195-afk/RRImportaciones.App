import { Component, signal, model, output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehiculoService, MarcaDto, CreateVehiculoRequest } from '../../services/vehiculo.service';
import { ClienteService, ClienteListDto } from '../../services/cliente.service';

@Component({
  selector: 'app-vehiculo-form-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (visible()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
        style="background: rgba(13,16,23,0.45); backdrop-filter: blur(4px);"
        (click)="close()"
      >
        <div
          class="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 animate-scaleIn"
          style="background: #FFFFFF; border: 1px solid #E4E7EC; box-shadow: var(--shadow-2xl);"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-[18px] font-semibold text-[#0D1017] tracking-[-0.3px]">Nuevo vehículo</h2>
            <button
              (click)="close()"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#9EA3AE] hover:text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-150"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          @if (saving()) {
            <div class="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[13px] mb-4"
                 style="background: #EEF2FF; border: 1px solid #CBD5E1; color: #1E40AF;">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Guardando vehículo…
            </div>
          }

          @if (error()) {
            <div class="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[13px] mb-4"
                 style="background: #FEE2E2; border: 1px solid #FECACA; color: #7F1D1D;">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ error() }}
            </div>
          }

          <form (ngSubmit)="submit()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  VIN
                </label>
                <input
                  type="text"
                  [(ngModel)]="form.vin" name="vin"
                  placeholder="17 caracteres"
                  maxlength="17"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Modelo
                </label>
                <input
                  type="text"
                  [(ngModel)]="form.modelo" name="modelo"
                  placeholder="Ej. Mustang"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>

              <!-- Marca autocomplete -->
              <div class="col-span-2 sm:col-span-1 relative">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Marca <span class="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="marcaText" name="marcaText"
                  (input)="onMarcaSearch()"
                  (focus)="showMarcaResults.set(true)"
                  (blur)="hideMarcaResults()"
                    placeholder="Buscar marca…"
                  autocomplete="off"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
                @if (showMarcaResults() && marcaResults().length > 0) {
                  <div class="absolute z-10 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg border border-[#E4E7EC]"
                       style="background: #FFFFFF; max-height: 200px; overflow-y: auto;">
                    @for (m of marcaResults(); track m.id) {
                      <button
                        type="button"
                        (mousedown)="selectMarca(m)"
                        class="w-full text-left px-3.5 py-2.5 text-[13.5px] text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-75"
                      >
                        {{ m.nombre }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Cliente autocomplete -->
              <div class="col-span-2 sm:col-span-1 relative">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Cliente <span class="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="clienteText" name="clienteText"
                  (input)="onClienteSearch()"
                  (focus)="showClienteResults.set(true)"
                  (blur)="hideClienteResults()"
                    placeholder="Buscar por apodo…"
                  autocomplete="off"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
                @if (showClienteResults() && clienteResults().length > 0) {
                  <div class="absolute z-10 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg border border-[#E4E7EC]"
                       style="background: #FFFFFF; max-height: 200px; overflow-y: auto;">
                    @for (cl of clienteResults(); track cl.id) {
                      <button
                        type="button"
                        (mousedown)="selectCliente(cl)"
                        class="w-full text-left px-3.5 py-2.5 text-[13.5px] text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-75"
                      >
                        <span class="font-semibold">{{ cl.apodo }}</span>
                        @if (cl.nombreCompleto) {
                          <span class="text-[#9EA3AE]"> — {{ cl.nombreCompleto }}</span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Año</label>
                <input
                  type="number"
                  [(ngModel)]="form.anno" name="anno"
                  placeholder="2024"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Cilindrada (cm³)</label>
                <input
                  type="number"
                  [(ngModel)]="form.cilindradaCm3" name="cilindradaCm3"
                  placeholder="Ej. 1998"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>

              <div class="col-span-2">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Categoría</label>
                <select
                  [(ngModel)]="form.categoria" name="categoria"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="AUTOMOVIL">Automóvil</option>
                  <option value="CAMIONETA">Camioneta</option>
                  <option value="SUV">SUV</option>
                  <option value="MOTO">Motocicleta</option>
                  <option value="MAQUINARIA">Maquinaria</option>
                  <option value="CAMION">Camión</option>
                  <option value="TRACTOR">Tractor</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <!-- Additional fields -->
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Color</label>
                <input type="text" [(ngModel)]="form.color" name="color" placeholder="Ej. Rojo"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Valor factura</label>
                <input type="number" [(ngModel)]="form.valorFactura" name="valorFactura" placeholder="0.00" step="0.01"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">No. Motor</label>
                <input type="text" [(ngModel)]="form.numMotor" name="numMotor" placeholder="Número de motor"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">No. Serie</label>
                <input type="text" [(ngModel)]="form.numSerie" name="numSerie" placeholder="Número de serie"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Ubicación</label>
                <input type="text" [(ngModel)]="form.ubicacionActual" name="ubicacionActual" placeholder="Ej. Patio principal"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Fecha ingreso patio</label>
                <input type="date" [(ngModel)]="form.fechaIngresoPatio" name="fechaIngresoPatio"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-[#E4E7EC]">
              <button
                type="button"
                (click)="close()"
                class="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#6B717F] hover:text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-150"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="saving() || !selectedMarca || !selectedCliente"
                class="btn-primary px-5 py-2.5 rounded-xl text-[13px]"
              >
                @if (saving()) {
                  <span class="flex items-center gap-2">
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Guardando…
                  </span>
                } @else {
                  Crear vehículo
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class VehiculoFormDialogComponent {
  private vehiculoService = inject(VehiculoService);
  private clienteService = inject(ClienteService);

  visible = model(false);
  saved = output<void>();
  saving = signal(false);
  error = signal('');

  form: CreateVehiculoRequest = {
    vin: null, marcaId: '', modelo: null, anno: null,
    cilindradaCm3: null, categoria: null, clienteId: '',
    color: null, valorFactura: null, moneda: 'USD',
    numMotor: null, numSerie: null, fechaIngresoPatio: null,
    ubicacionActual: null, cumplioRequisitos: false, tieneSelloAduanal: false,
  };

  marcaText = '';
  clienteText = '';
  marcaResults = signal<MarcaDto[]>([]);
  clienteResults = signal<ClienteListDto[]>([]);
  showMarcaResults = signal(false);
  showClienteResults = signal(false);
  selectedMarca: MarcaDto | null = null;
  selectedCliente: ClienteListDto | null = null;

  private marcaSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private clienteSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideMarcaTimer: ReturnType<typeof setTimeout> | null = null;
  private hideClienteTimer: ReturnType<typeof setTimeout> | null = null;

  open(): void {
    this.resetForm();
    this.visible.set(true);
  }

  private resetForm(): void {
    this.form = { vin: null, marcaId: '', modelo: null, anno: null, cilindradaCm3: null, categoria: null, clienteId: '', color: null, valorFactura: null, moneda: 'USD', numMotor: null, numSerie: null, fechaIngresoPatio: null, ubicacionActual: null, cumplioRequisitos: false, tieneSelloAduanal: false };
    this.marcaText = '';
    this.clienteText = '';
    this.selectedMarca = null;
    this.selectedCliente = null;
    this.error.set('');
    this.saving.set(false);
  }

  onMarcaSearch(): void {
    if (this.marcaSearchTimeout) clearTimeout(this.marcaSearchTimeout);
    this.selectedMarca = null;
    this.form.marcaId = '';
    if (!this.marcaText.trim()) { this.marcaResults.set([]); return; }
    this.marcaSearchTimeout = setTimeout(() => {
      this.vehiculoService.searchMarcas(this.marcaText).subscribe({
        next: (res) => this.marcaResults.set(res),
      });
    }, 250);
  }

  selectMarca(m: MarcaDto): void {
    this.selectedMarca = m;
    this.form.marcaId = m.id;
    this.marcaText = m.nombre;
    this.showMarcaResults.set(false);
  }

  hideMarcaResults(): void {
    this.hideMarcaTimer = setTimeout(() => this.showMarcaResults.set(false), 200);
  }

  onClienteSearch(): void {
    if (this.clienteSearchTimeout) clearTimeout(this.clienteSearchTimeout);
    this.selectedCliente = null;
    this.form.clienteId = '';
    if (!this.clienteText.trim()) { this.clienteResults.set([]); return; }
    this.clienteSearchTimeout = setTimeout(() => {
      this.clienteService.searchAutocomplete(this.clienteText).subscribe({
        next: (res) => this.clienteResults.set(res),
      });
    }, 250);
  }

  selectCliente(cl: ClienteListDto): void {
    this.selectedCliente = cl;
    this.form.clienteId = cl.id;
    this.clienteText = cl.apodo;
    this.showClienteResults.set(false);
  }

  hideClienteResults(): void {
    this.hideClienteTimer = setTimeout(() => this.showClienteResults.set(false), 200);
  }

  close(): void {
    this.visible.set(false);
  }

  submit(): void {
    if (!this.form.vin?.trim()) { this.error.set('El VIN es requerido'); return; }
    if (this.form.vin.trim().length !== 17) { this.error.set('El VIN debe tener exactamente 17 caracteres'); return; }
    if (!this.selectedMarca) { this.error.set('Selecciona una marca'); return; }
    if (!this.selectedCliente) { this.error.set('Selecciona un cliente'); return; }
    this.saving.set(true);
    this.error.set('');
    this.vehiculoService.create({
      ...this.form,
      vin: this.form.vin!.toUpperCase(),
      moneda: this.form.moneda || 'USD',
    }).subscribe({
      next: () => { this.saving.set(false); this.visible.set(false); this.saved.emit(); },
      error: (err) => { this.error.set(err.error?.message || 'Error al crear vehículo'); this.saving.set(false); },
    });
  }
}
