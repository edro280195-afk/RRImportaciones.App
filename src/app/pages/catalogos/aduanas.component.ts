import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AduanaService, AduanaDto } from '../../services/aduana.service';

@Component({
  selector: 'app-aduanas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="mb-1 text-[11px] uppercase tracking-[1.1px] text-[#8B93A1]">Catálogos</p>
          <h1 class="text-[26px] font-semibold leading-none text-[#0D1017]">Aduanas</h1>
          <p class="mt-1 text-[13px] text-[#6B717F]">Catálogo de aduanas registradas. Se administra vía el importador.</p>
        </div>
        <div class="relative">
          <input
            [(ngModel)]="filtro"
            type="text"
            placeholder="Buscar por clave o nombre..."
            class="input-field w-64 pl-9"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B93A1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <div class="card-elevated overflow-hidden rounded-2xl">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-[#F0F2F5] bg-[#F8FAFC]">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Clave</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Nombre</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Ciudad</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]">Estado</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="4" class="py-10 text-center text-[13px] text-[#8B93A1]">Cargando...</td></tr>
            } @else if (filtradas().length === 0) {
              <tr><td colspan="4" class="py-10 text-center text-[13px] text-[#8B93A1]">Sin resultados</td></tr>
            } @else {
              @for (a of filtradas(); track a.id) {
                <tr class="border-b border-[#F0F2F5] hover:bg-[#F8FAFC] transition-colors">
                  <td class="px-4 py-3">
                    <span class="rounded-md bg-[#DBEAFE] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#1E40AF]">{{ a.claveAduana }}</span>
                  </td>
                  <td class="px-4 py-3 font-semibold text-[#0D1017]">{{ a.nombre }}</td>
                  <td class="px-4 py-3 text-[#6B717F]">{{ a.ciudad || '—' }}</td>
                  <td class="px-4 py-3 text-[#6B717F]">{{ a.estado || '—' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
        @if (!loading() && filtradas().length > 0) {
          <div class="border-t border-[#F0F2F5] px-4 py-2.5 text-[12px] text-[#8B93A1]">
            {{ filtradas().length }} de {{ aduanas().length }} aduanas
          </div>
        }
      </div>
    </div>
  `,
})
export class AduanasComponent {
  private service = inject(AduanaService);

  aduanas = signal<AduanaDto[]>([]);
  loading = signal(true);
  filtro = '';

  filtradas = computed(() => {
    const q = this.filtro.toLowerCase().trim();
    if (!q) return this.aduanas();
    return this.aduanas().filter(a =>
      a.claveAduana.toLowerCase().includes(q) ||
      a.nombre.toLowerCase().includes(q) ||
      (a.ciudad ?? '').toLowerCase().includes(q) ||
      (a.estado ?? '').toLowerCase().includes(q)
    );
  });

  constructor() {
    this.service.getAll().subscribe({
      next: (list) => { this.aduanas.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
