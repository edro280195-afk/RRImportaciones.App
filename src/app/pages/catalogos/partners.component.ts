import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerExternoService, PartnerExternoDto } from '../../services/partner-externo.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Catálogos</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Partners externos</h1>
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
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Tipo</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Aliases</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Notas</th>
              <th class="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="5" class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando...</td></tr>
            }
            @for (p of partners(); track p.id) {
              <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                <td class="px-4 py-3 font-semibold text-[#0D1017]">{{ p.nombre }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold" [class]="tipoClass(p.tipo)">{{ p.tipo }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    @for (a of p.aliases; track a) {
                      <span class="rounded bg-[#F0F2F5] px-1.5 py-0.5 text-[11px]">{{ a }}</span>
                    }
                  </div>
                </td>
                <td class="px-4 py-3 text-[#6B717F]">{{ p.notas || '—' }}</td>
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
            <h2 class="mb-4 text-[18px] font-semibold">{{ editingId() ? 'Editar partner' : 'Nuevo partner' }}</h2>
            <div class="space-y-3">
              <div><label class="label-field">Nombre</label><input [(ngModel)]="form.nombre" class="input-field" /></div>
              <div>
                <label class="label-field">Tipo</label>
                <select [(ngModel)]="form.tipo" class="input-field">
                  <option value="PENSION">Pensión</option>
                  <option value="RECEPCION_DOCS">Recepción de documentos</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label class="label-field">Aliases (separados por coma)</label>
                <input [(ngModel)]="aliasesText" class="input-field" placeholder="ej. BETO, DON BETO" />
              </div>
              <div><label class="label-field">Notas</label><textarea [(ngModel)]="form.notas" rows="2" class="input-field"></textarea></div>
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
export class PartnersComponent {
  private http = inject(HttpClient);
  private service = inject(PartnerExternoService);
  auth = inject(AuthService);
  private readonly base = 'http://localhost:5198/api/partners-externos';

  partners = signal<PartnerExternoDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  aliasesText = '';
  form: any = this.empty();

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (list) => { this.partners.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew(): void { this.editingId.set(null); this.form = this.empty(); this.aliasesText = ''; this.showModal.set(true); this.message.set(null); this.error.set(null); }
  openEdit(p: PartnerExternoDto): void {
    this.editingId.set(p.id);
    this.form = { nombre: p.nombre, tipo: p.tipo, notas: p.notas ?? '' };
    this.aliasesText = p.aliases.join(', ');
    this.showModal.set(true); this.message.set(null); this.error.set(null);
  }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    this.saving.set(true);
    const id = this.editingId();
    const aliases = this.aliasesText.split(',').map(a => a.trim()).filter(Boolean);
    const body = { nombre: this.form.nombre, tipo: this.form.tipo, notas: this.form.notas || null, aliases };
    const obs = id ? this.http.put(`${this.base}/${id}`, body) : this.http.post(this.base, body);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.message.set('Partner guardado.'); this.load(); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'Error al guardar.'); },
    });
  }

  tipoClass(tipo: string): string {
    const map: Record<string, string> = { PENSION: 'bg-[#DBEAFE] text-[#1E40AF]', RECEPCION_DOCS: 'bg-[#FEF3C7] text-[#92400E]', OTRO: 'bg-[#F3F4F6] text-[#374151]' };
    return map[tipo] ?? 'bg-[#F3F4F6] text-[#374151]';
  }

  private empty() { return { nombre: '', tipo: 'PENSION', notas: '' }; }
}
