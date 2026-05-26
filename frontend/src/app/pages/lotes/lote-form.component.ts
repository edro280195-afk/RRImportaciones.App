import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { AduanaDto, AduanaService } from '../../services/aduana.service';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import {
  CreateLoteRequest,
  LoteImportacionService,
  LoteVehiculoItemRequest,
} from '../../services/lote-importacion.service';
import { TramitadorDto, TramitadorService } from '../../services/tramitador.service';
import { CotizacionService, CotizacionInput } from '../../services/cotizacion.service';
import { NotificationService } from '../../services/notification.service';
import { lastValueFrom } from 'rxjs';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { ViewChild, ElementRef } from '@angular/core';

interface LoteVehiculoRow {
  vin: string;
  marcaTexto: string;
  modelo: string;
  anno: number | null;
  categoria: string;
  color: string;
  valorFactura: number | null;
  descripcionMercancia: string;
  cobroTotal: number;
  honorarios: number;
  tipoTramite: string;
  notas: string;
}

@Component({
  selector: 'app-lote-form',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
  template: `
    <div style="font-family: var(--font-body);">
      <button
        (click)="router.navigate(['/lotes'])"
        class="mb-4 flex items-center gap-1.5 text-[12.5px] text-[#9EA3AE] transition-colors hover:text-[#0D1017]"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-3.5 w-3.5 stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
        </svg>
        Volver a lotes
      </button>

      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="mb-1 text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE]">Nuevo lote</p>
          <h1 class="text-[26px] font-semibold tracking-[-0.6px] text-[#0D1017]">
            Alta masiva de vehiculos
          </h1>
        </div>
        <button
          type="button"
          (click)="toggleBulkMode()"
          class="flex items-center gap-2 rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ showBulk() ? 'Ocultar pegado masivo' : 'Pegado masivo de VINs' }}
        </button>
      </div>

      <form (ngSubmit)="submit()" class="space-y-5">
        <section class="card-elevated rounded-2xl p-5">
          <h2 class="mb-4 text-[15px] font-semibold text-[#0D1017]">Datos generales del lote</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Cliente
              <select
                [(ngModel)]="clienteId"
                (ngModelChange)="saveDraft()"
                name="clienteId"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
                required
              >
                <option value="">Seleccionar cliente</option>
                @for (cliente of clientes(); track cliente.id) {
                  <option [value]="cliente.id">{{ cliente.apodo }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Aduana
              <select
                [(ngModel)]="aduanaId"
                (ngModelChange)="saveDraft()"
                name="aduanaId"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
              >
                <option value="">Sin aduana</option>
                @for (aduana of aduanas(); track aduana.id) {
                  <option [value]="aduana.id">{{ aduana.claveAduana }} - {{ aduana.nombre }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Tramitador
              <select
                [(ngModel)]="tramitadorId"
                (ngModelChange)="saveDraft()"
                name="tramitadorId"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
              >
                <option value="">Sin tramitador</option>
                @for (tramitador of tramitadores(); track tramitador.id) {
                  <option [value]="tramitador.id">{{ tramitador.nombre }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
              Tipo
              <select
                [(ngModel)]="tipoTramite"
                (ngModelChange)="saveDraft()"
                name="tipoTramite"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
              >
                <option value="NORMAL">Normal</option>
                <option value="EXPRESS">Express</option>
                <option value="ASESORIA_LOGISTICA">Asesoria logistica</option>
              </select>
            </label>
          </div>
          <label class="mt-4 flex flex-col gap-1 text-[12px] font-medium text-[#4B5162]">
            Notas del lote
            <textarea
              [(ngModel)]="notas"
              (ngModelChange)="saveDraft()"
              name="notas"
              rows="1"
              class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] font-normal outline-none focus:border-[#C61D26] focus:bg-white"
            ></textarea>
          </label>
        </section>

        @if (showBulk()) {
          <section class="card-elevated rounded-2xl bg-white p-5">
            <h2 class="mb-2 text-[15px] font-semibold text-[#0D1017]">Pegado masivo de VINs</h2>
            <p class="mb-4 text-[12px] text-[#6B717F]">Copia y pega una lista de VINs desde Excel u otro documento. Separalos por comas o saltos de linea.</p>
            <textarea
              [(ngModel)]="bulkText"
              name="bulkText"
              rows="4"
              placeholder="Pega tus VINs aqui..."
              class="mb-4 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 text-[13px] font-mono outline-none focus:border-[#C61D26] focus:bg-white"
            ></textarea>
            
            @if (bulkProcessing()) {
              <div class="mb-4 rounded-xl bg-[#F3F4F6] p-4">
                <div class="mb-2 flex items-center justify-between text-[12px] font-medium text-[#4B5162]">
                  <span>Procesando VINs...</span>
                  <span>{{ bulkProgress()?.current }} de {{ bulkProgress()?.total }}</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-[#E4E7EC]">
                  <div 
                    class="h-full bg-[#0D1017] transition-all duration-300 ease-out" 
                    [style.width.%]="bulkProgress()?.total ? (bulkProgress()!.current / bulkProgress()!.total) * 100 : 0"
                  ></div>
                </div>
              </div>
            }

            <button
              type="button"
              (click)="procesarMasivo()"
              [disabled]="bulkProcessing() || !bulkText().trim()"
              class="rounded-xl bg-[#16A34A] px-5 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:bg-[#15803d]"
            >
              {{ bulkProcessing() ? 'Procesando...' : 'Analizar y Procesar' }}
            </button>
          </section>
        }

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <!-- Panel Izquierdo: Cotizador Auto -->
          <section class="card-elevated flex flex-col rounded-2xl bg-white">
            <div class="border-b border-[#E4E7EC] px-5 py-4">
              <h2 class="text-[15px] font-semibold text-[#0D1017]">Agregar un vehiculo</h2>
              <p class="text-[12px] text-[#6B717F]">Ingresa el VIN para auto-calcular montos.</p>
            </div>
            <div class="flex-1 p-5">
              <div class="mb-4">
                <label class="mb-1 block text-[12px] font-medium text-[#4B5162]">VIN del vehiculo</label>
                <div class="relative">
                  <input
                    [(ngModel)]="currentVin"
                    name="currentVin"
                    (input)="onVinInput()"
                    maxlength="17"
                    placeholder="17 caracteres"
                    class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 pr-14 text-[13px] font-mono font-medium outline-none transition-colors focus:border-[#C61D26] focus:bg-white"
                  />
                  <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span
                      class="text-[11px] font-medium mr-1"
                      [class.text-[#16A34A]]="currentVin().length === 17"
                      [class.text-[#9EA3AE]]="currentVin().length !== 17"
                    >
                      {{ currentVin().length }}/17
                    </span>
                    <button type="button" (click)="openScanner()" class="rounded-lg p-1 text-[#4B5162] hover:bg-[#E4E7EC] hover:text-[#0D1017] transition-colors" title="Escanear código de barras">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M17 8v8M14 8v8"/></svg>
                    </button>
                  </div>
                </div>
                @if (decodingVin()) {
                  <p class="mt-1 text-[11px] text-[#D97706]">Decodificando VIN en NHTSA...</p>
                } @else if (vinDecoded() && currentMarca()) {
                  <p class="mt-1 text-[11px] text-[#16A34A]">{{ currentMarca() }} {{ currentModelo() }} {{ currentAnno() }}</p>
                }
              </div>

              <div class="mb-4 grid grid-cols-2 gap-3">
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Marca
                  <input [(ngModel)]="currentMarca" name="currentMarca" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]" />
                </label>
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Modelo
                  <input [(ngModel)]="currentModelo" name="currentModelo" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]" />
                </label>
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Año
                  <input [(ngModel)]="currentAnno" type="number" name="currentAnno" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]" />
                </label>
                <label class="block text-[12px] font-medium text-[#4B5162]">
                  Categoria
                  <select [(ngModel)]="currentCategoria" name="currentCategoria" class="mt-1 w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[13px] outline-none focus:border-[#C61D26]">
                    <option value="AUTOMOVIL">Automovil</option>
                    <option value="CAMIONETA">Camioneta</option>
                    <option value="PICKUP">Pick up</option>
                    <option value="TRACTOCAMION">Tractocamion</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                (click)="calcularCotizacion()"
                [disabled]="calculando() || currentVin().length !== 17"
                class="w-full rounded-xl bg-[#0D1017] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
              >
                {{ calculando() ? 'Calculando...' : 'Calcular montos' }}
              </button>

              @if (calcResult()) {
                <div class="mt-4 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                  <div class="mb-3 flex items-center justify-between border-b border-[#E4E7EC] pb-2">
                    <span class="text-[12px] text-[#6B717F]">Aduana e Impuestos</span>
                    <span class="font-mono-data text-[13px] font-semibold">{{ (calcResult()?.total! - calcResult()?.honorarios!) | currency:'MXN' }}</span>
                  </div>
                  <div class="mb-3 flex items-center justify-between border-b border-[#E4E7EC] pb-2">
                    <span class="text-[12px] text-[#6B717F]">Honorarios</span>
                    <span class="font-mono-data text-[13px] font-semibold">{{ calcResult()?.honorarios | currency:'MXN' }}</span>
                  </div>
                  <div class="mb-4 flex items-center justify-between">
                    <span class="text-[13px] font-bold text-[#0D1017]">TOTAL</span>
                    <span class="font-mono-data text-[15px] font-bold text-[#C61D26]">{{ calcResult()?.total | currency:'MXN' }}</span>
                  </div>

                  <button
                    type="button"
                    (click)="addCalculatedRow()"
                    class="w-full rounded-xl bg-[#16A34A] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#15803d]"
                  >
                    Añadir al lote
                  </button>
                </div>
              }
            </div>
          </section>

          <!-- Panel Derecho: Lista de Vehiculos -->
          <section class="card-elevated flex flex-col overflow-hidden rounded-2xl">
            <div class="flex flex-wrap items-center justify-between border-b border-[#E4E7EC] px-5 py-4">
              <div>
                <h2 class="text-[15px] font-semibold text-[#0D1017]">Vehiculos en el lote</h2>
                <p class="text-[12px] text-[#6B717F]">Listado de unidades a procesar</p>
              </div>
              <button
                type="button"
                (click)="addEmptyRow()"
                class="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-[12.5px] font-medium text-[#4B5162]"
              >
                + Fila manual
              </button>
            </div>

            <div class="flex-1 overflow-x-auto">
              <table class="w-full min-w-[800px]">
                <thead>
                  <tr class="border-b border-[#E4E7EC] text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE]">
                    <th class="px-3 py-3 text-left">VIN</th>
                    <th class="px-3 py-3 text-left">Vehiculo</th>
                    <th class="px-3 py-3 text-right">Cobro Aduana</th>
                    <th class="px-3 py-3 text-right">Honorarios</th>
                    <th class="px-3 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  @if (rows().length === 0) {
                    <tr>
                      <td colspan="5" class="py-8 text-center text-[13px] text-[#9EA3AE]">No hay vehiculos en el lote.</td>
                    </tr>
                  }
                  @for (row of rows(); track row.vin || $index; let i = $index) {
                    <tr @listAnimation class="border-b border-[#F3F4F6]">
                      <td class="px-3 py-2">
                        <input [(ngModel)]="row.vin" (ngModelChange)="saveDraft()" [name]="'vin' + i" class="cell-input font-mono-data" placeholder="17 caracteres" required />
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex gap-1">
                          <input [(ngModel)]="row.marcaTexto" (ngModelChange)="saveDraft()" [name]="'marca' + i" class="cell-input w-1/3" placeholder="Marca" />
                          <input [(ngModel)]="row.modelo" (ngModelChange)="saveDraft()" [name]="'modelo' + i" class="cell-input w-1/3" placeholder="Modelo" />
                          <input [(ngModel)]="row.anno" (ngModelChange)="saveDraft()" type="number" [name]="'anno' + i" class="cell-input w-1/3" placeholder="Año" />
                        </div>
                      </td>
                      <td class="px-3 py-2">
                        <input [(ngModel)]="row.cobroTotal" (ngModelChange)="saveDraft()" [name]="'cobro' + i" type="number" min="0" step="0.01" class="cell-input text-right font-mono-data" />
                      </td>
                      <td class="px-3 py-2">
                        <input [(ngModel)]="row.honorarios" (ngModelChange)="saveDraft()" [name]="'honorarios' + i" type="number" min="0" step="0.01" class="cell-input text-right font-mono-data" />
                      </td>
                      <td class="px-3 py-2 text-right">
                        <button
                          type="button"
                          (click)="removeRow(i)"
                          class="rounded-lg px-2 py-1 text-[12px] font-medium text-[#991B1B] hover:bg-[#FEF2F2]"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center justify-between border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4">
              <div class="text-[13px] text-[#6B717F]">
                Total Lote ({{ rows().length }} vehiculos)
                <span class="ml-2 font-mono-data text-[16px] font-bold text-[#0D1017]">{{ totalLote() | currency: 'MXN' }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="saving() || rows().length === 0"
                  class="btn-primary rounded-xl px-5 py-2.5 text-[14px] disabled:opacity-40"
                >
                  {{ saving() ? 'Guardando...' : 'Guardar lote' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>

    @if (scannerOpen()) {
      <div class="fixed inset-0 z-50 flex flex-col bg-black/90">
        <div class="flex items-center justify-between p-4">
          <span class="text-sm font-medium text-white">Escáner de VIN</span>
          <button type="button" (click)="closeScanner()" class="rounded-full bg-white/20 p-2 text-white hover:bg-white/30">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="relative flex-1">
          <video #scannerVideo autoplay playsinline muted class="h-full w-full object-cover"></video>
          <div class="absolute inset-0 border-[40px] border-black/40"></div>
          <div class="absolute inset-x-8 inset-y-32 rounded-lg border-2 border-[#16A34A] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            <div class="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#ef4444] shadow-[0_0_8px_#ef4444]" style="animation: scan 2s infinite linear alternate;"></div>
            <p class="absolute -bottom-8 left-0 right-0 text-center text-[13px] font-bold text-white shadow-black drop-shadow-md">Enfoca el código de barras</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
    @keyframes scan {
      0% { transform: translateY(-40px); }
      100% { transform: translateY(40px); }
    }
    `,
    `
      .cell-input {
        width: 100%;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
        background: #fff;
        padding: 6px 8px;
        font-size: 12px;
        color: #0d1017;
        outline: none;
      }

      .cell-input:focus {
        border-color: #c61d26;
        box-shadow: 0 0 0 1px #c61d26;
      }
    `,
  ],
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, height: 0, transform: 'scaleY(0.9)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, height: '*', transform: 'scaleY(1)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, height: 0, transform: 'scaleY(0.9)' }))
      ])
    ])
  ]
})
export class LoteFormComponent implements OnInit {
  private loteService = inject(LoteImportacionService);
  private clienteService = inject(ClienteService);
  private aduanaService = inject(AduanaService);
  private tramitadorService = inject(TramitadorService);
  private cotizacionService = inject(CotizacionService);
  private notifications = inject(NotificationService);
  router = inject(Router);

