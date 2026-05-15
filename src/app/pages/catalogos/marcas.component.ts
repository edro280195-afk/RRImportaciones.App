import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarcaService, MarcaDto } from '../../services/marca.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Catálogos</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Marcas de vehículos</h1>
        </div>
        <div class="flex gap-2">
          <input [(ngModel)]="busqueda" class="input-field w-52" placeholder="Buscar marca..." />
          @if (auth.can('CATALOGOS_EDITAR')) {
            <button (click)="openNew()" class="btn-primary rounded-xl px-4 py-2 text-[13px]">+ Nueva</button>
          }
        </div>
      </div>

      @if (message()) {
        <div class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">{{ message() }}</div>
      }
      @if (error()) {
        <div class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">{{ error() }}</div>
      }

      <div class="card-elevated overflow-hidden rounded-2xl">
        @if (loading()) {
          <div class="p-10 text-center text-[13px] text-[#8B93A1]">Cargando marcas...</div>
        } @else {
          <table class="w-full text-[13px]">
            <thead>
              <tr class="border-b border-[#F0F2F5] bg-[#F8FAFC]">
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Nombre</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Aliases</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Estatus</th>
                <th class="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (m of marcasFiltradas(); track m.id) {
                <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                  <td class="px-4 py-3 font-semibold text-[#0D1017]">{{ m.nombre }}</td>
                  <td class="px-4 py-3 text-[#6B717F]">
                    <div class="flex flex-wrap gap-1">
                      @for (a of m.aliases; track a) {
                        <span class="rounded bg-[#F0F2F5] px-1.5 py-0.5 text-[11px]">{{ a }}</span>
                      }
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    @if (m.activo) {
                      <span class="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">Activa</span>
                    } @else {
                      <span class="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">Inactiva</span>
                    }
                  </td>
                  @if (auth.can('CATALOGOS_EDITAR')) {
                    <td class="px-4 py-3">
                      <button (click)="openEdit(m)" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F3F4F6] transition-colors">Editar</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 class="mb-4 text-[18px] font-semibold text-[#0D1017]">{{ editingId() ? 'Editar marca' : 'Nueva marca' }}</h2>
            <div class="space-y-4">
              <div>
                <label class="label-field">Nombre</label>
                <input [(ngModel)]="form.nombre" class="input-field" placeholder="ej. Toyota" />
              </div>
              <div>
                <label class="label-field">Aliases (separados por coma)</label>
                <input [(ngModel)]="aliasesText" class="input-field" placeholder="ej. TOYTA, TYT, TOYOT" />
                <p class="mt-1 text-[11px] text-[#8B93A1]">Nombres alternativos para detectar errores tipográficos en datos importados.</p>
              </div>
              <div>
                <label class="label-field">Estatus</label>
                <select [(ngModel)]="form.activo" class="input-field">
                  <option [ngValue]="true">Activa</option>
                  <option [ngValue]="false">Inactiva</option>
                </select>
              </div>
            </div>
            <div class="mt-5 flex justify-end gap-2">
              <button (click)="closeModal()" class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[13px] font-semibold">Cancelar</button>
              <button (click)="save()" [disabled]="saving()" class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MarcasComponent {
  private service = inject(MarcaService);
  auth = inject(AuthService);

  marcas = signal<MarcaDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  busqueda = '';
  aliasesText = '';

  form: { nombre: string; activo: boolean } = { nombre: '', activo: true };

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (list) => { this.marcas.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('No se pudieron cargar las marcas.'); },
    });
  }

  marcasFiltradas(): MarcaDto[] {
    if (!this.busqueda.trim()) return this.marcas();
    const q = this.busqueda.toLowerCase();
    return this.marcas().filter(m =>
      m.nombre.toLowerCase().includes(q) || m.aliases.some(a => a.toLowerCase().includes(q))
    );
  }

  openNew(): void {
    this.editingId.set(null);
    this.form = { nombre: '', activo: true };
    this.aliasesText = '';
    this.message.set(null);
    this.error.set(null);
    this.showModal.set(true);
  }

  openEdit(m: MarcaDto): void {
    this.editingId.set(m.id);
    this.form = { nombre: m.nombre, activo: m.activo };
    this.aliasesText = m.aliases.join(', ');
    this.message.set(null);
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const aliases = this.aliasesText.split(',').map(a => a.trim().toUpperCase()).filter(Boolean);
    const request = { nombre: this.form.nombre, aliases, activo: this.form.activo };
    const id = this.editingId();
    const obs = id ? this.service.update(id, request) : this.service.create(request);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.message.set('Marca guardada.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'No se pudo guardar la marca.');
      },
    });
  }
}
