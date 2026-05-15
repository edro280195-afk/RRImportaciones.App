import { Component, signal, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TramiteService, TramiteListDto } from '../../services/tramite.service';
import { TramiteFormDialogComponent } from './tramite-form-dialog.component';
import { AuthService } from '../../services/auth.service';

interface EstadoTab {
  label: string;
  value: string;
  color: string;
}

@Component({
  selector: 'app-tramites-list',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, TramiteFormDialogComponent],
  template: `
    <div style="font-family: var(--font-body);">

      <div class="flex items-center justify-between mb-6 gap-6 stagger-item">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#9EA3AE] mb-1.5">
            {{ total() }} registros
          </p>
          <h1 class="font-semibold text-[26px] text-[#0D1017] tracking-[-0.6px] leading-none">
            Trámites
          </h1>
        </div>
        @if (auth.can('TRAMITES_CREAR')) {
          <button
            (click)="formDialog.open()"
            class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Nuevo trámite
          </button>
        }
      </div>

      <!-- State tabs -->
      <div class="flex items-center gap-1.5 mb-5 stagger-item flex-wrap" style="animation-delay: 40ms;">
        @for (tab of tabs; track tab.value) {
          <button
            (click)="selectedTab.set(tab.value); page.set(1); loadTramites()"
            class="px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-150"
            [style]="selectedTab() === tab.value
              ? 'background: ' + tab.color + '; color: #fff;'
              : 'background: #F3F4F6; color: #4B5162; border: 1px solid #E4E7EC;'"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-3 mb-5 stagger-item flex-wrap" style="animation-delay: 60ms;">
        <div class="relative flex-1 max-w-[280px]">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9EA3AE] stroke-2 pointer-events-none">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="search"
            (input)="onSearch()"
            placeholder="Buscar por #, cliente, VIN..."
            class="w-full pl-9 pr-3 py-2.5 text-[13.5px] rounded-xl outline-none transition-all duration-150 bg-[#F9FAFB] border border-[#E4E7EC] text-[#0D1017] placeholder:text-[#9EA3AE] focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)]"
          />
        </div>
        <select
          [(ngModel)]="tramitadorFiltro"
          (change)="page.set(1); loadTramites()"
          class="px-3 py-2.5 text-[13px] rounded-xl outline-none bg-[#F9FAFB] border border-[#E4E7EC] text-[#4B5162] focus:bg-white focus:border-[#C61D26]"
        >
          <option value="">Todos los tramitadores</option>
          @for (t of tramitadores; track t.id) {
            <option [value]="t.id">{{ t.nombre }}</option>
          }
        </select>
        <select
          [(ngModel)]="aduanaFiltro"
          (change)="page.set(1); loadTramites()"
          class="px-3 py-2.5 text-[13px] rounded-xl outline-none bg-[#F9FAFB] border border-[#E4E7EC] text-[#4B5162] focus:bg-white focus:border-[#C61D26]"
        >
          <option value="">Todas las aduanas</option>
          @for (a of aduanas; track a.id) {
            <option [value]="a.id">{{ a.nombre }}</option>
          }
        </select>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay: 80ms;">
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <svg class="w-6 h-6 text-[#9EA3AE] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p class="text-[14px] text-[#9EA3AE]">Cargando trámites…</p>
          </div>
        </div>
      } @else if (tramites().length === 0) {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay: 80ms;">
          <div class="flex flex-col items-center justify-center py-16 px-6">
            <p class="text-[14px] font-medium text-[#1E2330] mb-1">No hay trámites</p>
            <p class="text-[13px] text-[#9EA3AE] mb-4">Crea el primer trámite para empezar.</p>
            <button (click)="formDialog.open()" class="btn-primary px-4 py-2 rounded-xl text-[13px]">Nuevo trámite</button>
          </div>
        </div>
      } @else {
        <div class="card-elevated rounded-2xl overflow-hidden stagger-item" style="animation-delay: 80ms;">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                  <th class="text-left px-5 py-3.5 font-medium cursor-pointer select-none hover:text-[#0D1017]" (click)="toggleSort('numero')"># <span class="text-[9px]">{{ sortIcon('numero') }}</span></th>
                  <th class="text-left px-5 py-3.5 font-medium">Fecha</th>
                  <th class="text-left px-5 py-3.5 font-medium">Cliente</th>
                  <th class="text-left px-5 py-3.5 font-medium">Vehículo</th>
                  <th class="text-left px-5 py-3.5 font-medium">Aduana</th>
                  <th class="text-left px-5 py-3.5 font-medium">Tramitador</th>
                  <th class="text-right px-5 py-3.5 font-medium">Cobro</th>
                  <th class="text-right px-5 py-3.5 font-medium">Saldo</th>
                  <th class="text-center px-5 py-3.5 font-medium">Estado</th>
                  <th class="text-center px-5 py-3.5 font-medium">Días</th>
                </tr>
              </thead>
              <tbody>
                @for (t of tramites(); track t.id) {
                  <tr
                    (click)="router.navigate(['/tramites', t.id])"
                    class="text-[13.5px] text-[#1E2330] border-b border-[#F3F4F6] cursor-pointer transition-all duration-100 hover:bg-[#FAFBFC]"
                  >
                    <td class="px-5 py-3.5 font-mono-data text-[13px] font-semibold text-[#0D1017]">{{ t.numeroConsecutivo }}</td>
                    <td class="px-5 py-3.5 text-[#6B717F] font-mono-data text-[12.5px]">{{ t.fechaCreacion | date:'dd/MM/yyyy' }}</td>
                    <td class="px-5 py-3.5 font-semibold">{{ t.clienteApodo || '—' }}</td>
                    <td class="px-5 py-3.5 text-[#6B717F]">{{ t.vehiculoMarcaModelo || t.vehiculoVinCorto || '—' }}</td>
                    <td class="px-5 py-3.5">{{ t.aduanaNombre || '—' }}</td>
                    <td class="px-5 py-3.5">{{ t.tramitadorNombre || '—' }}</td>
                    <td class="px-5 py-3.5 text-right font-mono-data">\${{ t.cobroTotal | number:'1.2-2' }}</td>
                    <td class="px-5 py-3.5 text-right font-mono-data" [style.color]="t.saldoPendiente > 0 ? '#D97706' : '#16A34A'">
                      \${{ t.saldoPendiente | number:'1.2-2' }}
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold" [style]="estadoPill(t.estatus)">
                        {{ t.estatus }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-center text-[#6B717F] font-mono-data">{{ t.diasEnEstado }}d</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC]">
              <span class="text-[12.5px] text-[#9EA3AE]">Página {{ page() }} de {{ totalPages() }}</span>
              <div class="flex items-center gap-1.5">
                <button (click)="goToPage(page() - 1)" [disabled]="page() <= 1"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]">Anterior</button>
                @for (p of pages(); track p) {
                  <button (click)="goToPage(p)"
                    class="w-8 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150"
                    [style]="p === page() ? 'background: #0D1017; color: #fff;' : 'color: #6B717F;'"
                    [class.hover:bg-[#F3F4F6]]="p !== page()">{{ p === -1 ? '...' : p }}</button>
                }
                <button (click)="goToPage(page() + 1)" [disabled]="page() >= totalPages()"
                  class="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F6] text-[#6B717F]">Siguiente</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-tramite-form-dialog #formDialog (saved)="onTramiteCreado($event)" />
  `,
})
export class TramitesListComponent {
  private tramiteService = inject(TramiteService);
  router = inject(Router);
  auth = inject(AuthService);

