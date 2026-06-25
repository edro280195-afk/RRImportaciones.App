import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AduanaDto, AduanaService } from '../../services/aduana.service';
import { ClienteDetailDto, ClienteService } from '../../services/cliente.service';
import {
  CotizacionOutput,
  CotizacionService,
  WhatsAppLinkResponse,
} from '../../services/cotizacion.service';
import { TramitadorDto, TramitadorService } from '../../services/tramitador.service';
import { NotificationService } from '../../services/notification.service';
import {
  PlantillaMensajeDto,
  PlantillaMensajeService,
} from '../../services/plantilla-mensaje.service';

@Component({
  selector: 'app-cotizacion-detail',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule],
  template: `
    @if (cotizacion(); as c) {
      <div>
        <button
          (click)="router.navigate(['/cotizaciones'])"
          class="mb-4 text-[13px] text-[#6B717F] hover:text-[#0D1017]"
        >
          Regresar
        </button>

        <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                [style]="pill(c.estado)"
                >{{ c.estado }}</span
              >
              @if (c.fechaEnvio) {
                <span
                  class="rounded-full bg-[#DBEAFE] px-2.5 py-1 text-[11px] font-semibold text-[#1E40AF]"
                >
                  Enviada el {{ c.fechaEnvio | date: 'dd/MM/yyyy HH:mm' }} por {{ c.enviadoPor }}
                </span>
              }
            </div>
            <h1 class="text-[26px] font-semibold text-[#0D1017]">{{ c.folio || 'Cotizacion' }}</h1>
            <p class="text-[13px] text-[#6B717F]">
              {{ c.marca }} {{ c.modelo }} {{ c.anno || '' }} / {{ c.vin || 'Sin VIN' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              (click)="verPdf()"
              class="rounded-xl border border-[#D8DEE8] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E2330]"
            >
              Ver PDF
            </button>
            <button
              (click)="descargarPdf()"
              class="rounded-xl border border-[#D8DEE8] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E2330]"
            >
              Descargar PDF
            </button>
            @if (c.estado !== 'CONVERTIDA') {
              <button
                (click)="recalcular()"
                [disabled]="sending()"
                class="rounded-xl border border-[#D8DEE8] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E2330] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                @if (sending()) {
                  <svg
                    class="animate-spin w-3.5 h-3.5 text-[#6B717F]"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Recalculando...
                } @else {
                  Recalcular
                }
              </button>
            }
            <button
              (click)="openEmail()"
              class="rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-semibold text-white"
            >
              Enviar correo
            </button>
            <button
              (click)="openWhatsApp()"
              class="rounded-xl bg-[#16A34A] px-4 py-2 text-[13px] font-semibold text-white"
            >
              WhatsApp
            </button>
            @if (c.estado !== 'ACEPTADA' && c.estado !== 'CONVERTIDA' && c.estado !== 'RECHAZADA') {
              <button
                (click)="aceptar()"
                [disabled]="accepting() || sending() || converting()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-[#DCFCE7] px-4 py-2 text-[13px] font-semibold text-[#166534] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (accepting()) {
                  <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Aceptando...
                } @else {
                  Aceptar
                }
              </button>
            }
            @if (c.estado !== 'RECHAZADA' && c.estado !== 'CONVERTIDA') {
              <button
                (click)="rechazar()"
                class="rounded-xl bg-[#FEE2E2] px-4 py-2 text-[13px] font-semibold text-[#991B1B]"
              >
                Rechazar
              </button>
            }
            @if (c.estado === 'ACEPTADA' && !c.tramiteId) {
              <button
                (click)="openConvertir()"
                class="rounded-xl px-5 py-2 text-[13px] font-semibold text-white inline-flex items-center gap-2"
                style="background: #16A34A;"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="w-3.5 h-3.5 stroke-2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Convertir a trámite
              </button>
            }
          </div>
        </div>

        @if (actionMessage()) {
          <div
            class="mb-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-[13px] text-[#1E40AF]"
          >
            {{ actionMessage() }}
          </div>
        }
        @if (actionError()) {
          <div
            class="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]"
          >
            {{ actionError() }}
          </div>
        }

        @if (c.estado === 'ACEPTADA' && !c.tramiteId) {
          <div class="mb-5 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-5 py-4">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-xl bg-[#16A34A] flex items-center justify-center shrink-0"
              >
                <svg
                  class="w-4 h-4 text-white"
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
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[13.5px] font-semibold text-[#14532D] leading-tight">
                  Cotización aceptada
                </p>
                <p class="text-[12.5px] text-[#166534] mt-0.5">
                  Lista para convertirse en trámite formal.
                </p>
              </div>
              <button
                (click)="openConvertir()"
                class="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-[13px] font-semibold text-white shrink-0 hover:bg-[#15803D] transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Convertir a trámite
              </button>
            </div>
          </div>
        }

        @if (c.tramiteId) {
          <div
            class="mb-5 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-[13px] text-[#1E40AF]"
          >
            Convertida a tramite
            <button
              class="font-semibold underline"
              (click)="router.navigate(['/tramites', c.tramiteId])"
            >
              {{ c.tramiteNumero || c.tramiteId }}
            </button>
          </div>
        }

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <div class="card-elevated rounded-2xl p-5">
            <h2 class="mb-4 text-[15px] font-semibold">Desglose</h2>
            <div class="mb-5 rounded-xl border border-[#D8DEE8] bg-[#F8FAFC] p-4 text-[13px]">
              <div class="mb-2 flex items-center justify-between gap-2">
                <h3 class="font-semibold text-[#0D1017]">Evidencia del precio</h3>
                <span
                  class="rounded-full bg-[#E8EEF7] px-2 py-0.5 font-mono-data text-[11px] text-[#384253]"
                  >{{ c.precioMatchTipo || 'SIN DATO' }}</span
                >
              </div>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p class="text-[#9EA3AE]">Marca catalogo</p>
                  <p class="font-semibold">{{ c.precioCatalogoMarca || c.marca || 'Sin dato' }}</p>
                </div>
                <div>
                  <p class="text-[#9EA3AE]">Modelo catalogo</p>
                  <p class="font-semibold">{{ c.precioCatalogoModelo || 'Sin dato' }}</p>
                </div>
                <div>
                  <p class="text-[#9EA3AE]">Origen</p>
                  <p class="font-semibold">{{ c.precioCatalogoOrigen || 'Sin dato' }}</p>
                </div>
                <div>
                  <p class="text-[#9EA3AE]">Antiguedad usada</p>
                  <p class="font-semibold">{{ c.precioAntiguedadAnios || 'N/D' }}</p>
                </div>
              </div>
              @if (c.precioAdvertencia) {
                <p class="mt-3 text-[#991B1B]">{{ c.precioAdvertencia }}</p>
              }
            </div>

            <div class="grid grid-cols-2 gap-4 text-[13px] md:grid-cols-3">
              <div>
                <p class="text-[#9EA3AE]">Fuente</p>
                <p class="font-semibold">{{ c.fuentePrecio }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">Regimen</p>
                <p class="font-semibold">{{ c.regimenFiscal }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">Fraccion</p>
                <p class="font-semibold">{{ c.fraccion }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">Valor USD</p>
                <p class="font-mono-data">{{ c.valorAduanaUsd ?? 0 | number: '1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">Valor pesos</p>
                <p class="font-mono-data">\${{ c.valorPesos | number: '1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">TC aplicado</p>
                <div class="flex items-center gap-1.5">
                  <p class="font-mono-data font-semibold">{{ c.tipoCambioAplicado || '-' }}</p>
                  @if (c.tipoCambioContexto === 'DOF') {
                    <span
                      class="rounded bg-[#DCFCE7] px-1 py-0.5 text-[10px] font-bold text-[#166534]"
                      title="Oficial Diario Oficial de la Federacion"
                      >DOF</span
                    >
                  } @else if (c.tipoCambioContexto === 'FIX') {
                    <span
                      class="rounded bg-[#FEF9C3] px-1 py-0.5 text-[10px] font-bold text-[#854D0E]"
                      title="Referencia Banxico FIX"
                      >FIX</span
                    >
                  }
                </div>
                @if (c.tipoCambioNota) {
                  <p class="text-[10px] text-[#6B717F] leading-tight mt-1">
                    {{ c.tipoCambioNota }}
                  </p>
                }
              </div>
              <div>
                <p class="text-[#9EA3AE]">IGI</p>
                <p class="font-mono-data">
                  \${{ c.igi | number: '1.2-2' }} ({{ c.igiPorcentaje * 100 | number: '1.0-2' }}%)
                </p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">DTA</p>
                <p class="font-mono-data">\${{ c.dta | number: '1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">IVA</p>
                <p class="font-mono-data">\${{ c.iva | number: '1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">PREV</p>
                <p class="font-mono-data">\${{ c.prev | number: '1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">PRV</p>
                <p class="font-mono-data">\${{ c.prv | number: '1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[#9EA3AE]">Honorarios</p>
                <p class="font-mono-data">\${{ c.honorarios | number: '1.2-2' }}</p>
              </div>
            </div>
          </div>

          <div class="card-elevated h-fit rounded-2xl p-5">
            <p class="mb-2 text-[11px] uppercase tracking-[1px] text-[#9EA3AE]">Total</p>
            <p class="font-mono-data text-[32px] font-semibold text-[#0D1017]">
              \${{ c.total | number: '1.2-2' }}
            </p>
            <div class="mt-5 space-y-2 text-[13px]">
              <div class="flex justify-between">
                <span>Impuestos</span><strong>\${{ c.impuestosTotal | number: '1.2-2' }}</strong>
              </div>
              <div class="flex justify-between">
                <span>Honorarios</span><strong>\${{ c.honorarios | number: '1.2-2' }}</strong>
              </div>
              @if (c.cargoExpress > 0) {
                <div class="flex justify-between">
                  <span>Express</span><strong>\${{ c.cargoExpress | number: '1.2-2' }}</strong>
                </div>
              }
            </div>
          </div>
        </div>

        @if (emailOpen()) {
          <div
            class="fixed inset-0 z-40 flex items-start justify-center bg-black/35 px-4 pt-[10vh] overflow-y-auto"
          >
            <div class="w-full max-w-[620px] rounded-2xl bg-white p-5 shadow-2xl my-auto">
              <div class="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-[18px] font-semibold text-[#0D1017]">Enviar por correo</h2>
                  <p class="text-[13px] text-[#6B717F]">Se adjunta el PDF de la cotizacion.</p>
                </div>
                <button
                  (click)="emailOpen.set(false)"
                  class="rounded-lg px-2 py-1 text-[13px] text-[#6B717F] hover:bg-[#F3F4F6]"
                >
                  Cerrar
                </button>
              </div>
              <label
                class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]"
                >Correo destino</label
              >
              <input
                [(ngModel)]="emailDestinatario"
                class="mb-3 w-full rounded-xl border border-[#E4E7EC] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]"
              />
              @if (plantillasEmail().length > 0) {
                <label
                  class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]"
                  >Plantilla</label
                >
                <select
                  (change)="aplicarPlantillaEmail($event)"
                  class="mb-3 w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]"
                >
                  <option value="">— Sin plantilla —</option>
                  @for (p of plantillasEmail(); track p.id) {
                    <option [value]="p.id">{{ p.codigo }}</option>
                  }
                </select>
              }
              <label
                class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]"
                >Mensaje</label
              >
              <textarea
                [(ngModel)]="emailMensaje"
                rows="5"
                class="w-full rounded-xl border border-[#E4E7EC] px-3 py-2.5 text-[13px] outline-none focus:border-[#C61D26]"
              ></textarea>
              <div class="mt-4 flex justify-end gap-2">
                <button
                  (click)="emailOpen.set(false)"
                  class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[13px] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  (click)="enviarEmail()"
                  [disabled]="sending()"
                  class="rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  {{ sending() ? 'Enviando...' : 'Enviar correo' }}
                </button>
              </div>
            </div>
          </div>
        }

        @if (whatsappOpen()) {
          <div
            class="fixed inset-0 z-40 flex items-start justify-center bg-black/35 px-4 pt-[5vh] overflow-y-auto"
          >
            <div class="w-full max-w-[660px] rounded-2xl bg-white p-5 shadow-2xl my-auto">
              <div class="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-[18px] font-semibold text-[#0D1017]">Enviar por WhatsApp</h2>
                  <p class="text-[13px] text-[#6B717F]">
                    El sistema prepara el mensaje; el envio lo confirma el usuario en WhatsApp.
                  </p>
                </div>
                <button
                  (click)="whatsappOpen.set(false)"
                  class="rounded-lg px-2 py-1 text-[13px] text-[#6B717F] hover:bg-[#F3F4F6]"
                >
                  Cerrar
                </button>
              </div>
              <label
                class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]"
                >Telefono</label
              >
              <div class="mb-3 grid grid-cols-[150px_minmax(0,1fr)] gap-2">
                <select
                  [(ngModel)]="whatsappPais"
                  class="rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#16A34A]"
                >
                  <option value="+52">🇲🇽 Mexico +52</option>
                  <option value="+1">🇺🇸 EUA +1</option>
                  <option value="+1">🇨🇦 Canada +1</option>
                </select>
                <input
                  [(ngModel)]="whatsappTelefono"
                  placeholder="8677221596"
                  class="w-full rounded-xl border border-[#E4E7EC] px-3 py-2.5 text-[13px] outline-none focus:border-[#16A34A]"
                />
              </div>
              @if (plantillasWhatsApp().length > 0) {
                <label
                  class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]"
                  >Plantilla</label
                >
                <select
                  (change)="aplicarPlantillaWhatsApp($event)"
                  class="mb-3 w-full rounded-xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#16A34A]"
                >
                  <option value="">— Sin plantilla —</option>
                  @for (p of plantillasWhatsApp(); track p.id) {
                    <option [value]="p.id">{{ p.codigo }}</option>
                  }
                </select>
              }
              <label
                class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6B717F]"
                >Mensaje</label
              >
              <textarea
                [(ngModel)]="whatsappMensaje"
                rows="3"
                class="w-full rounded-xl border border-[#E4E7EC] px-3 py-2.5 text-[13px] outline-none focus:border-[#16A34A]"
              ></textarea>
              @if (whatsappMessage()) {
                <div
                  class="mt-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[12px] text-[#166534]"
                >
                  {{ whatsappMessage() }}
                </div>
              }
              @if (whatsappError()) {
                <div
                  class="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]"
                >
                  {{ whatsappError() }}
                </div>
              }
              @if (whatsappResult(); as result) {
                <div
                  class="mt-4 max-w-full overflow-hidden rounded-xl border border-[#D8DEE8] bg-[#F8FAFC] p-3"
                >
                  <p
                    class="mb-2 text-[11px] font-semibold uppercase tracking-[0.7px] text-[#6B717F]"
                  >
                    Preview
                  </p>
                  <pre
                    class="max-h-[210px] max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-[12px] leading-5 text-[#1E2330]"
                    >{{ result.mensaje }}</pre
                  >
                </div>
              }
              <div class="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  (click)="generarWhatsApp()"
                  [disabled]="sending()"
                  class="rounded-xl border border-[#D8DEE8] px-4 py-2 text-[13px] font-semibold disabled:opacity-40"
                >
                  {{ sending() ? 'Generando...' : 'Generar link' }}
                </button>
                @if (whatsappResult(); as result) {
                  <button
                    (click)="abrirWhatsApp(result)"
                    class="rounded-xl bg-[#16A34A] px-4 py-2 text-[13px] font-semibold text-white"
                  >
                    Abrir WhatsApp
                  </button>
                  <button
                    (click)="confirmarWhatsApp()"
                    [disabled]="sending()"
                    class="rounded-xl bg-[#0D1017] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                  >
                    Marcar enviada
                  </button>
                }
              </div>
            </div>
          </div>
        }

        @if (convertOpen()) {
          <div
            class="fixed inset-0 z-40 flex items-start justify-center bg-black/35 px-4 pt-[8vh] overflow-y-auto"
            (click)="convertOpen.set(false)"
          >
            <div
              class="w-full max-w-[600px] rounded-2xl bg-white shadow-2xl my-auto"
              (click)="$event.stopPropagation()"
            >
              <!-- Header -->
              <div class="px-6 pt-6 pb-4 border-b border-[#E4E7EC]">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-[18px] font-semibold text-[#0D1017] tracking-[-0.3px]">
                      Iniciar trámite
                    </h2>
                    <p class="text-[13px] text-[#6B717F] mt-0.5">
                      La cotización se vinculará a este trámite.
                    </p>
                  </div>
                  <button
                    (click)="convertOpen.set(false)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-[#9EA3AE] hover:text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-150"
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      class="w-4 h-4 stroke-2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Resumen heredado -->
              <div class="px-6 py-4 bg-[#F8FAFC] border-b border-[#E4E7EC]">
                <p
                  class="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#9EA3AE] mb-2.5"
                >
                  Datos heredados de la cotización
                </p>
                <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                  <div class="flex justify-between gap-2">
                    <span class="text-[#6B717F]">Vehículo</span>
                    <span class="font-medium text-[#0D1017] text-right"
                      >{{ c.marca }} {{ c.modelo }} {{ c.anno || '' }}</span
                    >
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-[#6B717F]">VIN</span>
                    <span class="font-mono-data font-medium text-[#0D1017]">{{
                      c.vin || 'Sin VIN'
                    }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-[#6B717F]">Cobro total</span>
                    <span class="font-mono-data font-semibold text-[#0D1017]"
                      >\${{ c.total | number: '1.2-2' }}</span
                    >
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-[#6B717F]">Honorarios</span>
                    <span class="font-mono-data font-medium text-[#0D1017]"
                      >\${{ c.honorarios | number: '1.2-2' }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Campos operacionales -->
              <div class="px-6 py-5">
                <p
                  class="text-[10.5px] font-semibold uppercase tracking-[0.8px] text-[#9EA3AE] mb-3.5"
                >
                  Datos operacionales
                </p>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4B5162]"
                    >
                      Aduana <span class="text-[#DC2626]">*</span>
                    </label>
                    <select
                      [(ngModel)]="convertForm.aduanaCodigo"
                      class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)] transition-all"
                    >
                      <option value="">Seleccionar aduana…</option>
                      @for (a of aduanas(); track a.id) {
                        <option [value]="a.claveAduana">
                          {{ a.claveAduana }} — {{ a.nombre }}
                        </option>
                      }
                    </select>
                  </div>
                  <div>
                    <label
                      class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4B5162]"
                    >
                      Tramitador <span class="text-[#DC2626]">*</span>
                    </label>
                    <select
                      [(ngModel)]="convertForm.tramitadorId"
                      class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)] transition-all"
                    >
                      <option value="">Seleccionar tramitador…</option>
                      @for (t of tramitadores(); track t.id) {
                        <option [value]="t.id">{{ t.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label
                      class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4B5162]"
                      >Tipo de trámite</label
                    >
                    <select
                      [(ngModel)]="convertForm.tipoTramite"
                      class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)] transition-all"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="EXPRESS">Express</option>
                      <option value="ASESORIA_LOGISTICA">Asesoría logística</option>
                    </select>
                  </div>
                  <div>
                    <label
                      class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4B5162]"
                      >Notas adicionales</label
                    >
                    <textarea
                      [(ngModel)]="convertForm.notasAdicionales"
                      rows="2"
                      class="w-full rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none focus:bg-white focus:border-[#C61D26] focus:shadow-[0_0_0_3px_rgba(198,29,38,0.10)] transition-all resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div
                class="px-6 pb-6 flex items-center justify-end gap-3 border-t border-[#E4E7EC] pt-4"
              >
                <button
                  (click)="convertOpen.set(false)"
                  class="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#6B717F] hover:text-[#1E2330] hover:bg-[#F3F4F6] transition-all duration-150"
                >
                  Cancelar
                </button>
                <button
                  (click)="convertirATramite()"
                  [disabled]="
                    converting() || !convertForm.aduanaCodigo || !convertForm.tramitadorId
                  "
                  class="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] disabled:opacity-40"
                >
                  @if (converting()) {
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Iniciando trámite…
                  } @else {
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      class="w-3.5 h-3.5 stroke-2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    Iniciar trámite
                  }
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="p-12 text-center text-[#9EA3AE]">Cargando cotizacion...</div>
    }
  `,
})
export class CotizacionDetailComponent {
  private service = inject(CotizacionService);
  private clienteService = inject(ClienteService);
  private aduanaService = inject(AduanaService);
  private tramitadorService = inject(TramitadorService);
  private plantillaService = inject(PlantillaMensajeService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  cotizacion = signal<CotizacionOutput | null>(null);
  emailOpen = signal(false);
  whatsappOpen = signal(false);
  whatsappResult = signal<WhatsAppLinkResponse | null>(null);
  actionMessage = signal<string | null>(null);
  actionError = signal<string | null>(null);
  whatsappMessage = signal<string | null>(null);
  whatsappError = signal<string | null>(null);
  sending = signal(false);
  accepting = signal(false);
  clienteDetail = signal<ClienteDetailDto | null>(null);
  convertOpen = signal(false);
  converting = signal(false);
  aduanas = signal<AduanaDto[]>([]);
  tramitadores = signal<TramitadorDto[]>([]);
  plantillas = signal<PlantillaMensajeDto[]>([]);

  plantillasEmail = computed(() =>
    this.plantillas().filter(p => p.activa && p.codigo.toUpperCase().includes('EMAIL'))
  );
  plantillasWhatsApp = computed(() =>
    this.plantillas().filter(p => p.activa && p.codigo.toUpperCase().includes('WHATSAPP'))
  );

  emailDestinatario = '';
  emailMensaje = '';
  whatsappTelefono = '';
  whatsappPais = '+52';
  whatsappMensaje = '';
  convertForm = {
    aduanaCodigo: '',
    tramitadorId: '',
    tipoTramite: 'NORMAL',
    notasAdicionales: '',
  };

  constructor() {
    this.reload();
    this.aduanaService.getAll().subscribe(items => this.aduanas.set(items));
    this.tramitadorService.getAll(true).subscribe(items => this.tramitadores.set(items));
    this.plantillaService.getAll().subscribe(items => this.plantillas.set(items));
  }

  verPdf(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.service.getPdf(c.id).subscribe({
      next: blob => window.open(URL.createObjectURL(blob), '_blank'),
      error: () => this.actionError.set('No se pudo generar el PDF.'),
    });
  }

  descargarPdf(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.service.getPdf(c.id, true).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cotizacion-${c.folio || c.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.actionError.set('No se pudo descargar el PDF.'),
    });
  }

