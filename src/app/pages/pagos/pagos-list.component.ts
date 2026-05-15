import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { AuthService } from '../../services/auth.service';
import { BancoDto, BancoService } from '../../services/banco.service';
import { CotizacionService } from '../../services/cotizacion.service';
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
              <th class="px-4 py-3 text-left">Tipo</th>
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
                <td class="px-4 py-3">
                  <span class="block font-medium">{{ tipoMovimientoLabel(p.tipoMovimiento) }}</span>
                  <span class="text-[11px] text-[#9EA3AE]">{{ p.pagadoPor === 'RR' ? 'Cubierto por R&R' : 'Cliente' }}{{ p.seCobraAlCliente ? ' · cobrable' : '' }}</span>
                </td>
                <td class="px-4 py-3">{{ p.metodo }}</td>
                <td class="px-4 py-3">
                  @if (p.comprobanteUrl) {
                    <a [href]="fileUrl(p.comprobanteUrl)" target="_blank" class="text-[#C61D26] font-medium">Banco</a>
                  }
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 rounded-lg text-[11px] font-semibold" [style]="p.verificado ? 'background:#DCFCE7;color:#166534;' : 'background:#FEF3C7;color:#92400E;'">
                    {{ p.verificado ? 'Verificado' : 'Pendiente' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-3">
                    <a [href]="reciboUrl(p)" target="_blank" class="text-[12px] font-medium text-[#C61D26]">Recibo</a>
                    @if (canVerify()) {
                      <button (click)="regenerarRecibo(p.id)" class="text-[12px] font-medium text-[#6B717F]">Regenerar</button>
                    }
                    @if (canEditPago(p)) {
                      <button (click)="openEdit(p)" class="text-[12px] font-medium text-[#4B5162]">Editar</button>
                    }
                  @if (canVerify() && !p.verificado) {
                    <button (click)="verifyOne(p.id)" class="text-[12px] font-medium text-[#0D1017]">Verificar</button>
                  }
                    <button (click)="deletePago(p)" class="text-[12px] font-medium text-[#991B1B]">Borrar</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="10" class="px-4 py-12 text-center text-[13px] text-[#9EA3AE]">No hay pagos con estos filtros.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showCreate) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh]" (click)="!savingPago && closePagoModal()">
          <form class="bg-white rounded-2xl p-6 w-[620px] shadow-xl" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 class="text-[17px] font-semibold text-[#0D1017]">{{ editingPago ? 'Editar pago' : 'Registrar pago' }}</h3>
                <p class="text-[12px] text-[#6B717F]">{{ editingPago ? 'Los cambios quedan en bitacora y regeneran el recibo.' : 'El comprobante bancario es obligatorio excepto cuando el pago es en efectivo.' }}</p>
              </div>
              <button type="button" (click)="showCreate = false" class="text-[#9EA3AE] hover:text-[#0D1017]">✕</button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <p-select [(ngModel)]="form.tramiteId" name="tramiteId" [options]="tramiteOptions" optionLabel="label" optionValue="value" styleClass="rr-control" [filter]="true" placeholder="Trámite" />
              <p-datepicker [(ngModel)]="form.fechaPago" name="fechaPago" styleClass="rr-control" inputStyleClass="w-full" [showIcon]="true" [iconDisplay]="'input'" dateFormat="dd/mm/yy" placeholder="Fecha de pago" />

              <input [(ngModel)]="form.monto" name="monto" type="number" min="0.01" step="0.01" placeholder="Monto" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <p-select [(ngModel)]="form.moneda" name="moneda" [options]="monedaOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Moneda" (onChange)="onMonedaChange()" />

              <p-select [(ngModel)]="form.tipoMovimiento" name="tipoMovimiento" [options]="tipoMovimientoOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Tipo de movimiento" />
              <p-select [(ngModel)]="form.pagadoPor" name="pagadoPor" [options]="pagadoPorOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Pagado por" />

              <input [(ngModel)]="form.tipoCambio" name="tipoCambio" type="number" step="0.000001" [readonly]="form.moneda !== 'USD'" [placeholder]="form.moneda === 'USD' ? 'Tipo de cambio automatico' : 'Solo aplica para USD'" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] read-only:bg-[#F3F4F6]">
              <p-select [(ngModel)]="form.metodo" name="metodo" [options]="metodoOptions" optionLabel="label" optionValue="value" styleClass="rr-control" placeholder="Método" />

              @if (form.metodo === 'TRANSFERENCIA' || form.metodo === 'DEPOSITO') {
                <p-select [(ngModel)]="form.banco" name="banco" [options]="bancoOptions" optionLabel="label" optionValue="value" styleClass="rr-control" [filter]="true" placeholder="Banco registrado" />
              } @else {
                <input [(ngModel)]="form.banco" name="banco" placeholder="Banco (opcional)" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              }
              <input [(ngModel)]="form.referencia" name="referencia" placeholder="Referencia" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
            </div>

            @if (selectedTramite()) {
              <div class="mt-3 rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 text-[12px] text-[#4B5162]">
                <div class="flex items-center justify-between gap-3">
                  <span>Saldo disponible</span>
                  <strong class="font-mono-data text-[#0D1017]">{{ saldoDisponibleSeleccionado() | currency:'MXN' }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3 mt-1">
                  <span>Este pago en MXN</span>
                  <strong class="font-mono-data" [class.text-[#991B1B]]="montoExcedeSaldo()">{{ pagoMxn() | currency:'MXN' }}</strong>
                </div>
              </div>
            }
            @if (validationMessages().length > 0) {
              <div class="mt-3 rounded-2xl border border-[#FEE2E2] bg-[#FFF7F7] px-3 py-2 text-[12px] text-[#991B1B]">
                @for (message of validationMessages(); track message) {
                  <p>{{ message }}</p>
                }
              </div>
            }

            <textarea [(ngModel)]="form.notas" name="notas" placeholder="Notas" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mt-3" rows="2"></textarea>
            <label class="mt-3 flex items-center gap-2 text-[13px] text-[#4B5162]">
              <input type="checkbox" [(ngModel)]="form.seCobraAlCliente" name="seCobraAlCliente">
              Se cobra al cliente
            </label>

            <label class="mt-3 flex items-center justify-center min-h-[96px] rounded-2xl border border-dashed border-[#CDD1DB] bg-[#F9FAFB] cursor-pointer hover:border-[#C61D26] transition-colors">
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" (change)="onFile($event)" class="hidden">
              <span class="text-[13px] text-[#6B717F]">{{ fileName || (form.comprobanteUrl ? 'Conservando comprobante actual' : (form.metodo === 'EFECTIVO' ? 'Comprobante opcional en efectivo' : 'Subir comprobante JPG, PNG o PDF')) }}</span>
            </label>

            <div class="flex justify-end gap-2 mt-5">
              <button type="button" [disabled]="savingPago" (click)="closePagoModal()" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC] disabled:opacity-50">Cancelar</button>
              <button type="submit" [disabled]="savingPago || validationMessages().length > 0" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white disabled:opacity-50">
                @if (savingPago) {
                  <span class="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  Guardando...
                } @else {
                  <span>{{ editingPago ? 'Guardar cambios' : 'Guardar pago' }}</span>
                }
              </button>
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
  private bancoService = inject(BancoService);
  private cotizacionService = inject(CotizacionService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  pagos: PagoListDto[] = [];
  tramites: TramiteListDto[] = [];
  bancos: BancoDto[] = [];
  pendientes = 0;
  selectedIds = new Set<string>();
  showCreate = false;
  savingPago = false;
  editingPago: PagoListDto | null = null;
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
  tipoMovimientoOptions: SelectOption<string>[] = [
    { label: 'Anticipo cliente', value: 'ANTICIPO_CLIENTE' },
    { label: 'Pago cliente', value: 'PAGO_CLIENTE' },
    { label: 'Pago cubierto por R&R', value: 'PAGO_RR' },
    { label: 'Pago pedimento', value: 'PAGO_PEDIMENTO' },
    { label: 'Ajuste', value: 'AJUSTE' },
    { label: 'Reembolso', value: 'REEMBOLSO' },
  ];
  pagadoPorOptions: SelectOption<string>[] = [
    { label: 'Cliente', value: 'CLIENTE' },
    { label: 'R&R', value: 'RR' },
    { label: 'Tercero', value: 'TERCERO' },
  ];

  get tramiteOptions(): SelectOption<string>[] {
    return this.tramites.map(t => ({
      label: `${t.numeroConsecutivo} · ${t.clienteApodo || 'Sin cliente'}`,
      value: t.id,
    }));
  }

  get bancoOptions(): SelectOption<string>[] {
    return this.bancos.map(b => ({
      label: `${b.identificador} · ${b.nombre}${b.cuenta ? ` · ${b.cuenta}` : ''}`,
      value: `${b.identificador} - ${b.nombre}${b.cuenta ? ` - ${b.cuenta}` : ''}`,
    }));
  }

  selectedTramite(): TramiteListDto | null {
    return this.tramites.find(t => t.id === this.form.tramiteId) ?? null;
  }

  pagoMxn(): number {
    if (!this.form.monto || this.form.monto <= 0) return 0;
    if (this.form.moneda === 'USD') return this.form.monto * (this.form.tipoCambio || 0);
    return this.form.monto;
  }

  saldoDisponibleSeleccionado(): number {
    const tramite = this.selectedTramite();
    if (!tramite) return 0;
    const pagosPendientes = this.pagos
      .filter(p => p.tramiteId === tramite.id && p.id !== this.editingPago?.id)
      .reduce((sum, p) => sum + (p.moneda === 'USD' ? p.monto * (p.tipoCambio || 0) : p.monto), 0);
    return Math.max(0, tramite.saldoPendiente - pagosPendientes);
  }

  montoExcedeSaldo(): boolean {
    return !!this.selectedTramite() && this.pagoMxn() > this.saldoDisponibleSeleccionado();
  }

  validationMessages(): string[] {
    const messages: string[] = [];
    if (!this.form.tramiteId) messages.push('Selecciona un tramite.');
    if (!this.form.monto || this.form.monto <= 0) messages.push('El monto debe ser mayor a cero.');
    if (this.form.moneda === 'USD' && (!this.form.tipoCambio || this.form.tipoCambio <= 0)) messages.push('El tipo de cambio es obligatorio para pagos en USD.');
    if ((this.form.metodo === 'TRANSFERENCIA' || this.form.metodo === 'DEPOSITO') && !this.form.banco) messages.push('Selecciona el banco para transferencias o depositos.');
    if (this.form.metodo !== 'EFECTIVO' && !this.file && !this.form.comprobanteUrl) messages.push('Adjunta el comprobante bancario.');
    if (this.montoExcedeSaldo()) messages.push(`El pago excede el saldo disponible por ${(this.pagoMxn() - this.saldoDisponibleSeleccionado()).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
    return messages;
  }

  ngOnInit(): void {
    this.load();
    this.tramiteService.getList({ pageSize: 200 }).subscribe(res => this.tramites = res.items);
    this.bancoService.getAll(true).subscribe(res => this.bancos = res);
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
    this.editingPago = null;
    this.form = this.emptyForm();
    this.file = null;
    this.fileName = '';
    this.showCreate = true;
  }

  openEdit(pago: PagoListDto): void {
    this.editingPago = pago;
    this.form = {
      tramiteId: pago.tramiteId,
      fechaPago: this.parseApiDate(pago.fechaPago),
      monto: pago.monto,
      moneda: pago.moneda,
      tipoCambio: pago.tipoCambio,
      tipoMovimiento: pago.tipoMovimiento,
      pagadoPor: pago.pagadoPor,
      seCobraAlCliente: pago.seCobraAlCliente,
      metodo: pago.metodo,
      banco: pago.banco ?? '',
      referencia: pago.referencia ?? '',
      comprobanteUrl: pago.comprobanteUrl,
      notas: '',
    };
    this.file = null;
    this.fileName = '';
    this.showCreate = true;
  }

  closePagoModal(): void {
    if (this.savingPago) return;
    this.showCreate = false;
    this.editingPago = null;
  }

  onMonedaChange(): void {
    if (this.form.moneda !== 'USD') {
      this.form.tipoCambio = null;
      return;
    }
    this.cotizacionService.getTipoCambio().subscribe({
      next: tc => this.form.tipoCambio = tc.tipoCambio,
      error: err => this.notifications.fromHttpError(err, 'No se pudo obtener el tipo de cambio. Puedes capturarlo manualmente.'),
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.fileName = this.file?.name ?? '';
  }

  save(): void {
    const messages = this.validationMessages();
    if (messages.length > 0) {
      this.notifications.warning(messages[0]);
      return;
    }
    if (this.savingPago) return;

    const file = this.file;
    const isEditing = !!this.editingPago;
    this.savingPago = true;
    const payload = {
      tramiteId: this.form.tramiteId,
      monto: this.form.monto,
      moneda: this.form.moneda,
      tipoCambio: this.form.moneda === 'USD' ? this.form.tipoCambio : null,
      tipoMovimiento: this.form.tipoMovimiento,
      pagadoPor: this.form.pagadoPor,
      seCobraAlCliente: this.form.seCobraAlCliente,
      metodo: this.form.metodo,
      banco: this.form.banco || null,
      referencia: this.form.referencia || null,
      comprobanteUrl: file ? `pendiente-upload:${file.name}` : this.form.comprobanteUrl,
      notas: this.form.notas || null,
      fechaPago: this.toApiDate(this.form.fechaPago) ?? new Date().toISOString().slice(0, 10),
    };

    const request = this.editingPago
      ? this.pagoService.update(this.editingPago.id, payload)
      : this.pagoService.create(payload);

    request.subscribe({
      next: pago => {
        if (!file) {
          this.savingPago = false;
          this.closePagoModal();
          this.notifications.success(isEditing ? 'Pago actualizado y recibo regenerado.' : (pago.reciboPagoUrl ? 'Pago registrado y recibo generado.' : 'Pago registrado. Puedes regenerar el recibo desde pagos.'));
          this.load();
          return;
        }

        this.pagoService.uploadComprobante(pago.id, file).subscribe({
          next: () => {
            this.savingPago = false;
            this.closePagoModal();
            this.notifications.success(isEditing ? 'Pago actualizado y comprobante guardado.' : (pago.reciboPagoUrl ? 'Pago registrado y recibo generado.' : 'Pago registrado. Puedes regenerar el recibo desde pagos.'));
            this.load();
          },
          error: err => {
            this.savingPago = false;
            this.notifications.fromHttpError(err, 'El pago se creo, pero fallo la subida del comprobante');
          },
        });
      },
      error: err => {
        this.savingPago = false;
        this.notifications.fromHttpError(err, 'Error al registrar pago');
      },
    });
  }

  canVerify(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'GERENTE';
  }

  canEditPago(pago: PagoListDto): boolean {
    return !pago.verificado || this.canVerify();
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

  async deletePago(pago: PagoListDto): Promise<void> {
    const confirmed = await this.notifications.confirm({
      title: 'Borrar pago',
      message: `Se ocultara de saldos, listados y timeline operativo. La bitacora administrativa conservara el movimiento.`,
      detail: `${pago.numeroConsecutivo} | ${pago.monto.toLocaleString('es-MX', { style: 'currency', currency: pago.moneda })}`,
      confirmText: 'Borrar pago',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    this.pagoService.delete(pago.id).subscribe({
      next: () => {
        this.notifications.success('Pago borrado correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo borrar el pago'),
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }

  reciboUrl(pago: PagoListDto): string {
    return pago.reciboPagoUrl ? this.fileUrl(pago.reciboPagoUrl) : this.pagoService.reciboUrl(pago.id);
  }

  regenerarRecibo(id: string): void {
    this.pagoService.regenerarRecibo(id).subscribe({
      next: () => {
        this.notifications.success('Recibo regenerado correctamente.');
        this.load();
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo regenerar el recibo'),
    });
  }

  tipoMovimientoLabel(value: string): string {
    const labels: Record<string, string> = {
      ANTICIPO_CLIENTE: 'Anticipo',
      PAGO_CLIENTE: 'Pago cliente',
      PAGO_RR: 'Pago R&R',
      PAGO_PEDIMENTO: 'Pedimento',
      AJUSTE: 'Ajuste',
      REEMBOLSO: 'Reembolso',
    };
    return labels[value] ?? value;
  }

  private emptyForm() {
    return {
      tramiteId: '',
      fechaPago: new Date(),
      monto: 0,
      moneda: 'MXN',
      tipoCambio: null as number | null,
      tipoMovimiento: 'ANTICIPO_CLIENTE',
      pagadoPor: 'CLIENTE',
      seCobraAlCliente: false,
      metodo: 'TRANSFERENCIA',
      banco: '',
      referencia: '',
      comprobanteUrl: null as string | null,
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

  private parseApiDate(value: string): Date {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
}