  @ViewChild('formDialog') formDialog!: TramiteFormDialogComponent;

  tramites = signal<TramiteListDto[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  totalPages = signal(0);
  loading = signal(true);
  search = signal('');
  selectedTab = signal('');
  tramitadorFiltro = signal('');
  aduanaFiltro = signal('');
  sortColumn = signal('fecha');
  sortDir = signal('desc');
  tramitadores: { id: string; nombre: string }[] = [];
  aduanas: { id: string; nombre: string }[] = [];

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  tabs: EstadoTab[] = [
    { label: 'Todos', value: '', color: '#0D1017' },
    { label: 'Pendientes', value: 'PENDIENTE_TRAMITE', color: '#D97706' },
    { label: 'Fotos', value: 'FOTOS_SOLICITADAS', color: '#C61D26' },
    { label: 'Requisitos', value: 'REQUISITOS_PENDIENTES', color: '#D97706' },
    { label: 'Baja', value: 'BAJA_EN_PROCESO', color: '#7C3AED' },
    { label: 'Pedimento', value: 'PEDIMENTO_DOCUMENTADO', color: '#2563EB' },
    { label: 'Cruce', value: 'MANDADO_A_CRUCE', color: '#0F766E' },
    { label: 'Desaduanados', value: 'ROJO_DESADUANADO', color: '#DC2626' },
    { label: 'Entregados', value: 'VERDE_ENTREGADO', color: '#16A34A' },
    { label: 'Pte. pago', value: 'AMARILLO_PENDIENTE_PAGO', color: '#D97706' },
    { label: 'Cobrados', value: 'COBRADO', color: '#16A34A' },
    { label: 'Cancelados', value: 'CANCELADO', color: '#6B7280' },
  ];

  constructor() {
    this.loadCatalogs();
    this.loadTramites();
  }

  async loadCatalogs() {
    const [tramitadoresRes, aduanasRes] = await Promise.all([
      fetch('http://localhost:5198/api/tramitadores?soloActivos=true'),
      fetch('http://localhost:5198/api/aduanas'),
    ]);
    if (tramitadoresRes.ok) this.tramitadores = await tramitadoresRes.json();
    if (aduanasRes.ok) this.aduanas = await aduanasRes.json();
  }

  loadTramites(): void {
    this.loading.set(true);
    this.tramiteService.getList({
      search: this.search() || undefined,
      estado: this.selectedTab() || undefined,
      tramitadorId: this.tramitadorFiltro() || undefined,
      aduanaId: this.aduanaFiltro() || undefined,
      orderBy: this.sortColumn(),
      orderDir: this.sortDir(),
      page: this.page(),
      pageSize: this.pageSize(),
    }).subscribe({
      next: (res) => {
        this.tramites.set(res.items);
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
      this.loadTramites();
    }, 350);
  }

  toggleSort(col: string): void {
    if (this.sortColumn() === col) this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    else { this.sortColumn.set(col); this.sortDir.set('asc'); }
    this.loadTramites();
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '—';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadTramites();
  }

  pages = () => {
    const tp = this.totalPages();
    const cp = this.page();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, cp - delta); i <= Math.min(tp - 1, cp + delta); i++) range.push(i);
    const pages = [1];
    if (range.length > 0 && range[0] > 2) pages.push(-1);
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < tp - 1) pages.push(-1);
    if (tp > 1) pages.push(tp);
    return pages;
  };

  onTramiteCreado(id: string): void {
    this.router.navigate(['/tramites', id]);
  }

  estadoPill(estatus: string): string {
    const colors: Record<string, string> = {
      PENDIENTE_TRAMITE: 'background: #FEF3C7; color: #92400E;',
      EN_PROCESO: 'background: #DBEAFE; color: #1E40AF;',
      ROJO_DESADUANADO: 'background: #FEE2E2; color: #991B1B;',
      VERDE_ENTREGADO: 'background: #DCFCE7; color: #166534;',
      AMARILLO_PENDIENTE_PAGO: 'background: #FEF3C7; color: #92400E;',
      COBRADO: 'background: #DCFCE7; color: #166534;',
      CANCELADO: 'background: #F3F4F6; color: #6B7280;',
    };
    return colors[estatus] || 'background: #F3F4F6; color: #4B5162;';
  }
}
