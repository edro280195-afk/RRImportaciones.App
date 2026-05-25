import { Component, inject, signal, computed } from '@angular/core';
import { RolService, RolDto, PermisoDto } from '../../services/rol.service';
import { UsuarioService, UsuarioDto } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';

interface ModuloGroup {
  nombre: string;
  permisos: PermisoDto[];
}

type Categoria = 'SISTEMA' | 'OFICINA' | 'CAMPO';

interface CategoriaConfig {
  key: Categoria;
  titulo: string;
  resumen: string;
  // Acento — usado como punto/halo, NO como side-stripe.
  dotClass: string;
  haloClass: string;
  chipClass: string;
}

const CATEGORIAS: Record<Categoria, CategoriaConfig> = {
  SISTEMA: {
    key: 'SISTEMA',
    titulo: 'Sistema',
    resumen: 'Acceso global y supervisión. Roles núcleo que no se eliminan.',
    dotClass: 'bg-[#A21CAF]',
    haloClass: 'ring-[#A21CAF]/15',
    chipClass: 'bg-[#FAF5FF] text-[#6B21A8] ring-1 ring-inset ring-[#E9D5FF]',
  },
  OFICINA: {
    key: 'OFICINA',
    titulo: 'Oficina',
    resumen: 'Cotizaciones, clientes, pagos y seguimiento administrativo.',
    dotClass: 'bg-[#1D4ED8]',
    haloClass: 'ring-[#1D4ED8]/15',
    chipClass: 'bg-[#EFF6FF] text-[#1E3A8A] ring-1 ring-inset ring-[#DBEAFE]',
  },
  CAMPO: {
    key: 'CAMPO',
    titulo: 'Campo',
    resumen: 'Yarderos y choferes — fotos, maniobras y entregas con acceso móvil por PIN.',
    dotClass: 'bg-[#15803D]',
    haloClass: 'ring-[#15803D]/15',
    chipClass: 'bg-[#F0FDF4] text-[#14532D] ring-1 ring-inset ring-[#BBF7D0]',
  },
};

const ROL_CATEGORIA: Record<string, Categoria> = {
  ADMIN: 'SISTEMA',
  GERENTE: 'SISTEMA',
  FACTURACION: 'OFICINA',
  COORDINADORA: 'OFICINA',
  CONTROL_TRAMITES: 'OFICINA',
  YARDERO: 'CAMPO',
  CHOFER: 'CAMPO',
};

