import { Component, inject, signal, computed } from '@angular/core';
import { RolService, RolDto, PermisoDto } from '../../services/rol.service';

interface ModuloGroup {
  nombre: string;
  permisos: PermisoDto[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-5">
      <div>
        <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Administración</p>
        <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Roles y permisos</h1>
        <p class="mt-1 text-[13px] text-[#6B717F]">Configura qué puede ver y hacer cada rol en el sistema.</p>
      </div>

      @if (message()) {
        <div class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">{{ message() }}</div>
      }
      @if (error()) {
        <div class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando roles...</div>
      } @else {
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          @for (rol of roles(); track rol.id) {
            <div class="card-elevated rounded-2xl p-5">
              <div class="mb-3 flex items-start justify-between">
                <div>
                  <span class="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold tracking-wide"
                    [class]="rolClass(rol.nombre)">{{ rol.nombre }}</span>
                  @if (rol.esSistema) {
                    <span class="ml-2 text-[11px] text-[#8B93A1]">Sistema</span>
                  }
                </div>
                <span class="text-[12px] font-semibold text-[#8B93A1]">{{ rol.permisos.length }} permisos</span>
              </div>
              @if (rol.descripcion) {
                <p class="mb-3 text-[12px] text-[#6B717F]">{{ rol.descripcion }}</p>
              }

              <!-- Resumen de módulos -->
              <div class="mb-4 space-y-2">
                @for (mod of modulosOf(rol); track mod.nombre) {
                  <div>
                    <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">{{ mod.nombre }}</p>
                    <div class="flex flex-wrap gap-1">
                      @for (p of mod.permisos; track p.id) {
                        <span class="rounded-md bg-[#F0F2F5] px-2 py-0.5 text-[11px] text-[#374151]">{{ p.nombre }}</span>
                      }
                    </div>
                  </div>
                }
                @if (rol.permisos.length === 0) {
                  <p class="text-[12px] text-[#8B93A1] italic">Sin permisos asignados</p>
                }
              </div>

              @if (rol.nombre !== 'ADMIN') {
                <button (click)="openEdit(rol)"
                  class="w-full rounded-xl border border-[#D8DEE8] py-2 text-[13px] font-semibold hover:bg-[#F8FAFC] transition-colors">
                  Configurar permisos
                </button>
              } @else {
                <div class="rounded-xl bg-[#FEF3C7] px-3 py-2 text-[12px] text-[#92400E]">
                  El rol ADMIN siempre tiene acceso total — no se puede editar.
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Modal de edición de permisos -->
    @if (editingRol()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-6">
        <div class="w-full max-w-xl rounded-2xl bg-white shadow-2xl my-6">
          <div class="flex items-center justify-between border-b border-[#F0F2F5] px-6 py-4">
            <div>
              <h2 class="text-[18px] font-semibold">Permisos de
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ml-1" [class]="rolClass(editingRol()!.nombre)">{{ editingRol()!.nombre }}</span>
              </h2>
              <p class="mt-0.5 text-[12px] text-[#6B717F]">{{ editingRol()!.descripcion }}</p>
            </div>
            <button (click)="closeModal()" class="rounded-lg p-1.5 hover:bg-[#F3F4F6] text-[#6B717F]">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            @for (mod of todosModulos(); track mod.nombre) {
              <div>
                <div class="mb-2 flex items-center gap-2">
                  <p class="text-[11px] font-bold uppercase tracking-[0.8px] text-[#8B93A1]">{{ mod.nombre }}</p>
                  <button (click)="toggleModulo(mod)" class="text-[11px] text-[#6B717F] hover:text-[#0D1017] underline">
                    {{ moduloCompleto(mod) ? 'Quitar todos' : 'Marcar todos' }}
                  </button>
                </div>
                <div class="grid grid-cols-1 gap-1.5">
                  @for (p of mod.permisos; track p.id) {
                    <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[#F0F2F5] px-3 py-2 hover:bg-[#F8FAFC] transition-colors"
                      [class.border-[#BFDBFE]]="editSelection().has(p.id)"
                      [class.bg-[#EFF6FF]]="editSelection().has(p.id)">
                      <input type="checkbox" [checked]="editSelection().has(p.id)" (change)="togglePermiso(p.id)"
                        class="h-4 w-4 rounded accent-[#1E40AF]" />
                      <div>
                        <p class="text-[13px] font-semibold text-[#0D1017]">{{ p.nombre }}</p>
                        <p class="text-[11px] text-[#8B93A1] font-mono">{{ p.codigo }}</p>
                      </div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          <div class="flex items-center justify-between border-t border-[#F0F2F5] px-6 py-4">
            <span class="text-[12px] text-[#6B717F]">{{ editSelection().size }} permisos seleccionados</span>
            <div class="flex gap-2">
              <button (click)="closeModal()" class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[13px] font-semibold">Cancelar</button>
              <button (click)="savePermisos()" [disabled]="saving()"
                class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40">
                {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class RolesComponent {
  private service = inject(RolService);

  roles = signal<RolDto[]>([]);
  todosPermisos = signal<PermisoDto[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingRol = signal<RolDto | null>(null);
  editSelection = signal<Set<string>>(new Set());
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  todosModulos = computed<ModuloGroup[]>(() => {
    const map = new Map<string, PermisoDto[]>();
    for (const p of this.todosPermisos()) {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push(p);
    }
    return [...map.entries()].map(([nombre, permisos]) => ({ nombre, permisos }));
  });

  constructor() {
    this.service.getAll().subscribe({
      next: (list) => { this.roles.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.service.getAllPermisos().subscribe({
      next: (list) => this.todosPermisos.set(list),
    });
  }

  openEdit(rol: RolDto): void {
    this.editingRol.set(rol);
    this.editSelection.set(new Set(rol.permisos.map(p => p.id)));
    this.message.set(null);
    this.error.set(null);
  }

  closeModal(): void { this.editingRol.set(null); }

  togglePermiso(id: string): void {
    const s = new Set(this.editSelection());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.editSelection.set(s);
  }

  toggleModulo(mod: ModuloGroup): void {
    const s = new Set(this.editSelection());
    const completo = mod.permisos.every(p => s.has(p.id));
    if (completo) mod.permisos.forEach(p => s.delete(p.id));
    else mod.permisos.forEach(p => s.add(p.id));
    this.editSelection.set(s);
  }

  moduloCompleto(mod: ModuloGroup): boolean {
    return mod.permisos.every(p => this.editSelection().has(p.id));
  }

  savePermisos(): void {
    const rol = this.editingRol();
    if (!rol) return;
    this.saving.set(true);
    const ids = [...this.editSelection()];
    this.service.updatePermisos(rol.id, ids).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingRol.set(null);
        this.message.set(`Permisos de ${rol.nombre} actualizados.`);
        this.service.getAll().subscribe({ next: (list) => this.roles.set(list) });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Error al guardar los permisos.');
      },
    });
  }

  modulosOf(rol: RolDto): ModuloGroup[] {
    const map = new Map<string, PermisoDto[]>();
    for (const p of rol.permisos) {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push(p);
    }
    return [...map.entries()].map(([nombre, permisos]) => ({ nombre, permisos }));
  }

  rolClass(nombre: string): string {
    const map: Record<string, string> = {
      ADMIN: 'bg-[#FEE2E2] text-[#991B1B]',
      GERENTE: 'bg-[#FEF3C7] text-[#92400E]',
      OPERADOR: 'bg-[#DBEAFE] text-[#1E40AF]',
      CAPTURISTA: 'bg-[#E0E7FF] text-[#3730A3]',
      CAMPO: 'bg-[#D1FAE5] text-[#065F46]',
    };
    return map[nombre] ?? 'bg-[#F3F4F6] text-[#374151]';
  }
}