  clientes = signal<ClienteListDto[]>([]);
  aduanas = signal<AduanaDto[]>([]);
  tramitadores = signal<TramitadorDto[]>([]);
  rows = signal<LoteVehiculoRow[]>([]);
  saving = signal(false);

  clienteId = '';
  aduanaId = '';
  tramitadorId = '';
  tipoTramite = 'NORMAL';
  notas = '';

  // Panel Izquierdo
  currentVin = signal('');
  currentMarca = signal('');
  currentModelo = signal('');
  currentAnno = signal<number | null>(null);
  currentCategoria = signal('AUTOMOVIL');
  
  decodingVin = signal(false);
  vinDecoded = signal(false);
  calculando = signal(false);
  calcResult = signal<any>(null);

  // Bulk Panel
  showBulk = signal(false);
  bulkText = signal('');
  bulkProcessing = signal(false);
  bulkProgress = signal<{ total: number; current: number } | null>(null);

  scannerOpen = signal(false);
  @ViewChild('scannerVideo') scannerVideo?: ElementRef<HTMLVideoElement>;
  private zxingReader: BrowserMultiFormatReader | null = null;
  private stream: MediaStream | null = null;

  private calcTimer: any = null;
  private readonly DRAFT_KEY = 'rr_lote_draft';

  constructor() {
    this.clienteService.getList({ pageSize: 500 }).subscribe(res => this.clientes.set(res.items));
    this.aduanaService.getAll().subscribe(res => this.aduanas.set(res));
    this.tramitadorService.getAll(true).subscribe(res => this.tramitadores.set(res));
  }

