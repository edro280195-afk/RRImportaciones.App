import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RolService, RolDto, PermisoDto } from '../../services/rol.service';
import { UsuarioService, UsuarioDto, CreateUsuarioRequest, UpdateUsuarioRequest } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';

type Categoria = 'SISTEMA' | 'OFICINA' | 'CAMPO';

const ROL_CATEGORIA: Record<string, Categoria> = {
  ADMIN: 'SISTEMA', GERENTE: 'SISTEMA',
  FACTURACION: 'OFICINA', COORDINADORA: 'OFICINA', CONTROL_TRAMITES: 'OFICINA',
  YARDERO: 'CAMPO', CHOFER: 'CAMPO',
};

const ROL_ETIQUETA: Record<string, string> = {
  CONTROL_TRAMITES: 'Control de Trámites',
  FACTURACION: 'Facturación',
  COORDINADORA: 'Coordinadora',
};

const CAT_CHIP: Record<Categoria, string> = {
  SISTEMA: 'bg-[#FAF5FF] text-[#6B21A8] ring-1 ring-inset ring-[#E9D5FF]',
  OFICINA: 'bg-[#EFF6FF] text-[#1E3A8A] ring-1 ring-inset ring-[#DBEAFE]',
  CAMPO:   'bg-[#F0FDF4] text-[#14532D] ring-1 ring-inset ring-[#BBF7D0]',
};

const CAT_DOT: Record<Categoria, string> = {
  SISTEMA: 'bg-[#A21CAF]',
  OFICINA: 'bg-[#1D4ED8]',
  CAMPO:   'bg-[#15803D]',
};