const ROL_ETIQUETA: Record<string, string> = {
  CONTROL_TRAMITES: 'Control de Trámites',
  FACTURACION: 'Facturación',
  COORDINADORA: 'Coordinadora',
};

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [],
  template: `
    <!-- Encabezado: sin caja, jerarquía por escala/peso -->
    <header class="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="mb-1.5 text-[11px] font-medium uppercase tracking-[1.4px] text-[#8B93A1]">
          Administración
        </p>
        <h1 class="text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] text-[#0D1017]">
          Roles y permisos
        </h1>
        <p class="mt-1.5 max-w-[58ch] text-[13.5px] leading-[1.55] text-[#5B6473]">
          Cada categoría agrupa roles con un propósito común. Selecciona uno para revisar o ajustar
          exactamente qué puede ver y hacer.
        </p>
      </div>
      <div class="hidden md:flex items-center gap-4 text-[12px] text-[#6B717F]">
        <span class="font-mono tabular-nums text-[#0D1017] text-[15px] font-semibold">{{
          roles().length
        }}</span>
        <span>roles activos</span>
        <span class="text-[#D8DEE8]">·</span>
        <span class="font-mono tabular-nums text-[#0D1017] text-[15px] font-semibold">{{
          usuarios().length
        }}</span>
        <span>usuarios asignados</span>
      </div>
    </header>

    @if (message()) {
      <div
        class="mb-5 flex items-start gap-3 rounded-xl bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#14532D]"
      >
        <span class="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]"></span>
        <p>{{ message() }}</p>
      </div>
    }
    @if (error()) {
      <div
        class="mb-5 flex items-start gap-3 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]"
      >
        <span class="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#DC2626]"></span>
        <p>{{ error() }}</p>
      </div>
    }

    @if (loading()) {
      <div class="py-16 text-center text-[13px] text-[#8B93A1]">Cargando roles…</div>
    } @else {
      <!-- Spacing variado entre categorías: la primera más comprimida, las siguientes con más aire -->
      @for (cat of categoriasOrdenadas(); track cat.key; let first = $first) {
        <section [class.mt-10]="!first" [class.mt-2]="first">
          <div class="mb-4 flex items-baseline gap-3">
            <span class="h-2 w-2 rounded-full" [class]="cat.dotClass"></span>
            <h2 class="text-[14px] font-semibold tracking-[-0.005em] text-[#0D1017]">
              {{ cat.titulo }}
            </h2>
            <p class="hidden sm:block text-[12.5px] text-[#8B93A1] leading-snug">
              {{ cat.resumen }}
            </p>
            <span class="ml-auto text-[11px] font-mono tabular-nums text-[#8B93A1]">{{
              rolesPorCategoria(cat.key).length
            }}</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (rol of rolesPorCategoria(cat.key); track rol.id) {
              <button
                (click)="select(rol)"
                class="group flex flex-col gap-4 rounded-2xl bg-white p-5 text-left ring-1 ring-[#EAEDF2] transition-all duration-200 ease-out hover:ring-2 hover:ring-offset-0"
                [class]="cat.haloClass + ' hover:' + cat.haloClass.replace('/15', '/35')"
                [class.ring-2]="selectedRol()?.id === rol.id"
                [class.ring-offset-2]="selectedRol()?.id === rol.id"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div
                      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.2px]"
                      [class]="cat.chipClass"
                    >
                      {{ etiqueta(rol.nombre) }}
                    </div>
                    @if (rol.descripcion) {
                      <p class="mt-2.5 text-[12.5px] leading-[1.5] text-[#5B6473] line-clamp-2">
                        {{ rol.descripcion }}
                      </p>
                    }
                  </div>
                  <span
                    class="shrink-0 text-[#C7CDD6] transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-[#6B717F]"
                  >
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>

                <!-- Stats — fila tabular, sin tarjetas anidadas -->
                <dl class="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <dt class="text-[10.5px] font-medium uppercase tracking-[0.7px] text-[#9EA3AE]">
                      Usuarios
                    </dt>
                    <dd
                      class="mt-0.5 font-mono tabular-nums text-[19px] font-semibold leading-none text-[#0D1017]"
                    >
                      {{ usuariosCount(rol.id) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-[10.5px] font-medium uppercase tracking-[0.7px] text-[#9EA3AE]">
                      Permisos
                    </dt>
                    <dd
                      class="mt-0.5 font-mono tabular-nums text-[19px] font-semibold leading-none text-[#0D1017]"
                    >
                      {{ rol.permisos.length }}
                    </dd>
                  </div>
                </dl>

                <!-- Módulos cubiertos como secuencia inline, no como nube caótica -->
                @if (rol.permisos.length > 0) {
                  <div class="flex flex-wrap items-center gap-1">
                    @for (mod of modulosOf(rol); track mod.nombre) {
                      <span
                        class="rounded-md bg-[#F4F6FA] px-1.5 py-0.5 text-[10.5px] font-medium text-[#4B5563]"
                      >
                        {{ mod.nombre }}
                      </span>
                    }
                  </div>
                } @else {
                  <p class="text-[12px] italic text-[#9EA3AE]">Sin permisos asignados</p>
                }

                @if (rol.esSistema) {
                  <p class="-mb-1 text-[10.5px] uppercase tracking-[0.8px] text-[#9EA3AE]">
                    Rol de sistema
                  </p>
                }
              </button>
            }
          </div>
        </section>
      }
    }

    <!-- ─────── Drawer lateral para editar permisos ─────── -->
    @if (selectedRol(); as rol) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40 bg-[#0D1017]/30 transition-opacity duration-200 ease-out"
        [class.opacity-100]="drawerOpen()"
        [class.opacity-0]="!drawerOpen()"
        (click)="close()"
      ></div>

      <!-- Panel -->
      <aside
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-white shadow-[-20px_0_50px_-20px_rgba(13,16,23,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        [class.translate-x-0]="drawerOpen()"
        [class.translate-x-full]="!drawerOpen()"
      >
        <!-- Header del drawer -->
        <header class="flex items-start justify-between gap-4 border-b border-[#F0F2F5] px-6 py-5">
          <div class="min-w-0">
            <p
              class="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[1.3px]"
              [class]="catTextOf(rol.nombre)"
            >
              {{ CATEGORIAS[ROL_CATEGORIA[rol.nombre]].titulo }}
            </p>
            <h2 class="text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-[#0D1017]">
              {{ etiqueta(rol.nombre) }}
            </h2>
            @if (rol.descripcion) {
              <p class="mt-1.5 max-w-[40ch] text-[13px] leading-snug text-[#5B6473]">
                {{ rol.descripcion }}
              </p>
            }
          </div>
          <button
            (click)="close()"
            class="-mr-2 -mt-1 rounded-lg p-2 text-[#8B93A1] hover:bg-[#F3F4F6] hover:text-[#0D1017] transition-colors"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              class="h-5 w-5 stroke-2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- Stats del drawer -->
        <div class="grid grid-cols-3 gap-0 border-b border-[#F0F2F5] px-6 py-4">
          <div>
            <p class="text-[10.5px] font-medium uppercase tracking-[0.7px] text-[#9EA3AE]">
              Seleccionados
            </p>
            <p
              class="mt-1 font-mono tabular-nums text-[20px] font-semibold leading-none text-[#0D1017]"
            >
              {{ editSelection().size }}
            </p>
          </div>
          <div>
            <p class="text-[10.5px] font-medium uppercase tracking-[0.7px] text-[#9EA3AE]">
              Disponibles
            </p>
            <p
              class="mt-1 font-mono tabular-nums text-[20px] font-semibold leading-none text-[#0D1017]"
            >
              {{ todosPermisos().length }}
            </p>
          </div>
          <div>
            <p class="text-[10.5px] font-medium uppercase tracking-[0.7px] text-[#9EA3AE]">
              Usuarios
            </p>
            <p
              class="mt-1 font-mono tabular-nums text-[20px] font-semibold leading-none text-[#0D1017]"
            >
              {{ usuariosCount(rol.id) }}
            </p>
          </div>
        </div>

        @if (rol.nombre === 'ADMIN') {
          <div
            class="m-6 rounded-xl bg-[#FFFBEB] px-4 py-3.5 text-[12.5px] leading-snug text-[#854D0E]"
          >
            El rol ADMIN tiene acceso total al sistema por diseño. Sus permisos no son editables.
          </div>
        }

        <!-- Lista de módulos / permisos -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div class="space-y-7">
            @for (mod of todosModulos(); track mod.nombre) {
              <fieldset [disabled]="rol.nombre === 'ADMIN'">
                <div class="mb-2.5 flex items-center justify-between">
                  <div class="flex items-baseline gap-2.5">
                    <legend class="text-[11px] font-bold uppercase tracking-[1px] text-[#0D1017]">
                      {{ mod.nombre }}
                    </legend>
                    <span class="text-[11px] font-mono tabular-nums text-[#9EA3AE]"
                      >{{ countSelectedInModulo(mod) }}/{{ mod.permisos.length }}</span
                    >
                  </div>
                  @if (rol.nombre !== 'ADMIN') {
                    <button
                      type="button"
                      (click)="toggleModulo(mod)"
                      class="text-[11.5px] font-medium text-[#1D4ED8] hover:text-[#1E3A8A] transition-colors"
                    >
                      {{ moduloCompleto(mod) ? 'Quitar todos' : 'Marcar todos' }}
                    </button>
                  }
                </div>
                <div class="space-y-1.5">
                  @for (p of mod.permisos; track p.id) {
                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#EAEDF2] transition-all duration-150 ease-out hover:ring-[#D8DEE8]"
                      [class.ring-[#BFDBFE]]="editSelection().has(p.id)"
                      [class.bg-[#F5F8FE]]="editSelection().has(p.id)"
                      [class.cursor-not-allowed]="rol.nombre === 'ADMIN'"
                      [class.opacity-60]="rol.nombre === 'ADMIN'"
                    >
                      <input
                        type="checkbox"
                        class="mt-[3px] h-4 w-4 shrink-0 rounded accent-[#1D4ED8]"
                        [checked]="editSelection().has(p.id) || rol.nombre === 'ADMIN'"
                        (change)="togglePermiso(p.id)"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="text-[13px] font-semibold leading-tight text-[#0D1017]">
                          {{ p.nombre }}
                        </p>
                        <p class="mt-0.5 font-mono text-[10.5px] tracking-[0.2px] text-[#8B93A1]">
                          {{ p.codigo }}
                        </p>
                      </div>
                    </label>
                  }
                </div>
              </fieldset>
            }
          </div>
        </div>

        @if (rol.nombre !== 'ADMIN') {
          <footer
            class="flex items-center justify-end gap-2 border-t border-[#F0F2F5] bg-[#FAFBFC] px-6 py-4"
          >
            <button
              (click)="close()"
              class="rounded-xl px-4 py-2 text-[13px] font-semibold text-[#0D1017] hover:bg-[#F0F2F5] transition-colors"
            >
              Cancelar
            </button>
            <button
              (click)="save()"
              [disabled]="saving() || !hasChanges()"
              class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {{ saving() ? 'Guardando…' : hasChanges() ? 'Guardar cambios' : 'Sin cambios' }}
            </button>
          </footer>
        }
      </aside>
    }
  `,
})
export class RolesComponent {
  private rolService = inject(RolService);
  private usuarioService = inject(UsuarioService);
  auth = inject(AuthService);

