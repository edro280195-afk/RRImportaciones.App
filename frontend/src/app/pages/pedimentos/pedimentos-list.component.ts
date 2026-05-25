import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedimentoService, PedimentoDto } from '../../services/pedimento.service';

@Component({
  selector: 'app-pedimentos-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div class="animate-fade-in" style="font-family: var(--font-body);">
      <!-- Header Area -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-[28px] font-bold text-[#0D1017] tracking-[-0.8px]">Pedimentos</h1>
          <p class="text-[13.5px] text-[#6B717F]">
            Listado global de todos los pedimentos registrados
          </p>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div class="md:col-span-8 relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Buscar por número de pedimento, consecutivo o cliente..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E7EC] rounded-xl text-[13.5px] focus:ring-2 focus:ring-[#C61D26]/10 focus:border-[#C61D26] transition-all outline-none"
          />
          <svg
            class="w-4 h-4 absolute left-3.5 top-3.5 text-[#9EA3AE]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <!-- Table Card -->
      <div
        class="bg-white border border-[#E4E7EC] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-[#F9FAFB] border-b border-[#E4E7EC]">
                <th
                  class="text-left px-6 py-4 text-[11px] font-semibold text-[#9EA3AE] uppercase tracking-[0.6px]"
                >
                  Pedimento
                </th>
                <th
                  class="text-left px-6 py-4 text-[11px] font-semibold text-[#9EA3AE] uppercase tracking-[0.6px]"
                >
                  Trámite
                </th>
                <th
                  class="text-left px-6 py-4 text-[11px] font-semibold text-[#9EA3AE] uppercase tracking-[0.6px]"
                >
                  Cliente
                </th>
                <th
                  class="text-left px-6 py-4 text-[11px] font-semibold text-[#9EA3AE] uppercase tracking-[0.6px]"
                >
                  Fecha Pago
                </th>
                <th
                  class="text-left px-6 py-4 text-[11px] font-semibold text-[#9EA3AE] uppercase tracking-[0.6px]"
                >
                  Tipo
                </th>
                <th
                  class="text-right px-6 py-4 text-[11px] font-semibold text-[#9EA3AE] uppercase tracking-[0.6px]"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F3F4F6]">
              @for (p of filteredPedimentos(); track p.id) {
                <tr
                  class="hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                  (click)="goToTramite(p.tramiteId)"
                >
                  <td class="px-6 py-4">
                    <p class="text-[14px] font-bold text-[#0D1017] font-mono-data">
                      {{ p.numeroPedimento }}
                    </p>
                    <p class="text-[11px] text-[#9EA3AE]">
                      {{ p.fechaCreacion | date: 'dd MMM, yyyy' }}
                    </p>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2.5 py-1 bg-[#F3F4F6] text-[#4B5162] rounded-lg text-[12px] font-medium border border-[#E4E7EC]"
                    >
                      {{ p.numeroConsecutivo }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-[13.5px] font-medium text-[#0D1017]">
                      {{ p.clienteApodo || '—' }}
                    </p>
                    <p class="text-[11px] text-[#6B717F] truncate max-w-[150px]">
                      {{ p.clienteNombre }}
                    </p>
                  </td>
                  <td class="px-6 py-4">
                    @if (p.fechaPago) {
                      <div class="flex items-center gap-1.5 text-[#16A34A] font-medium text-[13px]">
                        <svg
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {{ p.fechaPago | date: 'dd/MM/yyyy' }}
                      </div>
                    } @else {
                      <span class="text-[12px] text-[#9EA3AE]">Pendiente</span>
                    }
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-0.5 text-[11px] font-semibold rounded-md border"
                      [ngClass]="
                        p.tipo === 'ORIGINAL'
                          ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE]'
                          : 'bg-[#FFF7ED] text-[#9A3412] border-[#FFEDD5]'
                      "
                    >
                      {{ p.tipo }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="text-[#C61D26] hover:text-[#A5151F] text-[12.5px] font-semibold">
                      Ver trámite
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-2">
                      <svg
                        class="w-10 h-10 text-[#E4E7EC]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p class="text-[14px] text-[#9EA3AE]">No se encontraron pedimentos</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .font-mono-data {
        font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
      }
    `,
  ],
})
export class PedimentosListComponent implements OnInit {
  private pedimentoService = inject(PedimentoService);
  private router = inject(Router);

  searchQuery = '';
  pedimentos = signal<PedimentoDto[]>([]);
  filteredPedimentos = signal<PedimentoDto[]>([]);

  ngOnInit() {
    this.loadPedimentos();
  }

  loadPedimentos() {
    this.pedimentoService.getAll().subscribe(data => {
      this.pedimentos.set(data);
      this.filteredPedimentos.set(data);
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredPedimentos.set(this.pedimentos());
      return;
    }
    const filtered = this.pedimentos().filter(
      p =>
        p.numeroPedimento.toLowerCase().includes(q) ||
        p.numeroConsecutivo.toLowerCase().includes(q) ||
        p.clienteApodo?.toLowerCase().includes(q) ||
        p.clienteNombre?.toLowerCase().includes(q)
    );
    this.filteredPedimentos.set(filtered);
  }

  goToTramite(id: string) {
    this.router.navigate(['/tramites', id]);
  }
}
