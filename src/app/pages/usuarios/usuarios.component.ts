import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolService, RolDto } from '../../services/rol.service';
import { UsuarioService, UsuarioDto, CreateUsuarioRequest, UpdateUsuarioRequest } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Administración</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Usuarios</h1>
          <p class="mt-1 text-[13px] text-[#6B717F]">Administra cuentas de acceso. Los usuarios con rol de campo son quienes toman fotos y tareas en yarda.</p>
        </div>
        @if (auth.can('USUARIOS_CREAR')) {
          <button (click)="openNew()" class="btn-primary rounded-xl px-4 py-2 text-[13px]">+ Nuevo usuario</button>
        }
      </div>

      @if (message()) {
        <div class="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#166534]">{{ message() }}</div>
      }
      @if (error()) {
        <div class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">{{ error() }}</div>
      }

      <!-- Tabla -->
      <div class="card-elevated overflow-hidden rounded-2xl">
        @if (loading()) {
          <div class="p-10 text-center text-[13px] text-[#8B93A1]">Cargando usuarios...</div>
        } @else {
          <table class="w-full text-[13px]">
            <thead>
              <tr class="border-b border-[#F0F2F5] bg-[#F8FAFC]">
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Nombre</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Usuario</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Email</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Rol</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Estatus</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Último acceso</th>
                <th class="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                  <td class="px-4 py-3 font-medium text-[#0D1017]">{{ u.nombre }} {{ u.apellidos }}</td>
                  <td class="px-4 py-3 font-mono text-[12px] text-[#6B717F]">{{ u.username }}</td>
                  <td class="px-4 py-3 text-[#6B717F]">{{ u.email || '—' }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      [class]="rolClass(u.rolNombre)">{{ u.rolNombre }}</span>
                  </td>
                  <td class="px-4 py-3">
                    @if (u.activo) {
                      <span class="inline-flex items-center rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">Activo</span>
                    } @else {
                      <span class="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">Inactivo</span>
                    }
                  </td>
                  <td class="px-4 py-3 font-mono text-[12px] text-[#8B93A1]">{{ formatDate(u.ultimoAcceso) }}</td>
                  @if (auth.can('USUARIOS_EDITAR')) {
                    <td class="px-4 py-3">
                      <button (click)="openEdit(u)" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors">Editar</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 class="mb-4 text-[18px] font-semibold text-[#0D1017]">
              {{ editingId() ? 'Editar usuario' : 'Nuevo usuario' }}
            </h2>

            <div class="space-y-4">
              @if (!editingId()) {
                <div>
                  <label class="label-field">Username</label>
                  <input [(ngModel)]="form.username" class="input-field" placeholder="ej. juan.perez" />
                </div>
              }
              <div class="grid grid-cols-2 gap-3">
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
                <input [(ngModel)]="form.email" type="email" class="input-field" />
              </div>
              <div>
                <label class="label-field">{{ editingId() ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña' }}</label>
                <input [(ngModel)]="form.password" type="password" class="input-field" [placeholder]="editingId() ? '••••••••' : 'Mínimo 6 caracteres'" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label-field">Rol</label>
                  <select [(ngModel)]="form.roleId" class="input-field">
                    <option value="">— seleccionar —</option>
                    @for (r of roles(); track r.id) {
                      <option [value]="r.id">{{ r.nombre }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label-field">Estatus</label>
                  <select [(ngModel)]="form.activo" class="input-field">
                    <option [ngValue]="true">Activo</option>
                    <option [ngValue]="false">Inactivo</option>
                  </select>
                </div>
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
export class UsuariosComponent {
  private service = inject(UsuarioService);
  private rolService = inject(RolService);
  auth = inject(AuthService);

  usuarios = signal<UsuarioDto[]>([]);
  roles = signal<RolDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  form: any = this.emptyForm();

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
  }

  openEdit(u: UsuarioDto): void {
    this.editingId.set(u.id);
    this.form = { nombre: u.nombre, apellidos: u.apellidos ?? '', email: u.email ?? '', roleId: u.roleId, activo: u.activo, password: '', username: u.username };
    this.message.set(null);
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

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
        this.showModal.set(false);
        this.message.set('Usuario guardado correctamente.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'No se pudo guardar el usuario.');
      },
    });
  }

  rolClass(rol: string): string {
    const map: Record<string, string> = {
      ADMIN: 'bg-[#FEE2E2] text-[#991B1B]',
      GERENTE: 'bg-[#FEF3C7] text-[#92400E]',
      OPERADOR: 'bg-[#DBEAFE] text-[#1E40AF]',
      CAPTURISTA: 'bg-[#E0E7FF] text-[#3730A3]',
      CAMPO: 'bg-[#D1FAE5] text-[#065F46]',
    };
    return map[rol] ?? 'bg-[#F3F4F6] text-[#374151]';
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private emptyForm() {
    return { username: '', nombre: '', apellidos: '', email: '', password: '', roleId: '', activo: true };
  }
}