  readonly CATEGORIAS = CATEGORIAS;
  readonly ROL_CATEGORIA = ROL_CATEGORIA;

  roles = signal<RolDto[]>([]);
  usuarios = signal<UsuarioDto[]>([]);
  todosPermisos = signal<PermisoDto[]>([]);
  loading = signal(true);
  saving = signal(false);

  selectedRol = signal<RolDto | null>(null);
  drawerOpen = signal(false);
  editSelection = signal<Set<string>>(new Set());
  originalSelection = signal<Set<string>>(new Set());

  message = signal<string | null>(null);
  error = signal<string | null>(null);

  todosModulos = computed<ModuloGroup[]>(() => groupByModulo(this.todosPermisos()));

  categoriasOrdenadas(): CategoriaConfig[] {
    return [CATEGORIAS.SISTEMA, CATEGORIAS.OFICINA, CATEGORIAS.CAMPO];
  }

  rolesPorCategoria(cat: Categoria): RolDto[] {
    return this.roles().filter(r => ROL_CATEGORIA[r.nombre] === cat);
  }

  usuariosCount(rolId: string): number {
    return this.usuarios().filter(u => u.roleId === rolId && u.activo).length;
  }

  etiqueta(nombre: string): string {
    return ROL_ETIQUETA[nombre] ?? nombre;
  }

