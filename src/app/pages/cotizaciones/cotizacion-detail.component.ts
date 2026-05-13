import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CotizacionOutput, CotizacionService } from '../../services/cotizacion.service';

@Component({
  selector: 'app-cotizacion-detail',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (cotizacion(); as c) {
      <div>
        <button (click)="router.navigate(['/cotizaciones'])" class="text-[13px] text-[#6B717F] mb-4 hover:text-[#0D1017]">← Volver</button>
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <p class="text-[11px] uppercase tracking-[1.1px] text-[#9EA3AE] mb-1">{{ c.estado }}</p>
            <h1 class="text-[26px] font-semibold text-[#0D1017]">{{ c.folio || 'Cotización' }}</h1>
            <p class="text-[13px] text-[#6B717F]">{{ c.marca }} {{ c.modelo }} {{ c.anno || '' }} · {{ c.vin || 'Sin VIN' }}</p>
          </div>
          <div class="flex gap-2">
            <button (click)="aceptar()" class="px-4 py-2 rounded-xl bg-[#16A34A] text-white text-[13px]">Aceptar</button>
            <button (click)="rechazar()" class="px-4 py-2 rounded-xl bg-[#FEE2E2] text-[#991B1B] text-[13px]">Rechazar</button>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          <div class="card-elevated rounded-2xl p-5">
            <h2 class="text-[15px] font-semibold mb-4">Desglose</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13px]">
              <div><p class="text-[#9EA3AE]">Fuente</p><p class="font-semibold">{{ c.fuentePrecio }}</p></div>
              <div><p class="text-[#9EA3AE]">Régimen</p><p class="font-semibold">{{ c.regimenFiscal }}</p></div>
              <div><p class="text-[#9EA3AE]">Fracción</p><p class="font-semibold">{{ c.fraccion }}</p></div>
              <div><p class="text-[#9EA3AE]">Valor USD</p><p class="font-mono-data">{{ c.valorAduanaUsd ?? 0 | number:'1.2-2' }}</p></div>
              <div><p class="text-[#9EA3AE]">Valor pesos</p><p class="font-mono-data">\${{ c.valorPesos | number:'1.2-2' }}</p></div>
              <div><p class="text-[#9EA3AE]">TC aplicado</p><p class="font-mono-data">{{ c.tipoCambioAplicado || '—' }}</p></div>
              <div><p class="text-[#9EA3AE]">IGI</p><p class="font-mono-data">\${{ c.igi | number:'1.2-2' }} ({{ c.igiPorcentaje * 100 | number:'1.0-2' }}%)</p></div>
              <div><p class="text-[#9EA3AE]">DTA</p><p class="font-mono-data">\${{ c.dta | number:'1.2-2' }}</p></div>
              <div><p class="text-[#9EA3AE]">IVA</p><p class="font-mono-data">\${{ c.iva | number:'1.2-2' }}</p></div>
              <div><p class="text-[#9EA3AE]">PREV</p><p class="font-mono-data">\${{ c.prev | number:'1.2-2' }}</p></div>
              <div><p class="text-[#9EA3AE]">PRV</p><p class="font-mono-data">\${{ c.prv | number:'1.2-2' }}</p></div>
              <div><p class="text-[#9EA3AE]">Honorarios</p><p class="font-mono-data">\${{ c.honorarios | number:'1.2-2' }}</p></div>
            </div>
          </div>

          <div class="card-elevated rounded-2xl p-5">
            <p class="text-[11px] uppercase tracking-[1px] text-[#9EA3AE] mb-2">Total</p>
            <p class="text-[32px] font-semibold text-[#0D1017] font-mono-data">\${{ c.total | number:'1.2-2' }}</p>
            <div class="mt-5 space-y-2 text-[13px]">
              <div class="flex justify-between"><span>Impuestos</span><strong>\${{ c.impuestosTotal | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>Honorarios</span><strong>\${{ c.honorarios | number:'1.2-2' }}</strong></div>
              <div class="flex justify-between"><span>Express</span><strong>\${{ c.cargoExpress | number:'1.2-2' }}</strong></div>
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="p-12 text-center text-[#9EA3AE]">Cargando cotización...</div>
    }
  `,
})
export class CotizacionDetailComponent {
  private service = inject(CotizacionService);
  private route = inject(ActivatedRoute);
  router = inject(Router);
  cotizacion = signal<CotizacionOutput | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.service.getById(id).subscribe((c) => this.cotizacion.set(c));
  }

  aceptar(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.service.aceptar(c.id).subscribe(() => this.service.getById(c.id!).subscribe((next) => this.cotizacion.set(next)));
  }

  rechazar(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    const motivo = prompt('Motivo de rechazo') || 'Sin motivo';
    this.service.rechazar(c.id, motivo).subscribe(() => this.service.getById(c.id!).subscribe((next) => this.cotizacion.set(next)));
  }
}