  async ngOnInit() {
    this.checkDraft();
  }

  async checkDraft() {
    const draft = localStorage.getItem(this.DRAFT_KEY);
    if (draft) {
      const wantRestore = await this.notifications.confirm({
        title: 'Borrador detectado',
        message: 'Tienes un lote sin guardar con información pendiente. ¿Deseas restaurarlo?',
        confirmText: 'Sí, restaurar',
        cancelText: 'No, descartar'
      });

      if (wantRestore) {
        try {
          const parsed = JSON.parse(draft);
          this.clienteId = parsed.clienteId || '';
          this.aduanaId = parsed.aduanaId || '';
          this.tramitadorId = parsed.tramitadorId || '';
          this.tipoTramite = parsed.tipoTramite || 'NORMAL';
          this.notas = parsed.notas || '';
          this.rows.set(parsed.rows || []);
          this.notifications.success('Borrador restaurado exitosamente');
        } catch (e) {
          localStorage.removeItem(this.DRAFT_KEY);
        }
      } else {
        localStorage.removeItem(this.DRAFT_KEY);
      }
    }
  }

  saveDraft() {
    const draft = {
      clienteId: this.clienteId,
      aduanaId: this.aduanaId,
      tramitadorId: this.tramitadorId,
      tipoTramite: this.tipoTramite,
      notas: this.notas,
      rows: this.rows()
    };
    localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
  }

