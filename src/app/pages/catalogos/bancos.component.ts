import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BancoDto, BancoService, GuardarBancoRequest } from '../../services/banco.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Catálogos</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Bancos</h1>
          <p class="mt-1 text-[13px] text-[#6B717F]">Cuentas disponibles para pagos por transferencia, depósito y referencia bancaria.</p>
        </div>
        <div class="flex items-center gap-2">
          <input [(ngModel)]="filtro" placeholder="Buscar banco..." class="input-field w-56" />
          @if (auth.can('CATALOGOS_EDITAR')) {
            <button (click)="openNew()" class="btn-primary rounded-xl px-4 py-2 text-[13px]">+ Nuevo</button>
          }
        </div>
      </div>

      @if (message()) { <div class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">{{ message() }}</div> }
      @if (error()) { <div class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">{{ error() }}</div> }

      <div class="card-elevated overflow-hidden rounded-2xl">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-[#F0F2F5] bg-[#F8FAFC]">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Identificador</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Banco</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Cuenta</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">CLABE</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Estatus</th>
              <th class="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="6" class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando...</td></tr>
            } @else if (filtrados().length === 0) {
              <tr><td colspan="6" class="py-10 text-center text-[13px] text-[#8B93A1]">Sin bancos registrados</td></tr>
            } @else {
              @for (b of filtrados(); track b.id) {
                <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                  <td class="px-4 py-3"><span class="rounded-md bg-[#F3F4F6] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#4B5162]">{{ b.identificador }}</span></td>
                  <td class="px-4 py-3">
                    <p class="font-semibold text-[#0D1017]">{{ b.nombre }}</p>
                    <p class="text-[11px] text-[#8B93A1]">{{ b.titular || 'Sin titular' }}</p>
                  </td>
                  <td class="px-4 py-3 font-mono text-[12px] text-[#6B717F]">{{ b.cuenta || '—' }}</td>
                  <td class="px-4 py-3 font-mono text-[12px] text-[#6B717F]">{{ b.clabe || '—' }}</td>
                  <td class="px-4 py-3"><span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" [class]="b.activo ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B7280]'">{{ b.activo ? 'Activo' : 'Inactivo' }}</span></td>
                  <td class="px-4 py-3">
                    @if (auth.can('CATALOGOS_EDITAR')) {
                      <button (click)="openEdit(b)" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F3F4F6]">Editar</button>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" (click)="closeModal()">
          <form class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 class="text-[18px] font-semibold text-[#0D1017]">{{ editingId() ? 'Editar banco' : 'Nuevo banco' }}</h2>
                <p class="text-[12px] text-[#6B717F]">El identificador ayuda a reconocer la cuenta al registrar pagos.</p>
              </div>
              <button type="button" (click)="closeModal()" class="text-[#9EA3AE] hover:text-[#0D1017]">×</button>
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div><label class="label-field">Identificador</label><input [(ngModel)]="form.identificador" name="identificador" class="input-field uppercase" placeholder="BBVA-001" /></div>
              <div><label class="label-field">Banco</label><input [(ngModel)]="form.nombre" name="nombre" class="input-field" placeholder="BBVA" /></div>
              <div><label class="label-field">Titular</label><input [(ngModel)]="form.titular" name="titular" class="input-field" /></div>
              <div><label class="label-field">Moneda</label><select [(ngModel)]="form.moneda" name="moneda" class="input-field"><option [ngValue]="null">Sin definir</option><option value="MXN">MXN</option><option value="USD">USD</option></select></div>
              <div><label class="label-field">Cuenta</label><input [(ngModel)]="form.cuenta" name="cuenta" class="input-field" /></div>
              <div><label class="label-field">CLABE</label><input [(ngModel)]="form.clabe" name="clabe" class="input-field" /></div>
              <div class="md:col-span-2"><label class="label-field">Notas</label><textarea [(ngModel)]="form.notas" name="notas" class="input-field min-h-[74px]"></textarea></div>
              <label class="flex items-center gap-2 text-[13px] text-[#4B5162]"><input [(ngModel)]="form.activo" name="activo" type="checkbox" /> Activo</label>
            </div>
            <div class="mt-5 flex justify-end gap-2">
              <button type="button" (click)="closeModal()" class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[13px] font-semibold">Cancelar</button>
              <button type="submit" [disabled]="saving()" class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40">{{ saving() ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class BancosComponent {
  private service = inject(BancoService);
  auth = inject(AuthService);

  bancos = signal<BancoDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  filtro = '';
  form = this.empty();

  filtrados = computed(() => {
    const q = this.filtro.toLowerCase().trim();
    if (!q) return this.bancos();
    return this.bancos().filter(b => `${b.identificador} ${b.nombre} ${b.titular ?? ''} ${b.cuenta ?? ''} ${b.clabe ?? ''}`.toLowerCase().includes(q));
  });

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getAll(false).subscribe({
      next: list => { this.bancos.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('No se pudieron cargar los bancos.'); },
    });
  }

  openNew(): void { this.editingId.set(null); this.form = this.empty(); this.message.set(null); this.error.set(null); this.showModal.set(true); }
  openEdit(b: BancoDto): void {
    this.editingId.set(b.id);
    this.form = { identificador: b.identificador, nombre: b.nombre, titular: b.titular, cuenta: b.cuenta, clabe: b.clabe, moneda: b.moneda, notas: b.notas, activo: b.activo };
    this.message.set(null); this.error.set(null); this.showModal.set(true);
  }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    if (!this.form.identificador.trim() || !this.form.nombre.trim()) {
      this.error.set('Identificador y banco son obligatorios.');
      return;
    }
    this.saving.set(true);
    const body: GuardarBancoRequest = { ...this.form, identificador: this.form.identificador.trim().toUpperCase(), nombre: this.form.nombre.trim() };
    const id = this.editingId();
    const obs = id ? this.service.update(id, body) : this.service.create(body);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.message.set('Banco guardado.'); this.load(); },
      error: err => { this.saving.set(false); this.error.set(err?.error?.message || 'Error al guardar banco.'); },
    });
  }

  private empty(): GuardarBancoRequest {
    return { identificador: '', nombre: '', titular: null, cuenta: null, clabe: null, moneda: 'MXN', notas: null, activo: true };
  }
}
