import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TramitadorService, TramitadorDto } from '../../services/tramitador.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tramitadores',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Catálogos</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Tramitadores</h1>
        </div>
        @if (auth.can('CATALOGOS_EDITAR')) {
          <button (click)="openNew()" class="btn-primary rounded-xl px-4 py-2 text-[13px]">+ Nuevo</button>
        }
      </div>

      @if (message()) {
        <div class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">{{ message() }}</div>
      }
      @if (error()) {
        <div class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">{{ error() }}</div>
      }

      <div class="card-elevated overflow-hidden rounded-2xl">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-[#F0F2F5] bg-[#F8FAFC]">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Nombre</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Teléfono</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Email</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Comisión</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Estatus</th>
              <th class="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="6" class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando...</td></tr>
            }
            @for (t of tramitadores(); track t.id) {
              <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                <td class="px-4 py-3 font-semibold text-[#0D1017]">{{ t.nombre }}</td>
                <td class="px-4 py-3 font-mono text-[12px] text-[#6B717F]">{{ t.telefono || '—' }}</td>
                <td class="px-4 py-3 text-[#6B717F]">{{ t.email || '—' }}</td>
                <td class="px-4 py-3 text-[#6B717F]">
                  @if (t.comisionTipo === 'NA') { <span class="text-[#8B93A1]">Sin comisión</span> }
                  @else { {{ t.comisionTipo }} {{ t.comisionValor }} }
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    [class]="t.activo ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B7280]'">
                    {{ t.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  @if (auth.can('CATALOGOS_EDITAR')) {
                    <button (click)="openEdit(t)" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F3F4F6]">Editar</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 class="mb-4 text-[18px] font-semibold">{{ editingId() ? 'Editar tramitador' : 'Nuevo tramitador' }}</h2>
            <div class="space-y-3">
              <div><label class="label-field">Nombre</label><input [(ngModel)]="form.nombre" class="input-field" /></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="label-field">Teléfono</label><input [(ngModel)]="form.telefono" class="input-field" /></div>
                <div><label class="label-field">Email</label><input [(ngModel)]="form.email" class="input-field" /></div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label-field">Tipo comisión</label>
                  <select [(ngModel)]="form.comisionTipo" class="input-field">
                    <option value="NA">Sin comisión</option>
                    <option value="FIJO">Fijo</option>
                    <option value="PORCENTAJE">Porcentaje</option>
                  </select>
                </div>
                <div><label class="label-field">Valor</label><input [(ngModel)]="form.comisionValor" type="number" class="input-field" [disabled]="form.comisionTipo === 'NA'" /></div>
              </div>
              <div>
                <label class="label-field">Estatus</label>
                <select [(ngModel)]="form.activo" class="input-field"><option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option></select>
              </div>
            </div>
            <div class="mt-5 flex justify-end gap-2">
              <button (click)="closeModal()" class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[13px] font-semibold">Cancelar</button>
              <button (click)="save()" [disabled]="saving()" class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40">{{ saving() ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TramitadoresComponent {
  private http = inject(HttpClient);
  private service = inject(TramitadorService);
  auth = inject(AuthService);
  private readonly base = 'http://localhost:5198/api/tramitadores';

  tramitadores = signal<TramitadorDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  form: any = this.empty();

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getAll(false).subscribe({
      next: (list) => { this.tramitadores.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew(): void { this.editingId.set(null); this.form = this.empty(); this.showModal.set(true); this.message.set(null); this.error.set(null); }
  openEdit(t: TramitadorDto): void {
    this.editingId.set(t.id);
    this.form = { nombre: t.nombre, telefono: t.telefono ?? '', email: t.email ?? '', comisionTipo: t.comisionTipo, comisionValor: t.comisionValor, activo: t.activo };
    this.showModal.set(true); this.message.set(null); this.error.set(null);
  }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    this.saving.set(true);
    const id = this.editingId();
    const body = { nombre: this.form.nombre, telefono: this.form.telefono || null, email: this.form.email || null, comisionTipo: this.form.comisionTipo, comisionValor: this.form.comisionValor, activo: this.form.activo };
    const obs = id ? this.http.put(`${this.base}/${id}`, body) : this.http.post(this.base, body);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.message.set('Tramitador guardado.'); this.load(); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'Error al guardar.'); },
    });
  }

  private empty() { return { nombre: '', telefono: '', email: '', comisionTipo: 'NA', comisionValor: 0, activo: true }; }
}