  toggleBulkMode() {
    this.showBulk.update(v => !v);
  }

  async procesarMasivo() {
    const matches = this.bulkText().match(/[A-HJ-NPR-Z0-9]{17}/gi);
    if (!matches || matches.length === 0) {
      this.notifications.warning('No se encontraron VINs válidos de 17 caracteres en el texto.');
      return;
    }

    const uniqueVins = [...new Set(matches.map(v => v.toUpperCase()))];
    const vinsToProcess = uniqueVins.filter(vin => !this.rows().some(r => r.vin === vin));
    
    if (vinsToProcess.length === 0) {
      this.notifications.warning('Todos los VINs encontrados ya están en la tabla.');
      return;
    }

    const skipped = uniqueVins.length - vinsToProcess.length;
    if (skipped > 0) {
      this.notifications.info(`Se omitirán ${skipped} VINs porque ya se encuentran en el lote.`);
    }

    this.bulkProcessing.set(true);
    this.bulkProgress.set({ total: vinsToProcess.length, current: 0 });

    for (const vin of vinsToProcess) {
      try {
        const decodeRes = await lastValueFrom(this.cotizacionService.decodeVin(vin));
        const categoria = decodeRes.vehicleType === 'TRUCK' ? 'CAMIONETA' : 'AUTOMOVIL';
        
        const input: CotizacionInput = {
          vin: vin,
          marcaId: null,
          marca: decodeRes.make || '',
          modelo: decodeRes.model || '',
          anno: decodeRes.modelYear || null,
          cilindradaCm3: null,
          tipoVehiculo: categoria,
          valorAduanaUsdOverride: null,
          precioEstimadoIdOverride: null,
          categoriaAmparoOverride: null,
          tcMargen: 0,
          tipoTramite: this.tipoTramite,
          honorariosOverride: null
        };

        const calcRes = await lastValueFrom(this.cotizacionService.calcular(input));
        
        this.rows.update(r => [...r, {
          vin,
          marcaTexto: decodeRes.make || '',
          modelo: decodeRes.model || '',
          anno: decodeRes.modelYear || null,
          categoria,
          color: '',
          valorFactura: null,
          descripcionMercancia: '',
          cobroTotal: calcRes.total - calcRes.honorarios,
          honorarios: calcRes.honorarios,
          tipoTramite: this.tipoTramite,
          notas: ''
        }]);
        
        this.saveDraft();
      } catch (err) {
        console.error('Error procesando VIN', vin, err);
      }

      this.bulkProgress.update(p => p ? { ...p, current: p.current + 1 } : p);
    }

    this.bulkProcessing.set(false);
    this.bulkText.set('');
    this.showBulk.set(false);
    this.notifications.success(`${vinsToProcess.length} vehículos procesados exitosamente.`);
  }

