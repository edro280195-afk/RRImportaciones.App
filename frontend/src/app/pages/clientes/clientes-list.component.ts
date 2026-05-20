import { Component, signal, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ClienteService, ClienteListDto, PagedResult } from '../../services/cliente.service';
import { ClienteFormDialogComponent } from './cliente-form-dialog.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [FormsModule, DatePipe, ClienteFormDialogComponent],
  template: `
    <div style="font-family: var(--font-body);">

      <!-- Page head -->
      <div class="flex items-center justify-between mb-6 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
            {{ total() }} registros
          </p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">
            Clientes
          </h1>
        </div>
        @if (auth.can('CLIENTES_CREAR')) {
          <button
            (click)="formDialog.openForCreate()"
            class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Nuevo cliente
          </button>
        }
      </div>

      <!-- Search + filters -->
      <div class="flex items-center gap-3 mb-5 stagger-item" style="animation-delay: 40ms;">
        <div class="relative flex-1 max-w-[380px]">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9EA3AE] stroke-2 pointer-events-none">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="search"
            (input)="onSearch()"
            placeholder="Buscar por apodo, nombre o teléfono…"
            class="w-full pl-9 pr-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
          />
        </div>
      </div>

      <!-- Table -->
      @if (loading()) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay: 80ms;">
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <svg class="w-6 h-6 text-[#9EA3AE] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p class="text-[14px] text-[#9EA3AE]">Cargando clientes…</p>
          </div>
        </div>
      } @else if (clientes().length === 0) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay: 80ms;">
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <div class="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-[#9EA3AE]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">No hay clientes</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">Crea tu primer cliente para empezar.</p>
            <button (click)="formDialog.openForCreate()" class="btn-primary px-4 py-2 rounded-xl text-[13px]">
              Nuevo cliente
            </button>
          </div>
        </div>
      } @else {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay: 80ms;">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                  <th class="text-left px-5 py-3.5 font-medium">Apodo</th>
                  <th class="text-left px-5 py-3.5 font-medium">Nombre completo</th>
                  <th class="text-left px-5 py-3.5 font-medium">Teléfono</th>
                  <th class="text-left px-5 py-3.5 font-medium">Procedencia</th>
                  <th class="text-center px-5 py-3.5 font-medium">Vehículos</th>
                  <th class="text-center px-5 py-3.5 font-medium">Trámites</th>
                  <th class="text-right px-5 py-3.5 font-medium">Facturado</th>
                  <th class="text-left px-5 py-3.5 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                @for (c of clientes(); track c.id; let i = $index) {
                  <tr
                    (click)="router.navigate(['/clientes', c.id])"
                    class="text-[13.5px] text-[#1E2330] border-b border-[#F3F4F6] cursor-pointer transition-all duration-100 hover:bg-[#FAFBFC]"
                    style="animation: fadeIn 300ms ease-out;"
                  >
                    <td class="px-5 py-3.5">
                      <span class="font-semibold text-[#0D1017]">{{ c.apodo }}</span>
                    </td>
                    <td class="px-5 py-3.5 text-[#6B717F]">{{ c.nombreCompleto || '—' }}</td>
                    <td class="px-5 py-3.5 font-mono-data text-[13px] text-[#6B717F]">{{ c.telefono || '—' }}</td>
                    <td class="px-5 py-3.5">
                      @if (c.procedencia) {
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-medium"
                              style="background: #F3F4F6; color: #4B5162;">{{ c.procedencia }}</span>
                      } @else {
                        <span class="text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-center font-mono-data text-[14px]">{{ c.totalVehiculos }}</td>
                    <td class="px-5 py-3.5 text-center font-mono-data text-[14px]">{{ c.totalTramites }}</td>
                    <td class="px-5 py-3.5 text-right font-mono-data text-[14px]">
                      @if (c.totalFacturado > 0) {
                        <span>{{ formatMoney(c.totalFacturado) }}</span>
                      } @else {
                        <span class="text-[#9EA3AE]">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-[#6B717F] font-mono-data">{{ c.fechaRegistro | date:'dd/MM/yyyy' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC]">
              <span class="text-[12.5px] text-[#9EA3AE]">
                Página {{ page() }} de {{ totalPages() }}
              </span>
              <div class="flex items-center gap-1.5">
                <button
                  (click)="goToPage(page() - 1)"
                  [disabled]="page() <= 1"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Anterior
                </button>
                @for (p of pages(); track p) {
                  <button
                    (click)="goToPage(p)"
                    class="w-8 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150"
                    [style]="p === page() ? 'background: #0D1017; color: #fff;' : 'color: #6B717F; hover:background: #F3F4F6;'"
                    [class.hover:bg-[#F3F4F6]]="p !== page()"
                  >
                    {{ p }}
                  </button>
                }
                <button
                  (click)="goToPage(page() + 1)"
                  [disabled]="page() >= totalPages()"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-cliente-form-dialog #formDialog (saved)="loadClientes()" />
  `,
})
export class ClientesListComponent {
  private service = inject(ClienteService);
  router = inject(Router);
  auth = inject(AuthService);

  @ViewChild('formDialog') formDialog!: ClienteFormDialogComponent;

  clientes = signal<ClienteListDto[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(true);
  search = signal('');

  private   searchTimeout: ReturnType<typeof setTimeout> | null = null;

  formatMoney(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  pages = () => {
    const tp = this.totalPages();
    const cp = this.page();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, cp - delta); i <= Math.min(tp - 1, cp + delta); i++) {
      range.push(i);
    }
    const pages = [1];
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < tp - 1) pages.push(-1);
    if (tp > 1) pages.push(tp);
    return pages;
  };

  constructor() {
    this.loadClientes();
  }

  loadClientes(): void {
    this.loading.set(true);
    this.service.getList({
      search: this.search() || undefined,
      page: this.page(),
      pageSize: this.pageSize(),
    }).subscribe({
      next: (res) => {
        this.clientes.set(res.items);
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
      this.loadClientes();
    }, 350);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadClientes();
  }
}
