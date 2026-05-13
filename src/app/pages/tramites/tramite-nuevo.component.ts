import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TramiteService, CreateTramiteRequest } from '../../services/tramite.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-tramite-nuevo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="font-family: var(--font-body);">
      <button (click)="router.navigate(['/tramites'])"
        class="flex items-center gap-1.5 text-[12.5px] text-[#9EA3AE] hover:text-[#0D1017] transition-colors mb-4">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7l-7-7 7-7"/>
        </svg>
        Volver a trámites
      </button>

      <h1 class="text-[26px] font-semibold text-[#0D1017] tracking-[-0.6px] mb-6">Nuevo trámite</h1>

      <div class="card-elevated rounded-2xl p-6 max-w-2xl">
        <div class="grid grid-cols-2 gap-4">

          <!-- Cliente -->
          <div class="col-span-2">
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Cliente *</label>
            <select [(ngModel)]="form.clienteId" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] bg-white">
              <option value="">Seleccionar cliente…</option>
              @for (c of clientes; track c.id) {
                <option [value]="c.id">{{ c.apodo }} — {{ c.nombreCompleto }}</option>
              }
            </select>
          </div>

          <!-- Vehiculo -->
          <div class="col-span-2">
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Vehículo</label>
            <select [(ngModel)]="form.vehiculoId" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] bg-white">
              <option value="">Sin vehículo (mercancía suelta)</option>
              @for (v of vehiculos; track v.id) {
                <option [value]="v.id">{{ v.vinCorto || v.vin }} — {{ v.marcaNombre }} {{ v.modeloNombre }} ({{ v.clienteApodo }})</option>
              }
            </select>
          </div>

          <!-- Descripción mercancía -->
          <div class="col-span-2">
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Descripción de mercancía</label>
            <input [(ngModel)]="form.descripcionMercancia" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]" placeholder="Solo si no hay vehículo asignado">
          </div>

          <!-- Aduana -->
          <div>
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Aduana</label>
            <select [(ngModel)]="form.aduanaId" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] bg-white">
              <option value="">Seleccionar aduana…</option>
              @for (a of aduanas; track a.id) {
                <option [value]="a.id">{{ a.nombre }}</option>
              }
            </select>
          </div>

          <!-- Tramitador -->
          <div>
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Tramitador</label>
            <select [(ngModel)]="form.tramitadorId" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] bg-white">
              <option value="">Seleccionar tramitador…</option>
              @for (t of tramitadores; track t.id) {
                <option [value]="t.id">{{ t.nombre }}</option>
              }
            </select>
          </div>

          <!-- Tipo trámite -->
          <div>
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Tipo de trámite</label>
            <select [(ngModel)]="form.tipoTramite" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] bg-white">
              <option value="NORMAL">Normal</option>
              <option value="EXPRESS">Express (+$500)</option>
              <option value="ASESORIA_LOGISTICA">Asesoría logística</option>
            </select>
          </div>

          <!-- Cobro total -->
          <div>
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Cobro total *</label>
            <input [(ngModel)]="form.cobroTotal" type="number" step="0.01" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
          </div>

          <!-- Honorarios -->
          <div>
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Honorarios</label>
            <input [(ngModel)]="form.honorarios" type="number" step="0.01" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
          </div>

          <!-- Notas -->
          <div class="col-span-2">
            <label class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] block mb-1">Notas</label>
            <textarea [(ngModel)]="form.notas" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]" rows="2"></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button (click)="router.navigate(['/tramites'])" class="px-5 py-2.5 rounded-xl text-[13px] border border-[#E4E7EC] text-[#4B5162]">Cancelar</button>
          <button (click)="guardar()" [disabled]="!form.clienteId || !form.cobroTotal"
            class="px-5 py-2.5 rounded-xl text-[13px] bg-[#0D1017] text-white disabled:opacity-40">Crear trámite</button>
        </div>
      </div>
    </div>
  `,
})
export class TramiteNuevoComponent {
  private tramiteService = inject(TramiteService);
  private notifications = inject(NotificationService);
  router = inject(Router);

  clientes: any[] = [];
  vehiculos: any[] = [];
  tramitadores: any[] = [];
  aduanas: any[] = [];

  form = {
    clienteId: '',
    vehiculoId: '',
    descripcionMercancia: '',
    aduanaId: '',
    tramitadorId: '',
    tipoTramite: 'NORMAL',
    cobroTotal: 0,
    honorarios: 0,
    notas: '',
  };

  constructor() {
    this.loadCatalogs();
  }

  async loadCatalogs() {
    const [clientesRes, vehiculosRes, tramitadoresRes, aduanasRes] = await Promise.all([
      fetch('http://localhost:5198/api/clientes?pageSize=100'),
      fetch('http://localhost:5198/api/vehiculos?pageSize=100'),
      fetch('http://localhost:5198/api/tramitadores?soloActivos=true'),
      fetch('http://localhost:5198/api/aduanas'),
    ]);
    if (clientesRes.ok) { const d = await clientesRes.json(); this.clientes = d.items || d; }
    if (vehiculosRes.ok) { const d = await vehiculosRes.json(); this.vehiculos = d.items || d; }
    if (tramitadoresRes.ok) this.tramitadores = await tramitadoresRes.json();
    if (aduanasRes.ok) this.aduanas = await aduanasRes.json();
  }

  guardar() {
    const request: CreateTramiteRequest = {
      clienteId: this.form.clienteId,
      vehiculoId: this.form.vehiculoId || undefined,
      descripcionMercancia: this.form.descripcionMercancia || undefined,
      aduanaId: this.form.aduanaId || undefined,
      tramitadorId: this.form.tramitadorId || undefined,
      tipoTramite: this.form.tipoTramite,
      cobroTotal: this.form.cobroTotal,
      honorarios: this.form.honorarios,
      notas: this.form.notas || undefined,
    };
    this.tramiteService.create(request).subscribe({
      next: (res) => this.router.navigate(['/tramites', res.id]),
      error: (err) => this.notifications.fromHttpError(err, 'Error al crear tramite'),
    });
  }
}