  catTextOf(nombre: string): string {
    const cat = ROL_CATEGORIA[nombre];
    if (cat === 'OFICINA') return 'text-[#1D4ED8]';
    if (cat === 'CAMPO') return 'text-[#15803D]';
    return 'text-[#A21CAF]';
  }

  modulosOf(rol: RolDto): ModuloGroup[] {
    return groupByModulo(rol.permisos);
  }

  constructor() {
    this.rolService.getAll().subscribe({
      next: list => {
        this.roles.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.rolService.getAllPermisos().subscribe({
      next: list => this.todosPermisos.set(list),
    });
    this.usuarioService.getAll().subscribe({
      next: list => this.usuarios.set(list),
      error: () => {
        /* opcional, sólo afecta conteos */
      },
    });
  }

  select(rol: RolDto): void {
    this.selectedRol.set(rol);
    const initial = new Set(rol.permisos.map(p => p.id));
    this.editSelection.set(initial);
    this.originalSelection.set(new Set(initial));
    this.message.set(null);
    this.error.set(null);
    // Trigger transición tras el primer pintado
    queueMicrotask(() => this.drawerOpen.set(true));
  }

  close(): void {
    this.drawerOpen.set(false);
    setTimeout(() => this.selectedRol.set(null), 220);
  }

  togglePermiso(id: string): void {
    const rol = this.selectedRol();
    if (!rol || rol.nombre === 'ADMIN') return;
    const s = new Set(this.editSelection());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.editSelection.set(s);
  }

  toggleModulo(mod: ModuloGroup): void {
    const rol = this.selectedRol();
    if (!rol || rol.nombre === 'ADMIN') return;
    const s = new Set(this.editSelection());
    const completo = mod.permisos.every(p => s.has(p.id));
    if (completo) mod.permisos.forEach(p => s.delete(p.id));
    else mod.permisos.forEach(p => s.add(p.id));
    this.editSelection.set(s);
  }

  moduloCompleto(mod: ModuloGroup): boolean {
    return mod.permisos.every(p => this.editSelection().has(p.id));
  }

  countSelectedInModulo(mod: ModuloGroup): number {
    return mod.permisos.filter(p => this.editSelection().has(p.id)).length;
  }

  hasChanges(): boolean {
    const a = this.editSelection();
    const b = this.originalSelection();
    if (a.size !== b.size) return true;
    for (const id of a) if (!b.has(id)) return true;
    return false;
  }

  save(): void {
    const rol = this.selectedRol();
    if (!rol || !this.hasChanges()) return;
    this.saving.set(true);
    const ids = [...this.editSelection()];
    this.rolService.updatePermisos(rol.id, ids).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(`Permisos de ${this.etiqueta(rol.nombre)} actualizados.`);
        this.rolService.getAll().subscribe({
          next: list => {
            this.roles.set(list);
            const fresh = list.find(r => r.id === rol.id);
            if (fresh) {
              this.selectedRol.set(fresh);
              this.originalSelection.set(new Set(fresh.permisos.map(p => p.id)));
            }
          },
        });
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'No se pudieron guardar los permisos.');
      },
    });
  }
}

function groupByModulo(permisos: PermisoDto[]): ModuloGroup[] {
  const map = new Map<string, PermisoDto[]>();
  for (const p of permisos) {
    if (!map.has(p.modulo)) map.set(p.modulo, []);
    map.get(p.modulo)!.push(p);
  }
  return [...map.entries()]
    .map(([nombre, permisos]) => ({ nombre, permisos }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
