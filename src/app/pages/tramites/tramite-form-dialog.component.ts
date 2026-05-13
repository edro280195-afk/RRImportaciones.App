import { Component, signal, model, output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TramiteService, CreateTramiteRequest } from '../../services/tramite.service';

@Component({
  selector: 'app-tramite-form-dialog',
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
            <h2 class="text-[18px] font-semibold text-[#0D1017] tracking-[-0.3px]">Nuevo trámite</h2>
            <button (click)="close()" class="w-8 h-8 rounded-lg flex items-center justify-center text-[#9EA3AE] hover:text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-150">
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
              Guardando trámite…
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

              <!-- Cliente -->
              <div class="col-span-2">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Cliente <span class="text-[#DC2626]">*</span>
                </label>
                <select [(ngModel)]="form.clienteId" name="clienteId" required
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
                  <option value="">Seleccionar cliente…</option>
                  @for (c of clientes; track c.id) {
                    <option [value]="c.id">{{ c.apodo }} — {{ c.nombreCompleto || '' }}</option>
                  }
                </select>
              </div>

              <!-- Vehículo -->
              <div class="col-span-2">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Vehículo
                </label>
                <select [(ngModel)]="form.vehiculoId" name="vehiculoId"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
                  <option value="">Sin vehículo (mercancía suelta)</option>
                  @for (v of vehiculos; track v.id) {
                    <option [value]="v.id">{{ v.vinCorto || v.vin }} — {{ v.marcaNombre || '' }} {{ v.modeloNombre || '' }}</option>
                  }
                </select>
              </div>

              <!-- Aduana -->
              <div>
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Aduana</label>
                <select [(ngModel)]="form.aduanaId" name="aduanaId"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
                  <option value="">Seleccionar aduana…</option>
                  @for (a of aduanas; track a.id) {
                    <option [value]="a.id">{{ a.nombre }}</option>
                  }
                </select>
              </div>

              <!-- Tramitador -->
              <div>
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Tramitador</label>
                <select [(ngModel)]="form.tramitadorId" name="tramitadorId"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
                  <option value="">Seleccionar tramitador…</option>
                  @for (t of tramitadores; track t.id) {
                    <option [value]="t.id">{{ t.nombre }}</option>
                  }
                </select>
              </div>

              <!-- Tipo trámite -->
              <div>
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Tipo</label>
                <select [(ngModel)]="form.tipoTramite" name="tipoTramite"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
                  <option value="NORMAL">Normal</option>
                  <option value="EXPRESS">Express (+$500)</option>
                  <option value="ASESORIA_LOGISTICA">Asesoría logística</option>
                </select>
              </div>

              <!-- Cobro total -->
              <div>
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Cobro total <span class="text-[#DC2626]">*</span>
                </label>
                <input type="number" step="0.01" [(ngModel)]="form.cobroTotal" name="cobroTotal" required
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
              </div>

              <!-- Honorarios -->
              <div>
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Honorarios</label>
                <input type="number" step="0.01" [(ngModel)]="form.honorarios" name="honorarios"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]">
              </div>

              <!-- Notas -->
              <div class="col-span-2">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Notas</label>
                <textarea [(ngModel)]="form.notas" name="notas" rows="2"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"></textarea>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-[#E4E7EC]">
              <button type="button" (click)="close()" class="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#6B717F] hover:text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-150">
                Cancelar
              </button>
              <button type="submit" [disabled]="saving() || !form.clienteId || !form.cobroTotal" class="btn-primary px-5 py-2.5 rounded-xl text-[13px]">
                @if (saving()) {
                  <span class="flex items-center gap-2">
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Guardando…
                  </span>
                } @else {
                  Crear trámite
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TramiteFormDialogComponent {
  private tramiteService = inject(TramiteService);
  router = inject(Router);

  visible = model(false);
  saved = output<string>();
  saving = signal(false);
  error = signal('');

  clientes: any[] = [];
  vehiculos: any[] = [];
  tramitadores: any[] = [];
  aduanas: any[] = [];

  form = {
    clienteId: '',
    vehiculoId: '',
    aduanaId: '',
    tramitadorId: '',
    tipoTramite: 'NORMAL',
    cobroTotal: 0,
    honorarios: 0,
    notas: '',
  };

  async open(): Promise<void> {
    this.resetForm();
    await this.loadCatalogs();
    this.visible.set(true);
  }

  private resetForm(): void {
    this.form = { clienteId: '', vehiculoId: '', aduanaId: '', tramitadorId: '', tipoTramite: 'NORMAL', cobroTotal: 0, honorarios: 0, notas: '' };
    this.error.set('');
    this.saving.set(false);
  }

  private async loadCatalogs(): Promise<void> {
    const [clientesRes, vehiculosRes, tramitadoresRes, aduanasRes] = await Promise.all([
      fetch('http://localhost:5198/api/clientes?pageSize=100'),
      fetch('http://localhost:5198/api/vehiculos?pageSize=100'),
      fetch('http://localhost:5198/api/tramitadores?soloActivos=true'),
      fetch('http://localhost:5198/api/aduanas'),
    ]);
    if (clientesRes.ok) { const d = await clientesRes.json(); this.clientes = d.items || d; }
    if (vehiculosRes.ok) { const d = await vehiculosRes.json(); this.vehiculos = d.items || d; }
    if (tramitadoresRes.ok) this.tramitadores = await tramitadoresRes.json();
    if (aduanasRes.ok) this.aduanas = await aduanasRes.json();
  }

  close(): void {
    this.visible.set(false);
  }

  submit(): void {
    if (!this.form.clienteId) { this.error.set('Selecciona un cliente'); return; }
    if (!this.form.cobroTotal) { this.error.set('El cobro total es requerido'); return; }

    this.saving.set(true);
    this.error.set('');

    const request: CreateTramiteRequest = {
      clienteId: this.form.clienteId,
      vehiculoId: this.form.vehiculoId || undefined,
      aduanaId: this.form.aduanaId || undefined,
      tramitadorId: this.form.tramitadorId || undefined,
      tipoTramite: this.form.tipoTramite,
      cobroTotal: this.form.cobroTotal,
      honorarios: this.form.honorarios,
      notas: this.form.notas || undefined,
    };

    this.tramiteService.create(request).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit(res.id);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al crear trámite');
        this.saving.set(false);
      },
    });
  }
}