  onVinInput(): void {
    const val = this.currentVin().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    this.currentVin.set(val);
    this.vinDecoded.set(false);
    this.calcResult.set(null);

    if (this.calcTimer) clearTimeout(this.calcTimer);

    if (val.length === 17) {
      if (this.rows().some(r => r.vin === val)) {
        this.notifications.warning('Este VIN ya está en el lote actual.');
        this.currentVin.set('');
        return;
      }

      this.decodingVin.set(true);
      this.calcTimer = setTimeout(() => {
        this.cotizacionService.decodeVin(val).subscribe({
          next: res => {
            this.decodingVin.set(false);
            this.vinDecoded.set(true);
            this.currentMarca.set(res.make || '');
            this.currentModelo.set(res.model || '');
            this.currentAnno.set(res.modelYear || null);
            this.currentCategoria.set(res.vehicleType === 'TRUCK' ? 'CAMIONETA' : 'AUTOMOVIL');
          },
          error: () => {
            this.decodingVin.set(false);
            this.notifications.error('No se pudo decodificar el VIN en NHTSA.');
          }
        });
      }, 500);
    }
  }

  calcularCotizacion(): void {
    if (!this.currentVin()) return;
    
    if (this.rows().some(r => r.vin === this.currentVin())) {
      this.notifications.warning('Este VIN ya está en el lote actual.');
      return;
    }

    this.calculando.set(true);

    const input: CotizacionInput = {
      vin: this.currentVin(),
      marcaId: null,
      marca: this.currentMarca(),
      modelo: this.currentModelo(),
      anno: this.currentAnno(),
      cilindradaCm3: null,
      tipoVehiculo: this.currentCategoria(),
      valorAduanaUsdOverride: null,
      precioEstimadoIdOverride: null,
      categoriaAmparoOverride: null,
      tcMargen: 0,
      tipoTramite: this.tipoTramite,
      honorariosOverride: null
    };

    this.cotizacionService.calcular(input).subscribe({
      next: res => {
        this.calculando.set(false);
        this.calcResult.set(res);
      },
      error: err => {
        this.calculando.set(false);
        this.notifications.error(err.error?.message || 'Error al calcular montos.');
      }
    });
  }

