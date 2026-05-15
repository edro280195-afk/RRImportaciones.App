import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParametrosFiscalesService, ParametroFiscalDto, UpdateParametroFiscalRequest } from '../../services/parametros-fiscales.service';

interface ParametroFiscalForm {
  igi: number | null;
  dta: number | null;
  dtaFijo: number | null;
  iva: number;
  prevFijo: number;
  prvFijo: number;
  vigenteDesde: string;
}

@Component({
  selector: 'app-parametros-fiscales',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div>
        <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Administración</p>
        <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Parámetros fiscales</h1>
        <p class="mt-1 text-[13px] text-[#6B717F]">Al guardar un cambio se crea una nueva versión con fecha de inicio, conservando el histórico.</p>
      </div>

      @if (message()) {
        <div class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">{{ message() }}</div>
      }
      @if (error()) {
        <div class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando parámetros...</div>
      } @else {
        <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
          @for (p of parametros(); track p.id) {
            <div class="card-elevated rounded-2xl p-5">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <span class="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold" [class]="regimenClass(p.regimen)">{{ p.regimen }}</span>
                  <p class="mt-1 text-[12px] text-[#6B717F]">{{ p.descripcion }}</p>
                </div>
                @if (p.activo) {
                  <span class="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">Vigente</span>
                } @else {
                  <span class="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">Histórico</span>
                }
              </div>

              <!-- Vista de valores actuales -->
              <div class="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-[#F8FAFC] p-4 text-[13px]">
                <div><p class="text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">IGI</p><p class="font-mono font-semibold">{{ p.igi !== null ? (p.igi * 100).toFixed(1) + '%' : '—' }}</p></div>
                <div><p class="text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">DTA</p><p class="font-mono font-semibold">{{ dtaLabel(p) }}</p></div>
                <div><p class="text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">IVA</p><p class="font-mono font-semibold">{{ (p.iva * 100).toFixed(0) + '%' }}</p></div>
                <div><p class="text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">PREV fijo</p><p class="font-mono font-semibold">{{ p.prevFijo > 0 ? '$' + p.prevFijo : '—' }}</p></div>
                <div><p class="text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">PRV fijo</p><p class="font-mono font-semibold">{{ p.prvFijo > 0 ? '$' + p.prvFijo : '—' }}</p></div>
                <div><p class="text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">Desde</p><p class="font-mono font-semibold text-[11px]">{{ p.vigenteDesde ?? '—' }}</p></div>
              </div>

              @if (p.activo) {
                <!-- Formulario de edición -->
                @if (editingRegimen() === p.regimen) {
                  <div class="space-y-3 border-t border-[#F0F2F5] pt-4">
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="label-field">IGI (%)</label>
                        <input [(ngModel)]="forms[p.regimen].igi" type="number" step="0.1" class="input-field" placeholder="ej. 10" />
                      </div>
                      <div>
                        <label class="label-field">DTA (%)</label>
                        <input [(ngModel)]="forms[p.regimen].dta" type="number" step="0.001" class="input-field" placeholder="ej. 0.008" />
                      </div>
                      <div>
                        <label class="label-field">DTA fijo (MXN)</label>
                        <input [(ngModel)]="forms[p.regimen].dtaFijo" type="number" class="input-field" placeholder="ej. 408" />
                      </div>
                      <div>
                        <label class="label-field">IVA (%)</label>
                        <input [(ngModel)]="forms[p.regimen].iva" type="number" step="0.01" class="input-field" />
                      </div>
                      <div>
                        <label class="label-field">PREV fijo (MXN)</label>
                        <input [(ngModel)]="forms[p.regimen].prevFijo" type="number" class="input-field" />
                      </div>
                      <div>
                        <label class="label-field">PRV fijo (MXN)</label>
                        <input [(ngModel)]="forms[p.regimen].prvFijo" type="number" class="input-field" />
                      </div>
                    </div>
                    <div>
                      <label class="label-field">Vigente desde</label>
                      <input [(ngModel)]="forms[p.regimen].vigenteDesde" type="date" class="input-field" />
                    </div>
                    <div class="flex justify-end gap-2 pt-1">
                      <button (click)="cancelEdit()" class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[12px] font-semibold">Cancelar</button>
                      <button (click)="save(p.regimen)" [disabled]="saving()" class="btn-primary rounded-xl px-4 py-2 text-[12px] disabled:opacity-40">
                        {{ saving() ? 'Guardando...' : 'Guardar nueva versión' }}
                      </button>
                    </div>
                  </div>
                } @else {
                  <button (click)="startEdit(p)" class="w-full rounded-xl border border-[#D8DEE8] py-2 text-[13px] font-semibold hover:bg-[#F8FAFC] transition-colors">
                    Modificar parámetros
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ParametrosFiscalesComponent {
  private service = inject(ParametrosFiscalesService);

  parametros = signal<ParametroFiscalDto[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingRegimen = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  forms: Record<string, ParametroFiscalForm> = {};

  constructor() {
    this.service.getAll().subscribe({
      next: (list) => { this.parametros.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startEdit(p: ParametroFiscalDto): void {
    this.editingRegimen.set(p.regimen);
    this.forms[p.regimen] = {
      igi: p.igi !== null ? +(p.igi * 100).toFixed(4) : null,
      dta: p.dta !== null ? p.dta : null,
      dtaFijo: p.dtaFijo ?? null,
      iva: +(p.iva * 100).toFixed(0),
      prevFijo: p.prevFijo,
      prvFijo: p.prvFijo,
      vigenteDesde: new Date().toISOString().slice(0, 10),
    };
    this.message.set(null);
    this.error.set(null);
  }

  cancelEdit(): void { this.editingRegimen.set(null); }

  save(regimen: string): void {
    this.saving.set(true);
    const f = this.forms[regimen];
    const request: UpdateParametroFiscalRequest = {
      igi: f.igi !== null ? f.igi / 100 : undefined,
      dta: f.dta !== null ? f.dta : undefined,
      dtaFijo: f.dtaFijo ?? undefined,
      iva: f.iva / 100,
      prevFijo: f.prevFijo,
      prvFijo: f.prvFijo,
      vigenteDesde: f.vigenteDesde,
    };
    this.service.update(regimen, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingRegimen.set(null);
        this.message.set(`Parámetros de ${regimen} actualizados. El histórico anterior fue conservado.`);
        this.service.getAll().subscribe({ next: (list) => this.parametros.set(list) });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Error al guardar los parámetros.');
      },
    });
  }

  dtaLabel(p: ParametroFiscalDto): string {
    if (p.dta) return (p.dta * 100).toFixed(2) + '%';
    if (p.dtaFijo) return '$' + p.dtaFijo;
    return '—';
  }

  regimenClass(regimen: string): string {
    return regimen === 'POST_2017'
      ? 'bg-[#DBEAFE] text-[#1E40AF]'
      : 'bg-[#FEF3C7] text-[#92400E]';
  }
}
