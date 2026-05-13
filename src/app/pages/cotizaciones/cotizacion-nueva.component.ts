import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import { CotizacionInput, CotizacionOutput, CotizacionService } from '../../services/cotizacion.service';
import { MarcaDto, VehiculoService } from '../../services/vehiculo.service';

@Component({
  selector: 'app-cotizacion-nueva',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div>
      <div class="mb-6">
        <p class="text-[11px] uppercase tracking-[1.1px] text-[#9EA3AE] mb-1">Cotizador automatizado</p>
        <h1 class="text-[26px] font-semibold text-[#0D1017] leading-none">Nueva cotización</h1>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5">
        <div class="space-y-5">
          <section class="card-elevated rounded-2xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <span class="w-7 h-7 rounded-full bg-[#0D1017] text-white grid place-items-center text-[12px] font-semibold">1</span>
              <h2 class="text-[15px] font-semibold">Vehículo</h2>
            </div>

            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">VIN</label>
            <div class="flex gap-2 mb-4">
              <input [(ngModel)]="form.vin" maxlength="17" (input)="onVinInput()" placeholder="17 caracteres"
                class="flex-1 px-3 py-3 rounded-xl border border-[#E4E7EC] bg-white text-[15px] font-mono-data uppercase outline-none focus:border-[#C61D26]" />
              <button (click)="decodeVin()" [disabled]="decoding() || (form.vin || '').length !== 17"
                class="px-4 py-2 rounded-xl bg-[#0D1017] text-white text-[13px] disabled:opacity-40">Decodificar</button>
            </div>

            @if (decodeMessage()) {
              <p class="mb-4 text-[13px]" [style.color]="decodeOk() ? '#166534' : '#991B1B'">{{ decodeMessage() }}</p>
            }

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Marca</label>
                <select [(ngModel)]="form.marcaId" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]">
                  <option [ngValue]="null">Sin marca ligada</option>
                  @for (m of marcas(); track m.id) {
                    <option [value]="m.id">{{ m.nombre }}</option>
                  }
                </select>
                <input [(ngModel)]="form.marca" placeholder="Marca manual" class="w-full mt-2 px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Modelo</label>
                <input [(ngModel)]="form.modelo" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Año</label>
                <input [(ngModel)]="form.anno" type="number" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Cilindrada cm³</label>
                <input [(ngModel)]="form.cilindradaCm3" type="number" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Tipo vehículo</label>
                <select [(ngModel)]="form.tipoVehiculo" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]">
                  <option value="AUTOMOVIL">Automóvil</option>
                  <option value="CAMIONETA">Camioneta</option>
                  <option value="PICKUP">Pick up</option>
                </select>
              </div>
            </div>
          </section>

          <section class="card-elevated rounded-2xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <span class="w-7 h-7 rounded-full bg-[#0D1017] text-white grid place-items-center text-[12px] font-semibold">2</span>
              <h2 class="text-[15px] font-semibold">Cálculo</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p class="text-[11px] uppercase tracking-[0.6px] text-[#9EA3AE]">TC Banxico</p>
                <p class="text-[22px] font-semibold font-mono-data">{{ tipoCambio()?.tipoCambio || '—' }}</p>
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Margen TC</label>
                <input [(ngModel)]="form.tcMargen" type="number" step="0.01" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Trámite</label>
                <select [(ngModel)]="form.tipoTramite" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]">
                  <option value="NORMAL">Normal</option>
                  <option value="EXPRESS">Express</option>
                </select>
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Valor aduana override USD</label>
                <input [(ngModel)]="form.valorAduanaUsdOverride" type="number" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Honorarios override</label>
                <input [(ngModel)]="form.honorariosOverride" type="number" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
            </div>

            <div class="mt-5 flex gap-2">
              <button (click)="calcular()" [disabled]="calculating()" class="btn-primary px-5 py-2.5 rounded-xl text-[13px]">Calcular</button>
              @if (calcError()) { <p class="text-[13px] text-[#991B1B] self-center">{{ calcError() }}</p> }
            </div>
          </section>

          <section class="card-elevated rounded-2xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <span class="w-7 h-7 rounded-full bg-[#0D1017] text-white grid place-items-center text-[12px] font-semibold">3</span>
              <h2 class="text-[15px] font-semibold">Cliente y guardado</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Cliente</label>
                <select [(ngModel)]="clienteId" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]">
                  <option [ngValue]="null">Sin cliente</option>
                  @for (c of clientes(); track c.id) {
                    <option [value]="c.id">{{ c.apodo }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F] block mb-1">Notas</label>
                <input [(ngModel)]="notas" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] bg-white text-[13px]" />
              </div>
            </div>

            <button (click)="guardar()" [disabled]="!resultado() || saving()" class="mt-5 px-5 py-2.5 rounded-xl bg-[#16A34A] text-white text-[13px] disabled:opacity-40">Guardar borrador</button>
          </section>
        </div>

        <aside class="card-elevated rounded-2xl p-5 h-fit sticky top-20">
          @if (resultado(); as r) {
            <p class="text-[11px] uppercase tracking-[1px] text-[#9EA3AE] mb-1">Total calculado</p>
            <p class="text-[34px] font-semibold font-mono-data text-[#0D1017]">\${{ r.total | number:'1.2-2' }}</p>
            <p class="text-[12px] text-[#6B717F] mb-5">{{ r.fuentePrecio }} · {{ r.regimenFiscal }} · {{ r.fraccion }}</p>
            <div class="space-y-2 text-[13px]">
              <div class="flex justify-between"><span>Valor pesos</span><strong>\${{ r.valorPesos | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>IGI</span><strong>\${{ r.igi | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>DTA</span><strong>\${{ r.dta | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>IVA</span><strong>\${{ r.iva | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>PREV</span><strong>\${{ r.prev | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>PRV</span><strong>\${{ r.prv | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>Honorarios</span><strong>\${{ r.honorarios | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>Express</span><strong>\${{ r.cargoExpress | number:'1.2-2' }}</strong></div>
            </div>
          } @else {
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">Sin cálculo</p>
            <p class="text-[13px] text-[#9EA3AE]">Captura el vehículo y presiona calcular.</p>
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

  marcas = signal<MarcaDto[]>([]);
  clientes = signal<ClienteListDto[]>([]);
  tipoCambio = signal<{ tipoCambio: number } | null>(null);
  resultado = signal<CotizacionOutput | null>(null);
  decodeMessage = signal('');
  decodeOk = signal(false);
  calcError = signal('');
  decoding = signal(false);
  calculating = signal(false);
  saving = signal(false);
  clienteId: string | null = null;
  notas = '';

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
    this.clienteService.getList({ pageSize: 100 }).subscribe((c) => this.clientes.set(c.items));
    this.cotizacionService.getTipoCambio().subscribe({ next: (tc) => this.tipoCambio.set(tc), error: () => this.tipoCambio.set(null) });
  }

  onVinInput(): void {
    this.form.vin = this.form.vin?.toUpperCase() || null;
    if ((this.form.vin || '').length === 17) this.decodeVin();
  }

  decodeVin(): void {
    if (!this.form.vin || this.form.vin.length !== 17) return;
    this.decoding.set(true);
    this.cotizacionService.decodeVin(this.form.vin).subscribe({
      next: (v) => {
        this.form.marca = v.make;
        this.form.modelo = v.model;
        this.form.anno = v.modelYear;
        this.form.cilindradaCm3 = v.displacementCC ? Math.round(v.displacementCC) : this.form.cilindradaCm3;
        const found = this.marcas().find((m) => m.nombre.toUpperCase() === (v.make || '').toUpperCase() || m.aliases.some((a) => a.toUpperCase() === (v.make || '').toUpperCase()));
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
    this.calculating.set(true);
    this.calcError.set('');
    this.cotizacionService.calcular(this.form).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.calculating.set(false);
      },
      error: (err) => {
        this.calcError.set(err?.error?.message || 'No se pudo calcular');
        this.calculating.set(false);
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
}
