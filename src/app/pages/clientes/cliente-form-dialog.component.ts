import { Component, signal, output, input, model, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClienteService, ClienteDetailDto, CreateClienteRequest } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-form-dialog',
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
          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-[18px] font-semibold text-[#0D1017] tracking-[-0.3px]">
              {{ isEditing() ? 'Editar cliente' : 'Nuevo cliente' }}
            </h2>
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
              Guardando…
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
                  Apodo <span class="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="form.apodo" name="apodo" required
                  placeholder="Ej. El Güero"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  [(ngModel)]="form.nombreCompleto" name="nombreCompleto"
                  placeholder="Nombre legal o razón social"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">RFC</label>
                <input
                  type="text"
                  [(ngModel)]="form.rfc" name="rfc"
                  placeholder="RFC"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Teléfono</label>
                <input
                  type="text"
                  [(ngModel)]="form.telefono" name="telefono"
                  placeholder="Teléfono"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Email</label>
                <input
                  type="email"
                  [(ngModel)]="form.email" name="email"
                  placeholder="correo@ejemplo.com"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Procedencia</label>
                <input
                  type="text"
                  [(ngModel)]="form.procedencia" name="procedencia"
                  placeholder="Ej. Texas, USA"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Dirección</label>
                <input
                  type="text"
                  [(ngModel)]="form.direccion" name="direccion"
                  placeholder="Dirección"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">Notas</label>
                <textarea
                  [(ngModel)]="form.notas" name="notas" rows="3"
                  placeholder="Notas adicionales…"
                  class="w-full px-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)] resize-none"
                ></textarea>
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
                [disabled]="saving() || !form.apodo.trim()"
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
                  {{ isEditing() ? 'Guardar cambios' : 'Crear cliente' }}
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClienteFormDialogComponent {
  private service = inject(ClienteService);

  visible = model(false);
  cliente = input<ClienteDetailDto | null>(null);
  saved = output<void>();
  saving = signal(false);
  error = signal('');

  form: CreateClienteRequest = {
    apodo: '', nombreCompleto: null, rfc: null, telefono: null,
    email: null, procedencia: null, direccion: null, notas: null,
  };

  isEditing(): boolean {
    return !!this.cliente();
  }

  openForCreate(): void {
    this.form = {
      apodo: '', nombreCompleto: null, rfc: null, telefono: null,
      email: null, procedencia: null, direccion: null, notas: null,
    };
    this.error.set('');
    this.saving.set(false);
    this.visible.set(true);
  }

  openForEdit(cliente: ClienteDetailDto): void {
    this.form = {
      apodo: cliente.apodo,
      nombreCompleto: cliente.nombreCompleto,
      rfc: cliente.rfc,
      telefono: cliente.telefono,
      email: cliente.email,
      procedencia: cliente.procedencia,
      direccion: cliente.direccion,
      notas: cliente.notas,
    };
    this.error.set('');
    this.saving.set(false);
    this.visible.set(true);
  }

  submit(): void {
    if (!this.form.apodo.trim()) {
      this.error.set('El apodo es obligatorio');
      return;
    }
    this.saving.set(true);
    this.error.set('');

    const obs = this.isEditing()
      ? this.service.update(this.cliente()!.id, this.form)
      : this.service.create(this.form);

    obs.subscribe({
      next: () => { this.saving.set(false); this.visible.set(false); this.saved.emit(); },
      error: (err) => { this.error.set(err.error?.message || 'Error al guardar cliente'); this.saving.set(false); },
    });
  }

  close(): void {
    this.visible.set(false);
  }
}
