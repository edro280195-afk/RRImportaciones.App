import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoteImportacionService, LoteListDto } from '../../services/lote-importacion.service';

@Component({
  selector: 'app-lotes-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="mb-1 text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE]">
            {{ total() }} expedientes
          </p>
          <h1 class="text-[26px] font-semibold tracking-[-0.6px] text-[#0D1017]">Lotes</h1>
        </div>
        <button
          (click)="router.navigate(['/lotes/nuevo'])"
          class="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px]"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-3.5 w-3.5 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo lote
        </button>
      </div>

      <div class="mb-5 flex flex-wrap items-center gap-3">
        <div class="relative w-full max-w-[320px]">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-2 text-[#9EA3AE]"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            [(ngModel)]="search"
            (input)="onSearch()"
            placeholder="Buscar folio, cliente, VIN..."
            class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#C61D26] focus:bg-white"
          />
        </div>
        <select
          [(ngModel)]="estado"
          (change)="page.set(1); load()"
          class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26] focus:bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="EN_PROGRESO">En progreso</option>
          <option value="PARCIALMENTE_CERRADO">Parcialmente cerrado</option>
          <option value="CERRADO">Cerrado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <div class="card-elevated overflow-hidden rounded-2xl">
        @if (loading()) {
          <div class="p-12 text-center text-[13px] text-[#9EA3AE]">Cargando lotes...</div>
        } @else if (lotes().length === 0) {
          <div class="p-12 text-center">
            <p class="mb-1 text-[14px] font-semibold text-[#0D1017]">Sin lotes registrados</p>
            <p class="mb-4 text-[13px] text-[#6B717F]">
              Usa un lote cuando un cliente importa varios vehiculos en la misma operacion.
            </p>
            <button
              (click)="router.navigate(['/lotes/nuevo'])"
              class="btn-primary rounded-xl px-4 py-2 text-[13px]"
            >
              Crear lote
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[920px]">
              <thead>
                <tr class="border-b border-[#E4E7EC] text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">
                  <th class="px-5 py-3.5 text-left">Lote</th>
                  <th class="px-5 py-3.5 text-left">Cliente</th>
                  <th class="px-5 py-3.5 text-left">Operacion</th>
                  <th class="px-5 py-3.5 text-right">Total</th>
                  <th class="px-5 py-3.5 text-right">Saldo</th>
                  <th class="px-5 py-3.5 text-center">Avance</th>
                  <th class="px-5 py-3.5 text-center">Estado</th>
                  <th class="px-5 py-3.5 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                @for (lote of lotes(); track lote.id) {
                  <tr
                    (click)="router.navigate(['/lotes', lote.id])"
                    class="cursor-pointer border-b border-[#F3F4F6] text-[13.5px] text-[#1E2330] transition-colors hover:bg-[#FAFBFC]"
                  >
                    <td class="px-5 py-3.5 font-mono-data font-semibold text-[#0D1017]">
                      {{ lote.folioLote }}
                    </td>
                    <td class="px-5 py-3.5">
                      <p class="font-semibold">{{ lote.clienteApodo || 'Sin cliente' }}</p>
                      <p class="text-[12px] text-[#6B717F]">{{ lote.clienteNombre || '' }}</p>
                    </td>
                    <td class="px-5 py-3.5 text-[#6B717F]">
                      <p>{{ lote.totalTramites }} vehiculos</p>
                      <p class="text-[12px]">
                        {{ lote.aduanaNombre || 'Sin aduana' }} /
                        {{ lote.tramitadorNombre || 'Sin tramitador' }}
                      </p>
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono-data">
                      {{ lote.montoTotal | currency: 'MXN' }}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono-data" [style.color]="lote.saldoPendiente > 0 ? '#D97706' : '#16A34A'">
                      {{ lote.saldoPendiente | currency: 'MXN' }}
                    </td>
                    <td class="px-5 py-3.5 text-center font-mono-data">
                      {{ lote.tramitesCompletados }}/{{ lote.totalTramites }}
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <span class="rounded-lg px-2 py-0.5 text-[11px] font-semibold" [style]="estadoPill(lote.estado)">
                        {{ lote.estado }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-[#6B717F]">
                      {{ lote.fechaCreacion | date: 'dd/MM/yyyy' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalPages() > 1) {
            <div class="flex items-center justify-between border-t border-[#E4E7EC] px-5 py-3">
              <span class="text-[12px] text-[#9EA3AE]">Pagina {{ page() }} de {{ totalPages() }}</span>
              <div class="flex gap-2">
                <button
                  (click)="goToPage(page() - 1)"
                  [disabled]="page() <= 1"
                  class="rounded-lg px-3 py-1.5 text-[12px] text-[#6B717F] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  (click)="goToPage(page() + 1)"
                  [disabled]="page() >= totalPages()"
                  class="rounded-lg px-3 py-1.5 text-[12px] text-[#6B717F] disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class LotesListComponent {
  private loteService = inject(LoteImportacionService);
  router = inject(Router);

  lotes = signal<LoteListDto[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(true);
  search = '';
  estado = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loteService
      .getList({
        search: this.search || undefined,
        estado: this.estado || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.lotes.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  estadoPill(estado: string): string {
    const colors: Record<string, string> = {
      EN_PROGRESO: 'background:#DBEAFE;color:#1E40AF;',
      PARCIALMENTE_CERRADO: 'background:#FEF3C7;color:#92400E;',
      CERRADO: 'background:#DCFCE7;color:#166534;',
      CANCELADO: 'background:#F3F4F6;color:#6B7280;',
    };
    return colors[estado] || 'background:#F3F4F6;color:#4B5162;';
  }
}