  aplicarPlantillaEmail(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) return;
    const plantilla = this.plantillas().find(p => p.id === id);
    if (plantilla) this.emailMensaje = plantilla.cuerpo;
  }

  aplicarPlantillaWhatsApp(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) return;
    const plantilla = this.plantillas().find(p => p.id === id);
    if (plantilla) this.whatsappMensaje = plantilla.cuerpo;
  }

  openEmail(): void {
    this.actionError.set(null);
    this.actionMessage.set(null);
    const c = this.cotizacion();
    this.emailDestinatario = c?.clienteEmail || '';
    this.emailMensaje = '';
    this.emailOpen.set(true);
  }

  enviarEmail(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.sending.set(true);
    this.service.enviarEmail(c.id, this.emailDestinatario, this.emailMensaje || null).subscribe({
      next: () => {
        this.sending.set(false);
        this.emailOpen.set(false);
        this.actionMessage.set('Cotizacion enviada por correo.');
        this.reload();
      },
      error: err => {
        this.sending.set(false);
        this.actionError.set(err?.error?.message || 'No se pudo enviar el correo.');
      },
    });
  }

  openWhatsApp(): void {
    this.actionError.set(null);
    this.actionMessage.set(null);
    this.whatsappError.set(null);
    this.whatsappMessage.set(null);
    this.whatsappResult.set(null);
    const c = this.cotizacion();
    this.whatsappTelefono = this.stripCountryCode(c?.clienteTelefono || '');
    this.whatsappMensaje = '';
    this.whatsappOpen.set(true);
  }

  generarWhatsApp(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.whatsappError.set(null);
    this.whatsappMessage.set(null);
    this.sending.set(true);
    this.service
      .whatsappLink(c.id, this.fullWhatsappPhone(), this.whatsappMensaje || null)
      .subscribe({
        next: result => {
          this.sending.set(false);
          this.whatsappResult.set(result);
          this.whatsappMessage.set(
            'Link generado. Revisa el preview y abre WhatsApp cuando estes listo.'
          );
        },
        error: err => {
          this.sending.set(false);
          this.whatsappError.set(err?.error?.message || 'No se pudo generar el link de WhatsApp.');
        },
      });
  }

  abrirWhatsApp(result: WhatsAppLinkResponse): void {
    window.open(result.whatsappUrl, '_blank');
  }

  confirmarWhatsApp(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.sending.set(true);
    this.service
      .marcarEnviada(c.id, 'WHATSAPP', this.fullWhatsappPhone(), this.whatsappMensaje || null)
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.maybeSaveClientePhone();
          this.whatsappOpen.set(false);
          this.actionMessage.set('Cotizacion marcada como enviada por WhatsApp.');
          this.reload();
        },
        error: () => {
          this.sending.set(false);
          this.whatsappError.set('No se pudo marcar como enviada.');
        },
      });
  }

  async recalcular(): Promise<void> {
    const c = this.cotizacion();
    if (!c?.id) return;
    const confirmed = await this.notifications.confirm({
      title: 'Recalcular cotizacion',
      message: 'Se actualizaran importes usando tipo de cambio y catalogos actuales.',
      confirmText: 'Recalcular',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    this.sending.set(true);
    this.service.recalcular(c.id).subscribe({
      next: next => {
        this.sending.set(false);
        this.cotizacion.set(next);
        this.actionMessage.set('Cotizacion recalculada con datos actuales.');
      },
      error: err => {
        this.sending.set(false);
        this.actionError.set(err?.error?.message || 'No se pudo recalcular la cotizacion.');
      },
    });
  }

  openConvertir(): void {
    this.actionError.set(null);
    this.convertOpen.set(true);
  }

  convertirATramite(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.converting.set(true);
    this.service
      .convertirATramite(c.id, {
        aduanaCodigo: this.convertForm.aduanaCodigo,
        tramitadorId: this.convertForm.tramitadorId,
        tipoTramite: this.convertForm.tipoTramite,
        notasAdicionales: this.convertForm.notasAdicionales || null,
      })
      .subscribe({
        next: tramite => {
          this.converting.set(false);
          this.convertOpen.set(false);
          this.router.navigate(['/tramites', tramite.id]);
        },
        error: err => {
          this.converting.set(false);
          this.actionError.set(err?.error?.message || 'No se pudo convertir la cotizacion.');
        },
      });
  }

  aceptar(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    this.actionError.set(null);
    this.actionMessage.set(null);
    this.accepting.set(true);
    this.service.aceptar(c.id).subscribe({
      next: () => {
        this.accepting.set(false);
        this.actionMessage.set('Cotizacion aceptada. Completa los datos para iniciar el tramite.');
        this.reload(updated => {
          if (!updated.tramiteId) this.openConvertir();
        });
      },
      error: err => {
        this.accepting.set(false);
        this.actionError.set(err?.error?.message || 'No se pudo aceptar la cotizacion.');
      },
    });
  }

  rechazar(): void {
    const c = this.cotizacion();
    if (!c?.id) return;
    const motivo = prompt('Motivo de rechazo') || 'Sin motivo';
    this.service.rechazar(c.id, motivo).subscribe(() => this.reload());
  }

  pill(estado: string): string {
    const map: Record<string, string> = {
      BORRADOR: 'background:#F3F4F6;color:#4B5162;',
      ENVIADA: 'background:#DBEAFE;color:#1E40AF;',
      ACEPTADA: 'background:#DCFCE7;color:#166534;',
      RECHAZADA: 'background:#FEE2E2;color:#991B1B;',
    };
    return map[estado] || map['BORRADOR'];
  }

  private reload(afterLoad?: (cotizacion: CotizacionOutput) => void): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.getById(id).subscribe(c => {
      this.cotizacion.set(c);
      afterLoad?.(c);
      if (c.clienteId) {
        this.clienteService.getById(c.clienteId).subscribe(cliente => {
          this.clienteDetail.set(cliente);
          if (!this.whatsappTelefono)
            this.whatsappTelefono = this.stripCountryCode(cliente.telefono || '');
          if (!this.emailDestinatario) this.emailDestinatario = cliente.email || '';
        });
      }
    });
  }

  private fullWhatsappPhone(): string {
    const local = this.onlyDigits(this.whatsappTelefono);
    const country = this.whatsappPais.replace('+', '');
    return `${country}${local}`;
  }

  private stripCountryCode(value: string): string {
    const digits = this.onlyDigits(value);
    if (digits.startsWith('52') && digits.length > 10) return digits.slice(2);
    if (digits.startsWith('1') && digits.length > 10) return digits.slice(1);
    return digits;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private async maybeSaveClientePhone(): Promise<void> {
    const cliente = this.clienteDetail();
    const c = this.cotizacion();
    if (!cliente || !c?.clienteId || cliente.telefono || !this.whatsappTelefono) return;
    const name = cliente.nombreCompleto || cliente.apodo;
    const confirmed = await this.notifications.confirm({
      title: 'Guardar telefono del cliente',
      message: `Este cliente no tiene telefono guardado. Quieres guardar este telefono para ${name}?`,
      confirmText: 'Guardar telefono',
      cancelText: 'Omitir',
    });
    if (!confirmed) return;
    this.clienteService
      .update(c.clienteId, {
        apodo: cliente.apodo,
        nombreCompleto: cliente.nombreCompleto,
        rfc: cliente.rfc,
        telefono: this.fullWhatsappPhone(),
        email: cliente.email,
        procedencia: cliente.procedencia,
        direccion: cliente.direccion,
        notas: cliente.notas,
      })
      .subscribe();
  }
}
