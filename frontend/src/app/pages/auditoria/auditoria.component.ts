import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditoriaService, AuditoriaLogDto, AuditoriaPagedResult } from '../../services/auditoria.service';

interface AuditFilters {
  entidad: string;
  accion: string;
  desde: string;
  hasta: string;
}

interface JsonRow {
  key: string;
  value: string;
}

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Administración</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Auditoría</h1>
          <p class="mt-1 text-[13px] text-[#6B717F]">Historial de cambios importantes: quién hizo qué, cuándo y desde dónde.</p>
        </div>
        <div class="grid grid-cols-3 gap-2 rounded-2xl border border-[#E4E7EC] bg-white p-2 shadow-sm">
          <div class="px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.7px] text-[#8B93A1]">Registros</p>
            <p class="text-[18px] font-semibold text-[#0D1017]">{{ resultado()?.total ?? 0 }}</p>
          </div>
          <div class="px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.7px] text-[#8B93A1]">Página</p>
            <p class="text-[18px] font-semibold text-[#0D1017]">{{ page() }}</p>
          </div>
          <div class="px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.7px] text-[#8B93A1]">Vista</p>
            <p class="text-[18px] font-semibold text-[#0D1017]">{{ pageSize }}</p>
          </div>
        </div>
      </div>

      <div class="card-elevated rounded-2xl p-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_150px_150px_auto_auto]">
          <div>
            <label class="label-field">Entidad</label>
            <input [(ngModel)]="filtros.entidad" class="input-field" placeholder="Trámite, Cotización, Pago..." (keyup.enter)="buscar()" />
          </div>
          <div>
            <label class="label-field">Acción</label>
            <select [(ngModel)]="filtros.accion" class="input-field">
              <option value="">Todas</option>
              <option value="CREATE">Creación</option>
              <option value="UPDATE">Edición</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </div>
          <div>
            <label class="label-field">Desde</label>
            <input [(ngModel)]="filtros.desde" type="date" class="input-field" />
          </div>
          <div>
            <label class="label-field">Hasta</label>
            <input [(ngModel)]="filtros.hasta" type="date" class="input-field" />
          </div>
          <div class="flex items-end">
            <button (click)="buscar()" class="btn-primary rounded-xl px-4 py-2.5 text-[13px]">Buscar</button>
          </div>
          <div class="flex items-end">
            <button (click)="limpiar()" class="rounded-xl border border-[#D8DEE8] px-4 py-2.5 text-[13px] font-semibold text-[#4B5162]">Limpiar</button>
          </div>
        </div>
      </div>

      <div class="card-elevated overflow-hidden rounded-2xl">
        @if (loading()) {
          <div class="p-10 text-center text-[13px] text-[#8B93A1]">Cargando registros...</div>
        } @else {
          <div class="flex flex-col gap-2 border-b border-[#F0F2F5] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p class="text-[12px] font-semibold text-[#4B5162]">{{ resultado()?.total ?? 0 }} registros encontrados</p>
            <p class="text-[12px] text-[#8B93A1]">Haz clic en una fila para ver el detalle del cambio.</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-[13px]">
              <thead>
                <tr class="border-b border-[#F0F2F5] bg-[#F8FAFC]">
                  <th class="px-4 py-3 text-left table-head">Fecha</th>
                  <th class="px-4 py-3 text-left table-head">Usuario</th>
                  <th class="px-4 py-3 text-left table-head">Acción</th>
                  <th class="px-4 py-3 text-left table-head">Entidad</th>
                  <th class="px-4 py-3 text-left table-head">Registro</th>
                  <th class="px-4 py-3 text-left table-head">IP</th>
                </tr>
              </thead>
              <tbody>
                @for (log of resultado()?.items ?? []; track log.id) {
                  <tr class="cursor-pointer border-b border-[#F0F2F5] transition-colors hover:bg-[#F8FAFC]" (click)="toggleDetalle(log)">
                    <td class="px-4 py-3 font-mono text-[12px] text-[#6B717F]">{{ formatDate(log.fecha) }}</td>
                    <td class="px-4 py-3 text-[#374151]">{{ log.usuarioNombre || 'Sistema' }}</td>
                    <td class="px-4 py-3">
                      <span class="rounded-lg px-2 py-1 text-[11px] font-semibold" [class]="accionClass(log.accion)">{{ accionLabel(log.accion) }}</span>
                    </td>
                    <td class="px-4 py-3 font-semibold text-[#374151]">{{ log.entidad }}</td>
                    <td class="max-w-[220px] truncate px-4 py-3 font-mono text-[11px] text-[#8B93A1]">{{ log.entidadId || '-' }}</td>
                    <td class="px-4 py-3 font-mono text-[11px] text-[#8B93A1]">{{ log.ipAddress || '-' }}</td>
                  </tr>
                  @if (detalleId() === log.id) {
                    <tr class="bg-[#FAFBFC]">
                      <td colspan="6" class="px-5 py-4">
                        <div class="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-[#6B717F]">
                          <span class="rounded-full bg-white px-3 py-1 font-semibold">{{ log.entidad }}</span>
                          <span>{{ accionLabel(log.accion) }}</span>
                          <span>{{ formatDate(log.fecha) }}</span>
                        </div>

                        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div class="rounded-2xl border border-[#FECACA] bg-white p-4">
                            <p class="mb-3 text-[12px] font-semibold text-[#991B1B]">Antes</p>
                            @if (rows(log.valoresAnteriores).length) {
                              <div class="space-y-2">
                                @for (row of rows(log.valoresAnteriores); track row.key) {
                                  <div class="grid grid-cols-[160px_minmax(0,1fr)] gap-3 text-[12px]">
                                    <span class="font-semibold text-[#6B717F]">{{ labelKey(row.key) }}</span>
                                    <span class="break-words text-[#333846]">{{ row.value }}</span>
                                  </div>
                                }
                              </div>
                            } @else {
                              <p class="text-[12px] text-[#8B93A1]">Sin datos previos.</p>
                            }
                          </div>

                          <div class="rounded-2xl border border-[#BBF7D0] bg-white p-4">
                            <p class="mb-3 text-[12px] font-semibold text-[#166534]">Después</p>
                            @if (rows(log.valoresNuevos).length) {
                              <div class="space-y-2">
                                @for (row of rows(log.valoresNuevos); track row.key) {
                                  <div class="grid grid-cols-[160px_minmax(0,1fr)] gap-3 text-[12px]">
                                    <span class="font-semibold text-[#6B717F]">{{ labelKey(row.key) }}</span>
                                    <span class="break-words text-[#333846]">{{ row.value }}</span>
                                  </div>
                                }
                              </div>
                            } @else {
                              <p class="text-[12px] text-[#8B93A1]">Sin datos nuevos.</p>
                            }
                          </div>
                        </div>

                        <details class="mt-4 rounded-xl border border-[#E4E7EC] bg-white p-3">
                          <summary class="cursor-pointer text-[12px] font-semibold text-[#4B5162]">Ver JSON original</summary>
                          <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <pre class="overflow-x-auto rounded-lg bg-[#FEF2F2] p-3 text-[11px] text-[#374151]">{{ formatJson(log.valoresAnteriores) }}</pre>
                            <pre class="overflow-x-auto rounded-lg bg-[#F0FDF4] p-3 text-[11px] text-[#374151]">{{ formatJson(log.valoresNuevos) }}</pre>
                          </div>
                        </details>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td colspan="6" class="px-4 py-10 text-center text-[13px] text-[#8B93A1]">No hay registros con esos filtros.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if ((resultado()?.total ?? 0) > pageSize) {
            <div class="flex items-center justify-between border-t border-[#F0F2F5] px-4 py-3">
              <button (click)="prevPage()" [disabled]="page() === 1" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">Anterior</button>
              <span class="text-[12px] text-[#6B717F]">Página {{ page() }}</span>
              <button (click)="nextPage()" [disabled]="(page() * pageSize) >= (resultado()?.total ?? 0)" class="rounded-lg border border-[#D8DEE8] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">Siguiente</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .table-head {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #6B717F;
    }
  `],
})
export class AuditoriaComponent {
  private service = inject(AuditoriaService);

  resultado = signal<AuditoriaPagedResult | null>(null);
  loading = signal(false);
  detalleId = signal<string | null>(null);
  page = signal(1);
  readonly pageSize = 50;

  filtros: AuditFilters = { entidad: '', accion: '', desde: '', hasta: '' };

  constructor() {
    this.buscar();
  }

  buscar(): void {
    this.page.set(1);
    this.load();
  }

  limpiar(): void {
    this.filtros = { entidad: '', accion: '', desde: '', hasta: '' };
    this.detalleId.set(null);
    this.buscar();
  }

  load(): void {
    this.loading.set(true);
    this.service.getAll({
      entidad: this.filtros.entidad || undefined,
      accion: this.filtros.accion || undefined,
      desde: this.filtros.desde || undefined,
      hasta: this.filtros.hasta || undefined,
      page: this.page(),
      pageSize: this.pageSize,
    }).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleDetalle(log: AuditoriaLogDto): void {
    this.detalleId.set(this.detalleId() === log.id ? null : log.id);
  }

  prevPage(): void {
    this.page.update(p => Math.max(1, p - 1));
    this.load();
  }

  nextPage(): void {
    this.page.update(p => p + 1);
    this.load();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  rows(json: string | null | undefined): JsonRow[] {
    if (!json) return [];
    try {
      const parsed: unknown = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [{ key: 'valor', value: this.stringify(parsed) }];
      return Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({ key, value: this.stringify(value) }));
    } catch {
      return [{ key: 'valor', value: json }];
    }
  }

  formatJson(json: string | null | undefined): string {
    if (!json) return 'Sin datos';
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }

  accionLabel(accion: string): string {
    if (accion.includes('CREATE') || accion.includes('INSERT')) return 'Creación';
    if (accion.includes('UPDATE') || accion.includes('EDIT')) return 'Edición';
    if (accion.includes('DELETE') || accion.includes('BORRAR')) return 'Eliminación';
    return accion;
  }

  accionClass(accion: string): string {
    if (accion.includes('CREATE') || accion.includes('INSERT')) return 'bg-[#DCFCE7] text-[#166534]';
    if (accion.includes('UPDATE') || accion.includes('EDIT')) return 'bg-[#FEF3C7] text-[#92400E]';
    if (accion.includes('DELETE') || accion.includes('BORRAR')) return 'bg-[#FEE2E2] text-[#991B1B]';
    return 'bg-[#F3F4F6] text-[#374151]';
  }

  labelKey(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private stringify(value: unknown): string {
    if (value instanceof Date) return value.toLocaleString('es-MX');
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return value.toLocaleString('es-MX');
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }
}