interface FiltroCategoria { key: 'TODOS' | Categoria; label: string; }

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <header class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="mb-1.5 text-[11px] font-medium uppercase tracking-[1.4px] text-[#8B93A1]">Administración</p>
        <h1 class="text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] text-[#0D1017]">Usuarios</h1>
        <p class="mt-1.5 max-w-[60ch] text-[13.5px] leading-[1.55] text-[#5B6473]">
          Cuentas con acceso al sistema. Todos los usuarios pueden acceder con contraseña o con PIN de 6 dígitos.
        </p>
      </div>
      @if (auth.can('USUARIOS_CREAR')) {
        <button (click)="openNew()" class="btn-primary inline-flex items-center gap-2 self-start md:self-end rounded-xl px-4 py-2.5 text-[13px] font-semibold">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4 stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Nuevo usuario
        </button>
      }
    </header>

    @if (message()) {
      <div class="mb-5 flex items-start gap-3 rounded-xl bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#14532D]">
        <span class="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]"></span>
        <p>{{ message() }}</p>
      </div>
    }
    @if (error()) {
      <div class="mb-5 flex items-start gap-3 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
        <span class="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#DC2626]"></span>
        <p>{{ error() }}</p>
      </div>
    }

    <!-- Strip de stats por categoría — no son tarjetas independientes, son un sumario en línea -->
    <div class="mb-4 flex flex-wrap items-center gap-x-7 gap-y-2 border-b border-[#EAEDF2] pb-4">
      @for (k of categorias; track k) {
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" [class]="CAT_DOT[k]"></span>
          <span class="text-[12.5px] font-medium text-[#5B6473]">{{ catLabel(k) }}</span>
          <span class="font-mono tabular-nums text-[14px] font-semibold text-[#0D1017]">{{ countByCategoria(k) }}</span>
        </div>
      }
      <span class="hidden sm:block text-[#D8DEE8]">·</span>
      <div class="flex items-center gap-2">
        <span class="text-[12.5px] text-[#8B93A1]">Inactivos</span>
        <span class="font-mono tabular-nums text-[14px] font-semibold text-[#0D1017]">{{ countInactivos() }}</span>
      </div>
    </div>

    <!-- Toolbar: filtros pill + búsqueda -->
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex items-center gap-1 rounded-xl bg-[#F4F6FA] p-1">
        @for (f of filtros; track f.key) {
          <button
            (click)="filtro.set(f.key)"
            class="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
            [class.bg-white]="filtro() === f.key"
            [class.shadow-sm]="filtro() === f.key"
            [class.text-[#0D1017]]="filtro() === f.key"
            [class.text-[#6B717F]]="filtro() !== f.key"
          >
            {{ f.label }}
            <span class="ml-1 font-mono tabular-nums text-[11px] text-[#9EA3AE]">{{ countByFiltro(f.key) }}</span>
          </button>
        }
      </div>
      <div class="relative w-full sm:max-w-[280px]">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9EA3AE] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
        <input
          type="text"
          [(ngModel)]="searchTerm"
          placeholder="Buscar por nombre, username o email…"
          class="w-full rounded-xl bg-white pl-9 pr-3 py-2 text-[13px] ring-1 ring-[#EAEDF2] placeholder:text-[#9EA3AE] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
        />
      </div>
    </div>

    @if (loading()) {
      <div class="py-16 text-center text-[13px] text-[#8B93A1]">Cargando usuarios…</div>
    } @else if (filteredUsuarios().length === 0) {
      <div class="rounded-2xl bg-white py-14 text-center ring-1 ring-[#EAEDF2]">
        <p class="text-[14px] font-semibold text-[#0D1017]">Sin resultados</p>
        <p class="mt-1 text-[12.5px] text-[#6B717F]">Ajusta el filtro o la búsqueda para ver más usuarios.</p>
      </div>
    } @else {
      <div class="overflow-hidden rounded-2xl bg-white ring-1 ring-[#EAEDF2]">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr class="border-b border-[#EAEDF2] bg-[#FAFBFC]">
                <th class="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#6B717F]">Persona</th>
                <th class="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#6B717F]">Rol</th>
                <th class="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#6B717F]">Estatus</th>
                <th class="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#6B717F]">Último acceso</th>
                <th class="w-32 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (u of filteredUsuarios(); track u.id) {
                <tr class="border-b border-[#F0F2F5] last:border-b-0 hover:bg-[#FAFBFC] transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" [class]="avatarBg(u.id)">
                        {{ initials(u) }}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-[#0D1017]">{{ u.nombre }} {{ u.apellidos }}</p>
                        <p class="truncate font-mono text-[11.5px] text-[#8B93A1]">
                          {{ u.username }}<span class="text-[#D8DEE8]"> · </span>{{ u.email || 'sin email' }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="inline-flex items-center gap-2">
                      <span class="h-1.5 w-1.5 rounded-full" [class]="CAT_DOT[categoriaOf(u.rolNombre)]"></span>
                      <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.2px]" [class]="CAT_CHIP[categoriaOf(u.rolNombre)]">
                        {{ etiqueta(u.rolNombre) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    @if (u.activo) {
                      <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#15803D]">
                        <span class="h-1.5 w-1.5 rounded-full bg-[#16A34A]"></span>
                        Activo
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280]">
                        <span class="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]"></span>
                        Inactivo
                      </span>
                    }
                  </td>
                  <td class="px-4 py-3 font-mono text-[11.5px] tabular-nums text-[#6B717F]">{{ formatDate(u.ultimoAcceso) }}</td>
                  <td class="px-4 py-3">
                    @if (auth.can('USUARIOS_EDITAR')) {
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          (click)="openPinModal(u)"
                          class="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#14532D] hover:bg-[#F0FDF4] transition-colors"
                          title="Establecer / Cambiar PIN"
                        >PIN</button>
                        <button
                          (click)="openEdit(u)"
                          class="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#0D1017] hover:bg-[#F0F2F5] transition-colors"
                        >Editar</button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- ─────── Drawer lateral para crear/editar ─────── -->
    @if (showModal()) {
      <div
        class="fixed inset-0 z-40 bg-[#0D1017]/30 transition-opacity duration-200 ease-out"
        [class.opacity-100]="drawerOpen()"
        [class.opacity-0]="!drawerOpen()"
        (click)="closeModal()"
      ></div>

      <aside
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col bg-white shadow-[-20px_0_50px_-20px_rgba(13,16,23,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        [class.translate-x-0]="drawerOpen()"
        [class.translate-x-full]="!drawerOpen()"
      >
        <header class="flex items-start justify-between gap-4 border-b border-[#F0F2F5] px-6 py-5">
          <div>
            <p class="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[1.3px] text-[#8B93A1]">
              {{ editingId() ? 'Editar usuario' : 'Nuevo usuario' }}
            </p>
            <h2 class="text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-[#0D1017]">
              {{ editingId() ? (form.nombre + ' ' + (form.apellidos || '')).trim() : 'Crear cuenta' }}
            </h2>
          </div>
          <button (click)="closeModal()" class="-mr-2 -mt-1 rounded-lg p-2 text-[#8B93A1] hover:bg-[#F3F4F6] hover:text-[#0D1017] transition-colors">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-5 w-5 stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div class="space-y-4">
            @if (!editingId()) {
              <div>
                <label class="label-field">Username</label>
                <input [(ngModel)]="form.username" class="input-field" placeholder="ej. juan.perez" />
                <p class="mt-1 text-[11.5px] text-[#9EA3AE]">Sin espacios. Se usa para iniciar sesión.</p>
              </div>
            }
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="label-field">Nombre</label>
                <input [(ngModel)]="form.nombre" class="input-field" />
              </div>
              <div>
                <label class="label-field">Apellidos</label>
                <input [(ngModel)]="form.apellidos" class="input-field" />
              </div>
            </div>
            <div>
              <label class="label-field">Email</label>
              <input [(ngModel)]="form.email" type="email" class="input-field" placeholder="opcional" />
            </div>
            <div>
              <label class="label-field">{{ editingId() ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña' }}</label>
              <input [(ngModel)]="form.password" type="password" class="input-field" [placeholder]="editingId() ? '••••••••' : 'Mínimo 6 caracteres'" />
            </div>

            <!-- Selector de rol agrupado por categoría -->
            <div>
              <label class="label-field">Rol</label>
              <div class="space-y-3">
                @for (cat of categorias; track cat) {
                  @if (rolesByCategoria(cat).length > 0) {
                    <div>
                      <div class="mb-1.5 flex items-center gap-2">
                        <span class="h-1.5 w-1.5 rounded-full" [class]="CAT_DOT[cat]"></span>
                        <span class="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#6B717F]">{{ catLabel(cat) }}</span>
                      </div>
                      <div class="grid grid-cols-1 gap-1.5">
                        @for (r of rolesByCategoria(cat); track r.id) {
                          <label
                            class="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#EAEDF2] transition-all duration-150 ease-out hover:ring-[#D8DEE8]"
                            [class.ring-2]="form.roleId === r.id"
                            [class.ring-[#1D4ED8]]="form.roleId === r.id"
                            [class.bg-[#F5F8FE]]="form.roleId === r.id"
                          >
                            <div class="flex items-center gap-3">
                              <input type="radio" name="roleId" [value]="r.id" [(ngModel)]="form.roleId" class="h-4 w-4 accent-[#1D4ED8]" />
                              <div>
                                <p class="text-[13px] font-semibold text-[#0D1017]">{{ etiqueta(r.nombre) }}</p>
                                @if (r.descripcion) {
                                  <p class="mt-0.5 text-[11.5px] text-[#6B717F] line-clamp-1">{{ r.descripcion }}</p>
                                }
                              </div>
                            </div>
                            <span class="shrink-0 font-mono tabular-nums text-[11px] text-[#9EA3AE]">{{ r.permisos.length }} permisos</span>
                          </label>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>

            <!-- Estatus -->
            <div>
              <label class="label-field">Estatus</label>
              <div class="inline-flex items-center gap-1 rounded-xl bg-[#F4F6FA] p-1">
                <button
                  type="button"
                  (click)="form.activo = true"
                  class="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
                  [class.bg-white]="form.activo"
                  [class.shadow-sm]="form.activo"
                  [class.text-[#15803D]]="form.activo"
                  [class.text-[#6B717F]]="!form.activo"
                >Activo</button>
                <button
                  type="button"
                  (click)="form.activo = false"
                  class="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
                  [class.bg-white]="!form.activo"
                  [class.shadow-sm]="!form.activo"
                  [class.text-[#991B1B]]="!form.activo"
                  [class.text-[#6B717F]]="form.activo"
                >Inactivo</button>
              </div>
            </div>

            <!-- Preview de permisos -->
            @if (selectedRoleInfo(); as rol) {
              <div class="rounded-xl bg-[#FAFBFC] p-4 ring-1 ring-[#EAEDF2]">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="h-1.5 w-1.5 rounded-full" [class]="CAT_DOT[categoriaOf(rol.nombre)]"></span>
                    <p class="text-[12px] font-semibold text-[#0D1017]">{{ etiqueta(rol.nombre) }}</p>
                    <span class="text-[11px] text-[#9EA3AE]">· {{ rol.permisos.length }} permisos</span>
                  </div>
                  @if (auth.isAdmin()) {
                    <a routerLink="/roles" class="text-[11.5px] font-semibold text-[#1D4ED8] hover:text-[#1E3A8A] transition-colors">Editar rol →</a>
                  }
                </div>
                @if (rol.permisos.length === 0) {
                  <p class="text-[12px] italic text-[#9EA3AE]">Sin permisos asignados.</p>
                } @else {
                  <div class="space-y-2.5">
                    @for (mod of modulosDelRol(rol); track mod.nombre) {
                      <div>
                        <p class="text-[10.5px] font-bold uppercase tracking-[0.8px] text-[#6B717F] mb-1">{{ mod.nombre }}</p>
                        <div class="flex flex-wrap gap-1">
                          @for (p of mod.permisos; track p.id) {
                            <span class="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#374151] ring-1 ring-[#EAEDF2]">{{ p.nombre }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else if (!form.roleId) {
              <div class="rounded-xl bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#854D0E]">
                Selecciona un rol para ver qué podrá hacer este usuario.
              </div>
            }
          </div>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-[#F0F2F5] bg-[#FAFBFC] px-6 py-4">
          <button (click)="closeModal()" class="rounded-xl px-4 py-2 text-[13px] font-semibold text-[#0D1017] hover:bg-[#F0F2F5] transition-colors">Cancelar</button>
          <button (click)="save()" [disabled]="saving()" class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40">
            {{ saving() ? 'Guardando…' : 'Guardar' }}
          </button>
        </footer>
      </aside>
    }

    <!-- ─────── Drawer para PIN ─────── -->
    @if (showPinModal()) {
      <div
        class="fixed inset-0 z-40 bg-[#0D1017]/30 transition-opacity duration-200 ease-out"
        [class.opacity-100]="pinDrawerOpen()"
        [class.opacity-0]="!pinDrawerOpen()"
        (click)="closePinModal()"
      ></div>

      <aside
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-white shadow-[-20px_0_50px_-20px_rgba(13,16,23,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        [class.translate-x-0]="pinDrawerOpen()"
        [class.translate-x-full]="!pinDrawerOpen()"
      >
        <header class="flex items-start justify-between gap-4 border-b border-[#F0F2F5] px-6 py-5">
          <div>
            <p class="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[1.3px] text-[#14532D]">Acceso por PIN</p>
            <h2 class="text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-[#0D1017]">{{ pinUserName() }}</h2>
            <p class="mt-1.5 text-[12.5px] leading-snug text-[#5B6473]">
              Define un PIN de 6 dígitos. Lo usará para entrar al módulo de campo desde el celular.
            </p>
          </div>
          <button (click)="closePinModal()" class="-mr-2 -mt-1 rounded-lg p-2 text-[#8B93A1] hover:bg-[#F3F4F6] hover:text-[#0D1017] transition-colors">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-5 w-5 stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-6 py-5">
          @if (pinModalError()) {
            <div class="mb-4 rounded-xl bg-[#FEF2F2] px-4 py-3 text-[12.5px] text-[#991B1B]">{{ pinModalError() }}</div>
          }
          <label class="label-field">PIN nuevo</label>
          <input
            [(ngModel)]="newPin"
            type="text"
            pattern="[0-9]*"
            inputmode="numeric"
            maxlength="6"
            class="input-field text-center font-mono text-[26px] tracking-[10px]"
            placeholder="••••••"
            (keypress)="onlyNumbers($event)"
          />
          <p class="mt-2 text-[11.5px] text-[#9EA3AE]">Solo números. Se almacena cifrado.</p>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-[#F0F2F5] bg-[#FAFBFC] px-6 py-4">
          <button (click)="closePinModal()" class="rounded-xl px-4 py-2 text-[13px] font-semibold text-[#0D1017] hover:bg-[#F0F2F5] transition-colors">Cancelar</button>
          <button (click)="savePin()" [disabled]="savingPin() || newPin.length !== 6" class="btn-primary rounded-xl px-5 py-2 text-[13px] disabled:opacity-40">
            {{ savingPin() ? 'Guardando…' : 'Guardar PIN' }}
          </button>
        </footer>
      </aside>
    }
  `,
})
export class UsuariosComponent {
  private service = inject(UsuarioService);
  private rolService = inject(RolService);
  auth = inject(AuthService);

  readonly CAT_CHIP = CAT_CHIP;
  readonly CAT_DOT = CAT_DOT;

  filtros: FiltroCategoria[] = [
    { key: 'TODOS',   label: 'Todos' },
    { key: 'SISTEMA', label: 'Sistema' },
    { key: 'OFICINA', label: 'Oficina' },
    { key: 'CAMPO',   label: 'Campo' },
  ];

  readonly categorias: Categoria[] = ['SISTEMA', 'OFICINA', 'CAMPO'];

  usuarios = signal<UsuarioDto[]>([]);
  roles = signal<RolDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  drawerOpen = signal(false);
  editingId = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  filtro = signal<'TODOS' | Categoria>('TODOS');
  searchTerm = '';

  // PIN
  showPinModal = signal(false);
  pinDrawerOpen = signal(false);
  pinUserId = signal<string | null>(null);
  pinUserName = signal<string>('');
  newPin = '';
  pinModalError = signal<string | null>(null);
  savingPin = signal(false);

  form: any = this.emptyForm();

  filteredUsuarios = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    const cat = this.filtro();
    return this.usuarios().filter(u => {
      if (cat !== 'TODOS' && ROL_CATEGORIA[u.rolNombre] !== cat) return false;
      if (!term) return true;
      const haystack = `${u.nombre} ${u.apellidos ?? ''} ${u.username} ${u.email ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  });

  categoriaOf(rolNombre: string): Categoria {
    return ROL_CATEGORIA[rolNombre] ?? 'SISTEMA';
  }

  etiqueta(nombre: string): string {
    return ROL_ETIQUETA[nombre] ?? nombre;
  }

  catLabel(key: Categoria): string {
    return ({ SISTEMA: 'Sistema', OFICINA: 'Oficina', CAMPO: 'Campo' } as Record<Categoria, string>)[key];
  }

  countByCategoria(cat: Categoria): number {
    return this.usuarios().filter(u => u.activo && ROL_CATEGORIA[u.rolNombre] === cat).length;
  }

  countByFiltro(key: 'TODOS' | Categoria): number {
    if (key === 'TODOS') return this.usuarios().length;
    return this.usuarios().filter(u => ROL_CATEGORIA[u.rolNombre] === key).length;
  }

  countInactivos(): number {
    return this.usuarios().filter(u => !u.activo).length;
  }

  rolesByCategoria(cat: Categoria): RolDto[] {
    return this.roles().filter(r => ROL_CATEGORIA[r.nombre] === cat);
  }

  /** ¿El rol referido tiene el permiso CAMPO_USAR? (Para mostrar el botón PIN.) */
  rolUsaCampo(rolNombre: string): boolean {
    const rol = this.roles().find(r => r.nombre === rolNombre);
    return !!rol?.permisos.some(p => p.codigo === 'CAMPO_USAR');
  }

  selectedRoleInfo(): RolDto | null {
    const id = this.form?.roleId;
    if (!id) return null;
    return this.roles().find(r => r.id === id) ?? null;
  }

  constructor() {
    this.load();
    this.rolService.getAll().subscribe({ next: (r) => this.roles.set(r) });
  }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (list) => { this.usuarios.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('No se pudieron cargar los usuarios.'); },
    });
  }

  openNew(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.message.set(null);
    this.error.set(null);
    this.showModal.set(true);
    queueMicrotask(() => this.drawerOpen.set(true));
  }

  openEdit(u: UsuarioDto): void {
    this.editingId.set(u.id);
    this.form = { nombre: u.nombre, apellidos: u.apellidos ?? '', email: u.email ?? '', roleId: u.roleId, activo: u.activo, password: '', username: u.username };
    this.message.set(null);
    this.error.set(null);
    this.showModal.set(true);
    queueMicrotask(() => this.drawerOpen.set(true));
  }

  closeModal(): void {
    this.drawerOpen.set(false);
    setTimeout(() => this.showModal.set(false), 220);
  }

  openPinModal(u: UsuarioDto): void {
    this.pinUserId.set(u.id);
    this.pinUserName.set(`${u.nombre} ${u.apellidos || ''}`.trim());
    this.newPin = '';
    this.pinModalError.set(null);
    this.showPinModal.set(true);
    queueMicrotask(() => this.pinDrawerOpen.set(true));
  }

  closePinModal(): void {
    this.pinDrawerOpen.set(false);
    setTimeout(() => this.showPinModal.set(false), 220);
  }

  onlyNumbers(event: any): boolean {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  savePin(): void {
    const id = this.pinUserId();
    if (!id || this.newPin.length !== 6) return;
    this.savingPin.set(true);
    this.pinModalError.set(null);

    this.service.setPin(id, this.newPin).subscribe({
      next: () => {
        this.savingPin.set(false);
        this.closePinModal();
        this.message.set(`PIN para ${this.pinUserName()} establecido con éxito.`);
        setTimeout(() => this.message.set(null), 5000);
      },
      error: (err) => {
        this.savingPin.set(false);
        this.pinModalError.set(err?.error?.message || 'No se pudo guardar el PIN.');
      }
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    const id = this.editingId();

    const obs = id
      ? this.service.update(id, {
          nombre: this.form.nombre,
          apellidos: this.form.apellidos || undefined,
          email: this.form.email || undefined,
          roleId: this.form.roleId,
          activo: this.form.activo,
          nuevoPassword: this.form.password || undefined,
        } as UpdateUsuarioRequest)
      : this.service.create({
          username: this.form.username,
          nombre: this.form.nombre,
          apellidos: this.form.apellidos || undefined,
          email: this.form.email || undefined,
          password: this.form.password,
          roleId: this.form.roleId,
          activo: this.form.activo,
        } as CreateUsuarioRequest);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.message.set('Usuario guardado correctamente.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'No se pudo guardar el usuario.');
      },
    });
  }

  modulosDelRol(rol: RolDto): { nombre: string; permisos: PermisoDto[] }[] {
    const map = new Map<string, PermisoDto[]>();
    for (const p of rol.permisos) {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push(p);
    }
    return [...map.entries()]
      .map(([nombre, permisos]) => ({ nombre, permisos }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /** Color de avatar — derivado del id para que sea consistente por persona */
  avatarBg(id: string): string {
    const palette = ['bg-[#1D4ED8]', 'bg-[#15803D]', 'bg-[#A21CAF]', 'bg-[#B45309]', 'bg-[#0F766E]', 'bg-[#4338CA]', 'bg-[#9F1239]'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  initials(u: UsuarioDto): string {
    const a = (u.nombre?.[0] ?? '').toUpperCase();
    const b = (u.apellidos?.[0] ?? '').toUpperCase();
    return (a + b) || u.username.slice(0, 2).toUpperCase();
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private emptyForm() {
    return { username: '', nombre: '', apellidos: '', email: '', password: '', roleId: '', activo: true };
  }
}
