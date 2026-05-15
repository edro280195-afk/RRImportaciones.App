import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import { CotizacionInput, CotizacionOutput, CotizacionService } from '../../services/cotizacion.service';
import { MarcaDto, VehiculoService } from '../../services/vehiculo.service';

@Component({
  selector: 'app-cotizacion-nueva',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Cotizador automatizado</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Nueva cotizacion</h1>
        </div>
        <div class="rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] px-4 py-3 text-right">
          <p class="text-[11px] uppercase tracking-[0.7px] text-[#8B93A1]">TC Banxico</p>
          <p class="font-mono-data text-[22px] font-semibold text-[#0D1017]">
            {{ tipoCambio()?.tipoCambio || 'Pendiente' }}
          </p>
          @if (tipoCambio()?.fetchedAt) {
            <p class="mt-1 text-[11px] text-[#6B717F]">{{ tipoCambio()?.fetchedAt | date:'dd/MM/yyyy HH:mm' }}</p>
          }
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div class="space-y-5">
          <section class="card-elevated rounded-2xl p-5">
            <div class="mb-4 flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="grid h-7 w-7 place-items-center rounded-full bg-[#0D1017] text-[12px] font-semibold text-white">1</span>
                <div>
                  <h2 class="text-[15px] font-semibold text-[#0D1017]">Vehiculo</h2>
                  <p class="text-[12px] text-[#6B717F]">Captura el VIN y el sistema completa marca, modelo, ano y valor aduana.</p>
                </div>
              </div>
            </div>

            <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">VIN</label>
            <div class="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_150px]">
              <input [(ngModel)]="form.vin" maxlength="17" (input)="onVinInput()" placeholder="17 caracteres"
                class="h-12 rounded-xl border border-[#E4E7EC] bg-white px-3 font-mono-data text-[16px] uppercase outline-none transition focus:border-[#C61D26]" />
            </div>

            @if (decodeMessage()) {
              <p class="mt-3 text-[13px]" [style.color]="decodeOk() ? '#166534' : '#991B1B'">{{ decodeMessage() }}</p>
            }

            <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Marca ligada</label>
                <select [(ngModel)]="form.marcaId" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]">
                  <option [ngValue]="null">Sin marca ligada</option>
                  @for (m of marcas(); track m.id) {
                    <option [value]="m.id">{{ m.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Marca manual</label>
                <input [(ngModel)]="form.marca" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Modelo</label>
                <input [(ngModel)]="form.modelo" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Ano</label>
                <input [(ngModel)]="form.anno" type="number" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Cilindrada cm3</label>
                <input [(ngModel)]="form.cilindradaCm3" type="number" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Tipo vehiculo</label>
                <select [(ngModel)]="form.tipoVehiculo" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]">
                  <option value="AUTOMOVIL">Automovil</option>
                  <option value="CAMIONETA">Camioneta</option>
                  <option value="PICKUP">Pick up</option>
                  <option value="TRACTOCAMION">Tractocamion</option>
                </select>
              </div>
            </div>
          </section>

          <section class="card-elevated rounded-2xl p-5">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-[#0D1017] text-[12px] font-semibold text-white">2</span>
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Calculo</h2>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Margen TC</label>
                <input [(ngModel)]="form.tcMargen" type="number" step="0.01" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">TC aplicado</label>
                <div class="rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2.5 font-mono-data text-[13px]">
                  {{ tcAplicadoPreview() }}
                </div>
                @if (tipoCambio()?.fetchedAt) {
                  <p class="mt-1 text-[11px] text-[#8B93A1]">TC consultado {{ tipoCambio()?.fetchedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                }
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Tramite</label>
                <select [(ngModel)]="form.tipoTramite" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]">
                  <option value="NORMAL">Normal</option>
                  <option value="EXPRESS">Express</option>
                </select>
              </div>
            </div>

            <button type="button" (click)="advancedOpen = !advancedOpen"
              class="mt-4 text-[13px] font-semibold text-[#C61D26]">
              {{ advancedOpen ? 'Ocultar ajustes avanzados' : 'Mostrar ajustes avanzados' }}
            </button>

            @if (advancedOpen) {
              <div class="mt-4 grid grid-cols-1 gap-4 border-t border-[#ECEFF3] pt-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Valor aduana override USD</label>
                  <input [(ngModel)]="form.valorAduanaUsdOverride" type="number" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Honorarios override</label>
                  <input [(ngModel)]="form.honorariosOverride" type="number" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
                </div>
              </div>
            }

            <div class="mt-5 flex flex-wrap items-center gap-3">
              <button (click)="calcular()" [disabled]="calculating() || !canCalculate()" class="btn-primary rounded-xl px-5 py-2.5 text-[13px] disabled:opacity-40">
                {{ calculating() ? 'Calculando...' : 'Calcular cotizacion' }}
              </button>
              @if (calcError()) {
                <p class="text-[13px] text-[#991B1B]">{{ calcError() }}</p>
              }
            </div>
          </section>

          <section class="card-elevated rounded-2xl p-5">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-[#0D1017] text-[12px] font-semibold text-white">3</span>
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Cliente y guardado</h2>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="relative">
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Cliente</label>
                <input [(ngModel)]="clienteText" (input)="onClienteSearch()" (focus)="showClienteResults.set(true)" (blur)="hideClienteResults()"
                  placeholder="Buscar por apodo o nombre" autocomplete="off"
                  class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#C61D26]" />
                @if (showClienteResults() && clienteResults().length > 0) {
                  <div class="absolute left-0 right-0 z-20 mt-1 max-h-[220px] overflow-y-auto rounded-xl border border-[#E4E7EC] bg-white shadow-lg">
                    @for (c of clienteResults(); track c.id) {
                      <button type="button" (mousedown)="selectCliente(c)"
                        class="w-full px-3.5 py-2.5 text-left text-[13px] text-[#1E2330] transition hover:bg-[#F3F4F6]">
                        <span class="font-semibold">{{ c.apodo }}</span>
                        @if (c.nombreCompleto) {
                          <span class="text-[#8B93A1]"> / {{ c.nombreCompleto }}</span>
                        }
                      </button>
                    }
                  </div>
                }
                @if (clienteId) {
                  <button type="button" (click)="clearCliente()" class="mt-1 text-[12px] font-semibold text-[#C61D26]">Quitar cliente</button>
                }
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Notas internas</label>
                <input [(ngModel)]="notas" class="w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px]" />
              </div>
            </div>

            <button (click)="guardar()" [disabled]="!resultado() || saving()" class="mt-5 rounded-xl bg-[#16A34A] px-5 py-2.5 text-[13px] text-white disabled:opacity-40">
              {{ saving() ? 'Guardando...' : 'Guardar borrador' }}
            </button>
          </section>
        </div>

        <aside class="card-elevated sticky top-20 h-fit rounded-2xl p-5">
          @if (calculating()) {
            <div class="space-y-4">
              <p class="text-[11px] uppercase tracking-[1px] text-[#8B93A1]">Cotizando</p>
              <div class="h-2 overflow-hidden rounded-full bg-[#EEF1F5]">
                <div class="h-full w-2/3 animate-pulse rounded-full bg-[#C61D26]"></div>
              </div>
              <p class="text-[15px] font-semibold text-[#0D1017]">{{ calcStage() }}</p>
              <p class="text-[13px] text-[#6B717F]">Se consulta NHTSA, Anexo 2, Banxico y parametros fiscales.</p>
            </div>
          } @else {
            @if (resultado(); as r) {
              <p class="mb-1 text-[11px] uppercase tracking-[1px] text-[#8B93A1]">Total calculado</p>
              <p class="font-mono-data text-[34px] font-semibold text-[#0D1017]">\${{ r.total | number:'1.2-2' }}</p>
              <p class="mb-5 text-[12px] text-[#6B717F]">{{ sourceLabel(r.fuentePrecio) }} / {{ r.regimenFiscal }} / {{ r.fraccion }}</p>

              <div class="mb-5 rounded-xl border border-[#D8DEE8] bg-[#F8FAFC] p-3 text-[12px]">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <span class="font-semibold text-[#0D1017]">Evidencia del precio</span>
                  <span class="rounded-full bg-[#E8EEF7] px-2 py-0.5 font-mono-data text-[11px] text-[#384253]">{{ r.precioMatchTipo || 'SIN DATO' }}</span>
                </div>
                <p class="text-[#384253]">{{ r.precioCatalogoMarca || r.marca || 'Marca no ligada' }} / {{ r.precioCatalogoModelo || 'Sin modelo catalogo' }}</p>
                <p class="mt-1 text-[#6B717F]">{{ r.precioCatalogoOrigen || 'Origen no registrado' }} / Antiguedad: {{ r.precioAntiguedadAnios || 'N/D' }}</p>
                @if (r.precioAdvertencia) {
                  <p class="mt-2 text-[#991B1B]">{{ r.precioAdvertencia }}</p>
                }
              </div>

              <div class="mb-5 grid grid-cols-2 gap-2 text-[12px]">
                <div class="rounded-xl bg-[#F8FAFC] p-3">
                  <span class="block text-[#8B93A1]">Valor aduana USD</span>
                  <strong class="font-mono-data text-[#0D1017]">\${{ (r.valorAduanaUsd || 0) | number:'1.2-2' }}</strong>
                </div>
                <div class="rounded-xl bg-[#F8FAFC] p-3">
                  <span class="block text-[#8B93A1]">Valor pesos</span>
                  <strong class="font-mono-data text-[#0D1017]">\${{ r.valorPesos | number:'1.2-2' }}</strong>
                </div>
              </div>

              <div class="space-y-2 text-[13px]">
                <div class="flex justify-between"><span>IGI ({{ r.igiPorcentaje * 100 | number:'1.0-2' }}%)</span><strong>\${{ r.igi | number:'1.2-2' }}</strong></div>
                <div class="flex justify-between"><span>DTA</span><strong>\${{ r.dta | number:'1.2-2' }}</strong></div>
                <div class="flex justify-between"><span>IVA</span><strong>\${{ r.iva | number:'1.2-2' }}</strong></div>
                <div class="flex justify-between"><span>PREV</span><strong>\${{ r.prev | number:'1.2-2' }}</strong></div>
                <div class="flex justify-between"><span>PRV</span><strong>\${{ r.prv | number:'1.2-2' }}</strong></div>
                <div class="flex justify-between border-t border-[#ECEFF3] pt-2"><span>Impuestos</span><strong>\${{ r.impuestosTotal | number:'1.2-2' }}</strong></div>
                <div class="flex justify-between"><span>Honorarios</span><strong>\${{ r.honorarios | number:'1.2-2' }}</strong></div>
                @if (r.cargoExpress > 0) {
                  <div class="flex justify-between"><span>Express</span><strong>\${{ r.cargoExpress | number:'1.2-2' }}</strong></div>
                }
              </div>
            } @else {
              <p class="mb-1 text-[14px] font-medium text-[#1E2330]">Sin calculo</p>
              <p class="text-[13px] text-[#8B93A1]">Captura el VIN y presiona Calcular cotizacion.</p>
            }
          }
        </aside>
      </div>
    </div>
  `,
})
export class CotizacionNuevaComponent {
  private cotizacionService = inject(CotizacionService);
  private vehiculoService = inject(VehiculoService);
  private clienteService = inject(ClienteService);
  private router = inject(Router);
  private calcTimer: number | null = null;

  marcas = signal<MarcaDto[]>([]);
  clienteResults = signal<ClienteListDto[]>([]);
  showClienteResults = signal(false);
  tipoCambio = signal<{ tipoCambio: number; fetchedAt?: string } | null>(null);
  resultado = signal<CotizacionOutput | null>(null);
  decodeMessage = signal('');
  decodeOk = signal(false);
  calcError = signal('');
  calcStage = signal('');
  decoding = signal(false);
  calculating = signal(false);
  saving = signal(false);
  advancedOpen = false;
  clienteId: string | null = null;
  clienteText = '';
  notas = '';
  private clienteSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideClienteTimer: ReturnType<typeof setTimeout> | null = null;

  form: CotizacionInput = {
    vin: null,
    marcaId: null,
    marca: null,
    modelo: null,
    anno: null,
    cilindradaCm3: null,
    tipoVehiculo: 'AUTOMOVIL',
    valorAduanaUsdOverride: null,
    tcMargen: 0.30,
    tipoTramite: 'NORMAL',
    honorariosOverride: null,
  };

  constructor() {
    this.vehiculoService.getMarcas().subscribe((m) => this.marcas.set(m));
    this.cotizacionService.getTipoCambio().subscribe({ next: (tc) => this.tipoCambio.set(tc), error: () => this.tipoCambio.set(null) });
  }

  onVinInput(): void {
    this.form.vin = this.form.vin?.toUpperCase() || null;
    if ((this.form.vin || '').length === 17) this.decodeVin();
  }

  canCalculate(): boolean {
    return (this.form.vin || '').length === 17 || !!(this.form.modelo && this.form.anno && (this.form.marcaId || this.form.marca));
  }

  tcAplicadoPreview(): string {
    const tc = this.tipoCambio()?.tipoCambio;
    if (!tc) return 'Pendiente';
    return (Number(tc) + Number(this.form.tcMargen || 0)).toFixed(4);
  }

  sourceLabel(source: string): string {
    if (source === 'ANEXO2') return 'Anexo 2';
    if (source === 'OVERRIDE') return 'Valor manual';
    if (source === 'AMPARO') return 'Amparo';
    return source;
  }

  onClienteSearch(): void {
    if (this.clienteSearchTimeout) clearTimeout(this.clienteSearchTimeout);
    this.clienteId = null;
    if (!this.clienteText.trim()) {
      this.clienteResults.set([]);
      return;
    }

    this.clienteSearchTimeout = setTimeout(() => {
      this.clienteService.searchAutocomplete(this.clienteText).subscribe({
        next: (res) => {
          this.clienteResults.set(res);
          this.showClienteResults.set(true);
        },
      });
    }, 250);
  }

  selectCliente(cliente: ClienteListDto): void {
    this.clienteId = cliente.id;
    this.clienteText = cliente.nombreCompleto ? `${cliente.apodo} / ${cliente.nombreCompleto}` : cliente.apodo;
    this.showClienteResults.set(false);
  }

  hideClienteResults(): void {
    if (this.hideClienteTimer) clearTimeout(this.hideClienteTimer);
    this.hideClienteTimer = setTimeout(() => this.showClienteResults.set(false), 180);
  }

  clearCliente(): void {
    this.clienteId = null;
    this.clienteText = '';
    this.clienteResults.set([]);
  }

  decodeVin(): void {
    if (!this.form.vin || this.form.vin.length !== 17 || this.decoding()) return;
    this.decoding.set(true);
    this.cotizacionService.decodeVin(this.form.vin).subscribe({
      next: (v) => {
        this.form.marca = v.make;
        this.form.modelo = v.model;
        this.form.anno = v.modelYear;
        this.form.cilindradaCm3 = v.displacementCC ? Math.round(v.displacementCC) : this.form.cilindradaCm3;
        const make = (v.make || '').toUpperCase();
        const found = this.marcas().find((m) => m.nombre.toUpperCase() === make || m.aliases.some((a) => a.toUpperCase() === make));
        this.form.marcaId = found?.id || null;
        this.decodeOk.set(true);
        this.decodeMessage.set(`${v.make || ''} ${v.model || ''} ${v.modelYear || ''}`.trim());
        this.decoding.set(false);
      },
      error: () => {
        this.decodeOk.set(false);
        this.decodeMessage.set('No se pudo decodificar el VIN. Captura manualmente.');
        this.decoding.set(false);
      },
    });
  }

  calcular(): void {
    if (!this.canCalculate()) return;

    this.startCalcProgress();
    this.calcError.set('');
    this.resultado.set(null);

    this.cotizacionService.calcular(this.form).subscribe({
      next: (r) => {
        this.stopCalcProgress();
        this.resultado.set(r);
      },
      error: (err) => {
        this.stopCalcProgress();
        this.calcError.set(err?.error?.message || 'No se pudo calcular');
      },
    });
  }

  guardar(): void {
    if (!this.resultado()) return;
    this.saving.set(true);
    this.cotizacionService.crear({
      ...this.form,
      folio: null,
      clienteId: this.clienteId,
      notas: this.notas || null,
      fechaExpiracion: null,
    }).subscribe({
      next: (r) => this.router.navigate(['/cotizaciones', r.id]),
      error: () => this.saving.set(false),
    });
  }

  private startCalcProgress(): void {
    const stages = [
      'Consultando datos del VIN',
      'Buscando valor aduana en Anexo 2',
      'Aplicando tipo de cambio Banxico',
      'Calculando impuestos y honorarios',
    ];
    let index = 0;
    this.calculating.set(true);
    this.calcStage.set(stages[index]);
    if (this.calcTimer) window.clearInterval(this.calcTimer);
    this.calcTimer = window.setInterval(() => {
      index = Math.min(index + 1, stages.length - 1);
      this.calcStage.set(stages[index]);
    }, 900);
  }

  private stopCalcProgress(): void {
    if (this.calcTimer) {
      window.clearInterval(this.calcTimer);
      this.calcTimer = null;
    }
    this.calculating.set(false);
  }
}