  addCalculatedRow(): void {
    const res = this.calcResult();
    if (!res) return;

    if (this.rows().some(r => r.vin === this.currentVin())) {
      this.notifications.warning('Este VIN ya está en la tabla.');
      return;
    }

    this.rows.update(rows => [
      ...rows,
      {
        vin: this.currentVin(),
        marcaTexto: this.currentMarca(),
        modelo: this.currentModelo(),
        anno: this.currentAnno(),
        categoria: this.currentCategoria(),
        color: '',
        valorFactura: null,
        descripcionMercancia: '',
        cobroTotal: res.total - res.honorarios,
        honorarios: res.honorarios,
        tipoTramite: this.tipoTramite,
        notas: ''
      }
    ]);
    
    this.saveDraft();
    this.notifications.success('Vehículo añadido al lote');

    // Reset
    this.currentVin.set('');
    this.currentMarca.set('');
    this.currentModelo.set('');
    this.currentAnno.set(null);
    this.calcResult.set(null);
    this.vinDecoded.set(false);
  }

  addEmptyRow(): void {
    this.rows.update(rows => [...rows, this.emptyRow()]);
    this.saveDraft();
  }

  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
    this.saveDraft();
  }

  totalLote(): number {
    return this.rows().reduce((sum, row) => sum + Number(row.cobroTotal || 0) + Number(row.honorarios || 0), 0);
  }

  submit(): void {
    if (!this.clienteId) {
      this.notifications.error('Selecciona un cliente.');
      return;
    }

    if (this.rows().length === 0) {
      this.notifications.error('Agrega al menos un vehiculo al lote.');
      return;
    }

    const vehiculos = this.rows().map(row => this.mapRow(row));
    const invalid = vehiculos.find(v => !v.vin || v.cobroTotal < 0 || v.honorarios < 0);
    if (invalid) {
      this.notifications.error('Hay vehículos con VIN o montos inválidos.');
      return;
    }

    const request: CreateLoteRequest = {
      clienteId: this.clienteId,
      aduanaId: this.aduanaId || null,
      tramitadorId: this.tramitadorId || null,
      tipoTramite: this.tipoTramite,
      notas: this.notas || null,
      vehiculos,
    };

    this.saving.set(true);
    this.loteService.create(request).subscribe({
      next: lote => {
        this.saving.set(false);
        localStorage.removeItem(this.DRAFT_KEY);
        this.notifications.success('Lote y trámites creados exitosamente');
        this.router.navigate(['/lotes', lote.id]);
      },
      error: err => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message || 'No se pudo crear el lote.');
      },
    });
  }

  openScanner(): void {
    this.scannerOpen.set(true);
    setTimeout(() => {
      this.startScanner();
    }, 100);
  }

  closeScanner(): void {
    this.scannerOpen.set(false);
    this.stopScanner();
  }

  private async startScanner(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia || !this.scannerVideo) {
      this.notifications.error('Este navegador no soporta acceso a la cámara.');
      this.closeScanner();
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const video = this.scannerVideo.nativeElement;
      video.srcObject = this.stream;
      await video.play().catch(() => undefined);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
      this.zxingReader = new BrowserMultiFormatReader(hints);
      
      this.zxingReader.decodeFromVideoElement(video, (result: any, error: any) => {
        if (result) {
          const text = result.getText();
          const matches = text.match(/[A-HJ-NPR-Z0-9]{17}/gi);
          if (matches && matches.length > 0) {
            const vin = matches[0].toUpperCase();
            this.currentVin.set(vin);
            this.notifications.success('VIN escaneado: ' + vin);
            navigator.vibrate?.([40, 40, 40]);
            this.closeScanner();
            this.onVinInput();
          }
        }
      });
    } catch {
      this.notifications.error('No se pudo acceder a la cámara.');
      this.closeScanner();
    }
  }

  private stopScanner(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.zxingReader = null;
  }

  private mapRow(row: LoteVehiculoRow): LoteVehiculoItemRequest {
    return {
      vin: row.vin.trim().toUpperCase(),
      marcaTexto: row.marcaTexto || null,
      modelo: row.modelo || null,
      anno: row.anno,
      categoria: row.categoria || null,
      color: row.color || null,
      valorFactura: row.valorFactura,
      moneda: 'USD',
      descripcionMercancia:
        row.descripcionMercancia ||
        [row.marcaTexto, row.modelo, row.anno?.toString()].filter(Boolean).join(' ') ||
        null,
      cobroTotal: Number(row.cobroTotal || 0),
      honorarios: Number(row.honorarios || 0),
      tipoTramite: row.tipoTramite || this.tipoTramite,
      notas: row.notas || null,
    };
  }

  private emptyRow(): LoteVehiculoRow {
    return {
      vin: '',
      marcaTexto: '',
      modelo: '',
      anno: null,
      categoria: '',
      color: '',
      valorFactura: null,
      descripcionMercancia: '',
      cobroTotal: 0,
      honorarios: 0,
      tipoTramite: '',
      notas: '',
    };
  }
}
