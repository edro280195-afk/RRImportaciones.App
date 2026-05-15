import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PersonalCampoService, PersonalCampoDto } from '../../services/personal-campo.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Catálogos</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Personal de campo</h1>
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
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Rol</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Teléfono</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Estatus</th>
              <th class="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="5" class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando...</td></tr>
            }
            @for (p of personal(); track p.id) {
              <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                <td class="px-4 py-3 font-semibold text-[#0D1017]">{{ p.nombre }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold" [class]="rolClass(p.rol)">{{ p.rol }}</span>
                </td>
                <td class="px-4 py-3 font-mono text-[12px] text-[#6B717F]">{{ p.telefono || '—' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    [class]="p.activo ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B7280]'">
                    {{ p.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  @if (auth.can('CATALOGOS_EDITAR')) {
                    <button (click)="openEdit(p)" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F3F4F6]">Editar</button>
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
            <h2 class="mb-4 text-[18px] font-semibold">{{ editingId() ? 'Editar personal' : 'Nuevo personal' }}</h2>
            <div class="space-y-3">
              <div><label class="label-field">Nombre</label><input [(ngModel)]="form.nombre" class="input-field" /></div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label-field">Rol</label>
                  <select [(ngModel)]="form.rol" class="input-field">
                    <option value="CHOFER">Chofer</option>
                    <option value="ENTREGADOR">Entregador</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>
                <div><label class="label-field">Teléfono</label><input [(ngModel)]="form.telefono" class="input-field" /></div>
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
export class PersonalComponent {
  private http = inject(HttpClient);
  private service = inject(PersonalCampoService);
  auth = inject(AuthService);
  private readonly base = 'http://localhost:5198/api/personal-campo';

  personal = signal<PersonalCampoDto[]>([]);
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
      next: (list) => { this.personal.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew(): void { this.editingId.set(null); this.form = this.empty(); this.showModal.set(true); this.message.set(null); this.error.set(null); }
  openEdit(p: PersonalCampoDto): void {
    this.editingId.set(p.id);
    this.form = { nombre: p.nombre, rol: p.rol, telefono: p.telefono ?? '', activo: p.activo };
    this.showModal.set(true); this.message.set(null); this.error.set(null);
  }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    this.saving.set(true);
    const id = this.editingId();
    const body = { nombre: this.form.nombre, rol: this.form.rol, telefono: this.form.telefono || null, activo: this.form.activo };
    const obs = id ? this.http.put(`${this.base}/${id}`, body) : this.http.post(this.base, body);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.message.set('Personal guardado.'); this.load(); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'Error al guardar.'); },
    });
  }

  rolClass(rol: string): string {
    const map: Record<string, string> = { CHOFER: 'bg-[#DBEAFE] text-[#1E40AF]', ENTREGADOR: 'bg-[#FEF3C7] text-[#92400E]', AMBOS: 'bg-[#E0E7FF] text-[#3730A3]' };
    return map[rol] ?? 'bg-[#F3F4F6] text-[#374151]';
  }

  private empty() { return { nombre: '', rol: 'CHOFER', telefono: '', activo: true }; }
}
