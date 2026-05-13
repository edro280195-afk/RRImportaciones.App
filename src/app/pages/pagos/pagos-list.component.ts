import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { PagoListDto, PagoService } from '../../services/pago.service';
import { TramiteListDto, TramiteService } from '../../services/tramite.service';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-pagos-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, DatePickerModule, SelectModule],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE] mb-1">Finanzas</p>
          <h1 class="text-[26px] font-semibold text-[#0D1017] tracking-[-0.6px]">Pagos</h1>
        </div>
        <div class="flex items-center gap-2">
          @if (canVerify() && selectedIds.size > 0) {
            <button (click)="verifySelected()" class="px-4 py-2 rounded-xl bg-[#0D1017] text-white text-[13px] font-medium">
              Verificar seleccionados
            </button>
          }
          <button (click)="openCreate()" class="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]">
            <span class="text-[16px] leading-none">+</span>
            Registrar pago
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[230px_1fr_1fr_220px] gap-3 mb-5 items-start">
        <div class="card-elevated rounded-xl p-4">
          <p class="text-[11px] text-[#9EA3AE] uppercase font-semibold tracking-[0.6px]">Pendientes de verificación</p>
          <p class="text-[30px] font-semibold text-[#C61D26]">{{ pendientes }}</p>
        </div>
        <p-datepicker [(ngModel)]="filters.fechaDesde" styleClass="rr-control" inputStyleClass="w-full" [showIcon]="true" [iconDisplay]="'input'" dateFormat="dd/mm/yy" placeholder="Desde" (onSelect)="load()" (onClear)="load()" [showButtonBar]="true" />
        <p-datepicker [(ngModel)]="filters.fechaHasta" styleClass="rr-control" inputStyleClass="w-full" [showIcon]="true" [iconDisplay]="'input'" dateFormat="dd/mm/yy" placeholder="Hasta" (onSelect)="load()" (onClear)="load()" [showButtonBar]="true" />
        <p-select [(ngModel)]="filters.verificado" [options]="verifiedOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Estado" (onChange)="load()" />
      </div>

      <div class="card-elevated rounded-2xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
              <th class="px-4 py-3 w-10"></th>
              <th class="px-4 py-3 text-left">Fecha</th>
              <th class="px-4 py-3 text-left">Trámite</th>
              <th class="px-4 py-3 text-left">Cliente</th>
              <th class="px-4 py-3 text-right">Monto</th>
              <th class="px-4 py-3 text-left">Método</th>
              <th class="px-4 py-3 text-left">Comprobante</th>
              <th class="px-4 py-3 text-left">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (p of pagos; track p.id) {
              <tr class="border-b border-[#F3F4F6] text-[13px]">
                <td class="px-4 py-3">
                  @if (canVerify() && !p.verificado) {
                    <input type="checkbox" [checked]="selectedIds.has(p.id)" (change)="toggle(p.id)">
                  }
                </td>
                <td class="px-4 py-3 text-[#6B717F]">{{ p.fechaPago | date:'dd/MM/yyyy' }}</td>
                <td class="px-4 py-3 font-mono-data">{{ p.numeroConsecutivo }}</td>
                <td class="px-4 py-3">{{ p.clienteNombre || 'Sin cliente' }}</td>
                <td class="px-4 py-3 text-right font-mono-data">{{ p.monto | currency:p.moneda:'symbol':'1.2-2' }}</td>
                <td class="px-4 py-3">{{ p.metodo }}</td>
                <td class="px-4 py-3">
                  @if (p.comprobanteUrl) {
                    <a [href]="fileUrl(p.comprobanteUrl)" target="_blank" class="text-[#C61D26] font-medium">Ver</a>
                  }
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 rounded-lg text-[11px] font-semibold" [style]="p.verificado ? 'background:#DCFCE7;color:#166534;' : 'background:#FEF3C7;color:#92400E;'">
                    {{ p.verificado ? 'Verificado' : 'Pendiente' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  @if (canVerify() && !p.verificado) {
                    <button (click)="verifyOne(p.id)" class="text-[12px] font-medium text-[#0D1017]">Verificar</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9" class="px-4 py-12 text-center text-[13px] text-[#9EA3AE]">No hay pagos con estos filtros.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showCreate) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh]" (click)="showCreate = false">
          <form class="bg-white rounded-2xl p-6 w-[620px] shadow-xl" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 class="text-[17px] font-semibold text-[#0D1017]">Registrar pago</h3>
                <p class="text-[12px] text-[#6B717F]">El comprobante es obligatorio para guardar.</p>
              </div>
              <button type="button" (click)="showCreate = false" class="text-[#9EA3AE] hover:text-[#0D1017]">✕</button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <p-select [(ngModel)]="form.tramiteId" name="tramiteId" [options]="tramiteOptions" optionLabel="label" optionValue="value" styleClass="rr-control" [filter]="true" placeholder="Trámite" />
              <p-datepicker [(ngModel)]="form.fechaPago" name="fechaPago" styleClass="rr-control" inputStyleClass="w-full" [showIcon]="true" [iconDisplay]="'input'" dateFormat="dd/mm/yy" placeholder="Fecha de pago" />

              <input [(ngModel)]="form.monto" name="monto" type="number" min="0.01" step="0.01" placeholder="Monto" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <p-select [(ngModel)]="form.moneda" name="moneda" [options]="monedaOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Moneda" />

              <input [(ngModel)]="form.tipoCambio" name="tipoCambio" type="number" step="0.000001" placeholder="Tipo de cambio si USD" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <p-select [(ngModel)]="form.metodo" name="metodo" [options]="metodoOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Método" />

              <input [(ngModel)]="form.banco" name="banco" placeholder="Banco" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <input [(ngModel)]="form.referencia" name="referencia" placeholder="Referencia" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
            </div>

            <textarea [(ngModel)]="form.notas" name="notas" placeholder="Notas" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mt-3" rows="2"></textarea>

            <label class="mt-3 flex items-center justify-center min-h-[96px] rounded-2xl border border-dashed border-[#CDD1DB] bg-[#F9FAFB] cursor-pointer hover:border-[#C61D26] transition-colors">
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" (change)="onFile($event)" class="hidden">
              <span class="text-[13px] text-[#6B717F]">{{ fileName || 'Subir comprobante JPG, PNG o PDF' }}</span>
            </label>

            <div class="flex justify-end gap-2 mt-5">
              <button type="button" (click)="showCreate = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Guardar pago</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class PagosListComponent implements OnInit {
  private pagoService = inject(PagoService);
  private tramiteService = inject(TramiteService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  pagos: PagoListDto[] = [];
  tramites: TramiteListDto[] = [];
  pendientes = 0;
  selectedIds = new Set<string>();
  showCreate = false;
  file: File | null = null;
  fileName = '';

  filters: { fechaDesde: Date | null; fechaHasta: Date | null; verificado: boolean | null } = {
    fechaDesde: null,
    fechaHasta: null,
    verificado: null,
  };

  form = this.emptyForm();

  verifiedOptions: SelectOption<boolean | null>[] = [
    { label: 'Todos', value: null },
    { label: 'Pendientes', value: false },
    { label: 'Verificados', value: true },
  ];
  monedaOptions: SelectOption<string>[] = [
    { label: 'MXN', value: 'MXN' },
    { label: 'USD', value: 'USD' },
  ];
  metodoOptions: SelectOption<string>[] = [
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Depósito', value: 'DEPOSITO' },
    { label: 'Cheque', value: 'CHEQUE' },
  ];

  get tramiteOptions(): SelectOption<string>[] {
    return this.tramites.map(t => ({
      label: `${t.numeroConsecutivo} · ${t.clienteApodo || 'Sin cliente'}`,
      value: t.id,
    }));
  }

  ngOnInit(): void {
    this.load();
    this.tramiteService.getList({ pageSize: 200 }).subscribe(res => this.tramites = res.items);
  }

  load(): void {
    this.pagoService.getList({
      fechaDesde: this.toApiDate(this.filters.fechaDesde),
      fechaHasta: this.toApiDate(this.filters.fechaHasta),
      verificado: this.filters.verificado ?? undefined,
      pageSize: 100,
    }).subscribe(res => {
      this.pagos = res.items;
      this.pendientes = res.items.filter(p => !p.verificado).length;
      this.selectedIds.clear();
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.file = null;
    this.fileName = '';
    this.showCreate = true;
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.fileName = this.file?.name ?? '';
  }

  save(): void {
    if (!this.form.tramiteId || !this.file || this.form.monto <= 0) {
      this.notifications.warning('Selecciona tramite, monto y comprobante.');
      return;
    }

    this.pagoService.create({
      tramiteId: this.form.tramiteId,
      monto: this.form.monto,
      moneda: this.form.moneda,
      tipoCambio: this.form.moneda === 'USD' ? this.form.tipoCambio : null,
      metodo: this.form.metodo,
      banco: this.form.banco || null,
      referencia: this.form.referencia || null,
      comprobanteUrl: `pendiente-upload:${this.file.name}`,
      notas: this.form.notas || null,
      fechaPago: this.toApiDate(this.form.fechaPago) ?? new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: pago => {
        const file = this.file;
        if (!file) return;
        this.pagoService.uploadComprobante(pago.id, file).subscribe({
          next: () => {
            this.showCreate = false;
            this.notifications.success('Pago registrado correctamente.');
            this.load();
          },
          error: err => this.notifications.fromHttpError(err, 'El pago se creo, pero fallo la subida del comprobante'),
        });
      },
      error: err => this.notifications.fromHttpError(err, 'Error al registrar pago'),
    });
  }

  canVerify(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'GERENTE';
  }

  toggle(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  verifyOne(id: string): void {
    this.pagoService.verificar(id).subscribe({
      next: () => {
        this.notifications.success('Pago verificado correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'Error al verificar pago'),
    });
  }

  verifySelected(): void {
    this.pagoService.verificarBulk([...this.selectedIds]).subscribe({
      next: () => {
        this.notifications.success('Pagos verificados correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'Error al verificar pagos'),
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }

  private emptyForm() {
    return {
      tramiteId: '',
      fechaPago: new Date(),
      monto: 0,
      moneda: 'MXN',
      tipoCambio: null as number | null,
      metodo: 'TRANSFERENCIA',
      banco: 'BBVA',
      referencia: '',
      notas: '',
    };
  }

  private toApiDate(date: Date | null): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
