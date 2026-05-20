import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramiteService, TramiteDetailDto, TramitePagoDto } from '../../services/tramite.service';
import { PagoService } from '../../services/pago.service';
import { GastoHormigaService, TipoGastoDto } from '../../services/gasto-hormiga.service';
import { BancoDto, BancoService } from '../../services/banco.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { PortalService } from '../../services/portal.service';

@Component({
  selector: 'app-tramite-detail',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, FormsModule],
  template: `
    <div style="font-family: var(--font-body);">

      <!-- Back -->
      <button (click)="router.navigate(['/tramites'])"
        class="flex items-center gap-1.5 text-[12.5px] text-[#9EA3AE] hover:text-[#0D1017] transition-colors mb-4">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7l-7-7 7-7"/>
        </svg>
        Volver a trámites
      </button>

      @if (tramite()) {
        @let t = tramite()!;

        <!-- Header -->
        <div class="flex items-start justify-between mb-6 gap-4">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-[28px] font-bold text-[#0D1017] tracking-[-0.8px]">{{ t.numeroConsecutivo }}</h1>
              <span class="px-3 py-1 rounded-lg text-[12px] font-semibold" [style]="estadoPill(t.estatus)">{{ t.estatus }}</span>
              <span class="text-[12px] text-[#9EA3AE] font-mono-data">{{ t.diasEnEstado }} días en este estado</span>
            </div>
            <p class="text-[13px] text-[#6B717F]">Creado {{ t.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-wrap">
            <button (click)="openPortal(t.id)" class="px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-[#FFF1F1] text-[#A31820] border border-[#FFC5C5] hover:bg-[#FFE0E0] transition-colors">
              Portal cliente
            </button>
            @if (!esTerminal(t.estatus)) {
              @if (auth.can('TRAMITES_EDITAR') && esFinalizable(t.estatus)) {
                <button (click)="showFinalizarModal = true" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors shadow-sm">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Entregar vehículo
                </button>
              }
              @if (auth.can('TRAMITES_EDITAR')) {
                <button (click)="showCambiarEstado = true" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#0D1017] text-white hover:bg-[#1E2330] transition-colors">
                  Cambiar estado
                </button>
                <button (click)="showPedimento = true" [disabled]="hasPedimento(t)" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#F3F4F6] text-[#4B5162] border border-[#E4E7EC] hover:bg-[#E4E7EC] transition-colors disabled:opacity-45" [title]="hasPedimento(t) ? 'Este trámite ya tiene pedimento registrado' : 'Agregar pedimento'">
                  {{ hasPedimento(t) ? 'Pedimento listo' : '+ Pedimento' }}
                </button>
                <button (click)="showEntrega = true" [disabled]="hasEntrega(t)" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#F3F4F6] text-[#4B5162] border border-[#E4E7EC] hover:bg-[#E4E7EC] transition-colors disabled:opacity-45" [title]="hasEntrega(t) ? 'Este trámite ya tiene entrega registrada' : 'Registrar entrega'">
                  {{ hasEntrega(t) ? 'Entrega lista' : '+ Entrega' }}
                </button>
                @if (hasCampo(t)) {
                  <span class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#FFF1F1] text-[#A31820] border border-[#FFC5C5]">
                    Campo listo
                  </span>
                }
              }
              @if (auth.can('EVENTOS_CREAR')) {
                <button (click)="showNota = true" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#F3F4F6] text-[#4B5162] border border-[#E4E7EC] hover:bg-[#E4E7EC] transition-colors">
                  + Nota
                </button>
              }
            }
          </div>
        </div>

        <!-- Banner estado terminal -->
        @if (t.estatus === 'ENTREGADO_AL_CLIENTE') {
          <div class="card-elevated mb-6 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-[#16A34A]"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <p class="text-[13px] font-semibold text-[#166534]">Trámite finalizado — Vehículo entregado</p>
                <p class="text-[12px] text-[#4B7C59]">El vehículo fue entregado con su papelería. El historial operativo está cerrado. Consulta Pagos para ver el saldo.</p>
              </div>
            </div>
            @if (t.entregas.length > 0) {
              <div class="sm:border-l border-[#BBF7D0] sm:pl-4">
                <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4B7C59] mb-0.5">Vehículo Entregado</p>
                <p class="text-[13px] font-semibold text-[#166534]">{{ t.entregas[t.entregas.length - 1].fechaEntrega | date:'dd/MM/yyyy HH:mm' }}</p>
                <p class="text-[11px] text-[#4B7C59]">{{ t.entregas[t.entregas.length - 1].ubicacionEntrega || 'Sin ubicación especificada' }}</p>
              </div>
            }
          </div>
        }
        @if (t.estatus === 'CANCELADO') {
          <div class="card-elevated mb-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-[#DC2626]"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <div>
              <p class="text-[13px] font-semibold text-[#991B1B]">Trámite cancelado</p>
              <p class="text-[12px] text-[#7F1D1D]">Este trámite fue cancelado. Consulta el timeline para ver el motivo registrado.</p>
            </div>
          </div>
        }

        <!-- Summary cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="card-elevated rounded-xl p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1">Cliente</p>
            <p class="text-[15px] font-semibold text-[#0D1017]">{{ t.clienteApodo || '—' }}</p>
            <p class="text-[12px] text-[#6B717F]">{{ t.clienteNombre || '' }}</p>
          </div>
          <div class="card-elevated rounded-xl p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1">Vehículo</p>
            <p class="text-[15px] font-semibold text-[#0D1017]">{{ t.vehiculoMarca ? t.vehiculoMarca + ' ' + (t.vehiculoModelo || '') : t.descripcionMercancia || '—' }}</p>
            <p class="text-[12px] text-[#6B717F] font-mono-data">{{ t.vehiculoVin || '' }}</p>
          </div>
          <div class="card-elevated rounded-xl p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] mb-1">Cobro</p>
            <p class="text-[15px] font-semibold text-[#0D1017]">{{ t.cobroTotal | currency:'USD':'symbol':'1.2-2' }}</p>
            <p class="text-[12px]" [style.color]="t.saldoPendiente > 0 ? '#D97706' : '#16A34A'">
              Saldo: {{ t.saldoPendiente | currency:'USD':'symbol':'1.2-2' }}
            </p>
          </div>
        </div>

        @if (t.cotizacionOrigenId) {
          <div class="card-elevated mb-6 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[13px] font-semibold text-[#1E40AF]">Originado en cotizacion #{{ t.cotizacionOrigenFolio }}</p>
                <p class="text-[12px] text-[#4B5563]">Cotizada {{ t.cotizacionFecha | date:'dd/MM/yyyy' }} / convertida {{ t.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <button (click)="router.navigate(['/cotizaciones', t.cotizacionOrigenId])" class="rounded-xl bg-[#DBEAFE] px-3 py-2 text-[12px] font-semibold text-[#1E40AF]">Ver cotizacion</button>
            </div>
          </div>
        }

        <!-- Tabs -->
        <div class="flex items-center gap-1 mb-4">
          @for (tab of tabs; track tab.key) {
            <button (click)="activeTab.set(tab.key)"
              class="px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150"
              [style]="activeTab() === tab.key ? 'background: #0D1017; color: #fff;' : 'color: #6B717F; hover:background: #F3F4F6;'">
              {{ tab.label }}
            </button>
          }
        </div>

        @if (activeTab() === 'timeline') {
          <div class="card-elevated rounded-2xl p-5">
            @if (t.eventos.length === 0) {
              <p class="text-[13px] text-[#9EA3AE] text-center py-8">Sin eventos registrados</p>
            }
            @for (e of t.eventos; track e.id) {
              <div class="flex gap-3 pb-5 relative border-l-2 border-[#E4E7EC] pl-4 ml-2 last:pb-0">
                <div class="w-3 h-3 rounded-full absolute -left-[7px] top-1" [style]="eventoColor(e.tipo)"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-[12px] font-semibold text-[#0D1017]">{{ tipoLabel(e.tipo) }}</span>
                    <span class="text-[11px] text-[#9EA3AE] font-mono-data">{{ e.fechaEvento | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  @if (e.estadoAnterior && e.estadoNuevo) {
                    <p class="text-[12.5px] text-[#6B717F] mb-1">
                      {{ e.estadoAnterior }} → {{ e.estadoNuevo }}
                    </p>
                  }
                  <p class="text-[13px] text-[#1E2330]">{{ e.contenido }}</p>
                </div>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'pedimentos') {
          <div class="card-elevated rounded-2xl overflow-hidden">
            @if (t.pedimentos.length === 0) {
              <p class="text-[13px] text-[#9EA3AE] text-center py-8">Sin pedimentos registrados</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[500px]">
                  <thead>
                    <tr class="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9EA3AE] border-b border-[#E4E7EC]">
                      <th class="text-left px-4 py-3">Número</th>
                      <th class="text-left px-4 py-3">Tipo</th>
                      <th class="text-left px-4 py-3">Fecha</th>
                      <th class="text-right px-4 py-3">Cobro adicional</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of t.pedimentos; track p.id) {
                      <tr class="text-[13px] border-b border-[#F3F4F6]">
                        <td class="px-4 py-3 font-mono-data font-semibold">{{ p.numeroPedimento }}</td>
                        <td class="px-4 py-3">{{ p.tipo }}</td>
                        <td class="px-4 py-3 text-[#6B717F]">{{ p.fechaEntrada | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-3 text-right font-mono-data">{{ p.cobroAdicional | currency }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'entregas') {
          <div class="card-elevated rounded-2xl p-6">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h3 class="text-[18px] font-bold text-[#111827]">Historial de Entregas</h3>
                <p class="text-[13px] text-[#6B7280]">Acuses de recibo generados en el sistema</p>
              </div>
              <button (click)="showEntrega = true" class="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#111827] text-white hover:bg-[#1F2937] transition-all shadow-md shadow-gray-900/10">
                Registrar Entrega
              </button>
            </div>

            @if (t.entregas.length === 0) {
              <div class="text-center py-12 rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB]">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#E5E7EB]">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-6 h-6 text-[#9CA3AF]"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <p class="text-[14px] font-medium text-[#4B5563]">Sin entregas registradas</p>
                <p class="text-[13px] text-[#9CA3AF] mt-1">Registra la evidencia física al entregar la unidad.</p>
              </div>
            }

            <div class="space-y-4">
              @for (e of t.entregas; track e.id) {
                <div class="border border-[#E5E7EB] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div class="px-5 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <span class="inline-block px-2.5 py-1 bg-[#ECFDF5] text-[#059669] text-[11px] font-bold rounded-md uppercase tracking-[0.5px] mb-2 border border-[#A7F3D0]">Acuse Oficial</span>
                      <h4 class="text-[15px] font-bold text-[#111827]">{{ e.fechaEntrega | date:'EEEE dd/MM/yyyy HH:mm' }}</h4>
                      <p class="text-[13px] text-[#4B5563] mt-1">Ubicación: <span class="font-semibold text-[#111827]">{{ e.ubicacionEntrega || 'Yarda' }}</span></p>
                    </div>
                    <div class="text-right">
                      <p class="text-[12px] text-[#6B7280] uppercase tracking-[0.5px] font-semibold mb-1">Entregado a</p>
                      <p class="text-[14px] font-bold text-[#111827]">{{ e.nombreRecibe || '—' }}</p>
                      <p class="text-[12px] text-[#6B7280] mt-1">Registró: {{ e.responsableCampoNombre || e.recibidoPorPartnerNombre || 'Administración' }}</p>
                    </div>
                  </div>

                  <div class="px-5 py-4 flex flex-col md:flex-row gap-6">
                    <div class="flex-1">
                      <h5 class="text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-2">Documentación Validada</h5>
                      @if (e.documentosEntregados && e.documentosEntregados.length) {
                        <div class="flex flex-wrap gap-2">
                          @for (doc of e.documentosEntregados; track doc) {
                            <span class="px-3 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-lg text-[13px] font-medium border border-[#E5E7EB] flex items-center gap-1.5">
                              <svg class="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                              {{ doc }}
                            </span>
                          }
                        </div>
                      } @else {
                        <p class="text-[13px] text-[#9CA3AF] italic">No se registró lista de documentos.</p>
                      }

                      @if (e.descripcion) {
                        <div class="mt-4 pt-4 border-t border-[#F3F4F6]">
                          <h5 class="text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-1">Notas</h5>
                          <p class="text-[13px] text-[#374151] leading-relaxed">{{ e.descripcion }}</p>
                        </div>
                      }
                    </div>

                    @if (e.fotoEvidenciaUrl || e.firmaBase64) {
                      <div class="w-full md:w-48 shrink-0 flex flex-col gap-2">
                        <h5 class="text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px]">Evidencia</h5>
                        @if (e.fotoEvidenciaUrl) {
                          <a [href]="fileUrl(e.fotoEvidenciaUrl)" target="_blank" class="block w-full aspect-video rounded-xl border border-[#E5E7EB] overflow-hidden hover:border-[#111827] transition-colors relative group">
                            <img [src]="fileUrl(e.fotoEvidenciaUrl)" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span class="text-white text-[12px] font-semibold">Ver archivo</span>
                            </div>
                          </a>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'documentos') {
          <div class="card-elevated rounded-2xl p-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              @for (doc of documentosBase; track doc.tipoDocumento) {
                <div class="rounded-xl border border-[#E4E7EC] p-4">
                  @let actual = findDocumento(t, doc.tipoDocumento);
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p class="text-[13px] font-semibold text-[#0D1017]">{{ doc.nombre }}</p>
                      <p class="text-[11px] text-[#9EA3AE]">{{ doc.descripcion }}</p>
                    </div>
                    <span class="px-2 py-1 rounded-lg text-[11px] font-semibold" [style]="documentoPill(actual?.estatus || 'PENDIENTE')">{{ actual?.estatus || 'PENDIENTE' }}</span>
                  </div>
                  <div class="flex flex-col gap-3 mt-3">
                    @if (actual?.archivoUrl) {
                      <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2">
                          <a [href]="fileUrl(actual!.archivoUrl!)" target="_blank" class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#F3F4F6] text-[#374151] rounded-xl text-[12px] font-semibold border border-[#E5E7EB] hover:bg-[#E5E7EB] transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            Ver Archivo
                          </a>
                          <label class="px-3 py-2 bg-white text-[#4B5563] rounded-xl text-[12px] font-semibold border border-[#E5E7EB] cursor-pointer hover:bg-[#F9FAFB] transition-colors relative" title="Reemplazar archivo">
                            @if (uploadingDoc === doc.tipoDocumento) {
                              <svg class="w-4 h-4 animate-spin text-[#0D1017]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            } @else {
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                              <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" (change)="onDocumentoFileSelected($event, doc.tipoDocumento, actual?.estatus || 'RECIBIDO')">
                            }
                          </label>
                        </div>
                      </div>
                    } @else {
                      <label class="w-full flex flex-col items-center justify-center py-4 border-2 border-dashed border-[#E5E7EB] rounded-xl cursor-pointer bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors relative">
                        @if (uploadingDoc === doc.tipoDocumento) {
                          <svg class="w-6 h-6 animate-spin text-[#0D1017] mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span class="text-[12px] font-medium text-[#4B5563]">Subiendo...</span>
                        } @else {
                          <svg class="w-6 h-6 text-[#9CA3AF] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                          <span class="text-[12px] font-medium text-[#4B5563]">Subir archivo (Requerido)</span>
                          <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" (change)="onDocumentoFileSelected($event, doc.tipoDocumento, 'RECIBIDO')">
                        }
                      </label>
                    }

                    <div class="grid grid-cols-2 gap-2 mt-1">
                      <button (click)="guardarDocumento(t.id, doc.tipoDocumento, 'RECIBIDO', actual?.archivoUrl)" [disabled]="!actual?.archivoUrl" [class.opacity-50]="!actual?.archivoUrl" class="rounded-xl border border-[#E4E7EC] px-3 py-2 text-[12px] font-medium hover:bg-[#F9FAFB] transition-colors">Recibido</button>
                      <button (click)="guardarDocumento(t.id, doc.tipoDocumento, 'VALIDADO', actual?.archivoUrl)" [disabled]="!actual?.archivoUrl" [class.opacity-50]="!actual?.archivoUrl" class="rounded-xl bg-[#0D1017] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#1F2937] transition-colors">Validado</button>
                    </div>
                  </div>
                </div>
              }
            </div>

            @if (t.tareasCampo.length) {
              <h3 class="text-[14px] font-semibold mb-3">Tareas de campo</h3>
              @for (tc of t.tareasCampo; track tc.id) {
                <div class="border-t border-[#F3F4F6] py-3 text-[13px]">
                  <div class="flex justify-between gap-3 mb-2">
                    <div>
                      <p class="font-semibold">{{ tc.tipo }} · {{ tc.estatus }}</p>
                      <p class="text-[#6B717F]">{{ tc.personalCampoNombre || 'Abierta' }} · {{ tc.ubicacion || 'Sin ubicación' }}</p>
                      @if (tc.vinConfirmado) {
                        <p class="text-[#6B717F] mt-1">VIN Confirmado: <span class="font-mono-data font-semibold text-[#0D1017]">{{ tc.vinConfirmado }}</span></p>
                      }
                      @if (tc.incidencia) {
                        <p class="text-[#991B1B] mt-1 bg-[#FEF2F2] px-2 py-1 rounded-md inline-block border border-[#FEE2E2]">Incidencia: {{ tc.incidencia }}</p>
                      }
                    </div>
                    <p class="text-[#9EA3AE]">{{ tc.fechaCreacion | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <!-- Botones compartir: solo si la tarea está activa -->
                  @if (tc.estatus === 'ABIERTA' || tc.estatus === 'TOMADA' || tc.estatus === 'EN_YARDA') {
                    <div class="flex gap-2 mt-2 mb-1">
                      <button
                        (click)="copiarEnlaceCampo(tc.id)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F3F4F6] text-[#374151] border border-[#E4E7EC] hover:bg-[#E9EBF0] transition-colors">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/>
                        </svg>
                        Copiar enlace
                      </button>
                      <a
                        [href]="whatsappEnlaceCampo(tc.id, vehiculoLabel(t), t.vehiculoVin)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] hover:bg-[#BBF7D0] transition-colors">
                        <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </div>
                  }
                  @if (tc.fotosUrls && tc.fotosUrls.length > 0) {
                    <div class="flex flex-wrap gap-2 mt-2">
                      @for (foto of tc.fotosUrls; track foto) {
                        <a [href]="fileUrl(foto)" target="_blank" class="block w-16 h-16 rounded-lg border border-[#E4E7EC] overflow-hidden hover:border-[#0D1017] transition-colors relative group">
                          <img [src]="fileUrl(foto)" class="w-full h-full object-cover">
                          <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                          </div>
                        </a>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        }

        @if (activeTab() === 'gastos') {
          <div class="card-elevated rounded-2xl p-5">
            @if (auth.can('GASTOS_REGISTRAR')) {
              <div class="flex justify-end mb-3">
                <button (click)="openGastoModal()" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#0D1017] text-white">Nuevo gasto</button>
              </div>
            }
            @if (t.gastosHormiga.length === 0) {
              <p class="text-[13px] text-[#9EA3AE] text-center py-8">Sin gastos hormiga registrados</p>
            }
            @for (g of t.gastosHormiga; track g.id) {
              <div class="flex justify-between items-center border-b border-[#F3F4F6] py-2 last:border-0">
                <div>
                  <p class="text-[13px]">{{ g.concepto }}</p>
                  <p class="text-[11px] text-[#9EA3AE]">{{ g.fechaGasto | date:'dd/MM/yyyy' }} | {{ g.tipoGasto || '—' }} | {{ g.seCargaAlCliente ? 'Cargable' : 'Costo propio' }}</p>
                </div>
                <p class="text-[13px] font-mono-data font-semibold">{{ g.monto | currency:g.moneda }}</p>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'pagos') {
          <div class="card-elevated rounded-2xl p-5">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Cobro total</p><p class="text-[15px] font-semibold">{{ t.cobroTotal | currency:'MXN' }}</p></div>
              <div><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Total pagado</p><p class="text-[15px] font-semibold">{{ t.totalPagado | currency:'MXN' }}</p></div>
              <div><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Verificado</p><p class="text-[15px] font-semibold">{{ totalVerificado(t) | currency:'MXN' }}</p></div>
              <div><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Saldo</p><p class="text-[15px] font-semibold">{{ t.saldoPendiente | currency:'MXN' }}</p></div>
            </div>
            @if (auth.can('PAGOS_REGISTRAR')) {
              <div class="flex justify-end mb-3">
                <button (click)="openPagoModal()" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#0D1017] text-white">Registrar pago</button>
              </div>
            }
            @if (t.pagos.length === 0) {
              <p class="text-[13px] text-[#9EA3AE] text-center py-8">Sin pagos registrados</p>
            }
              <div class="overflow-x-auto">
                <div class="min-w-[700px]">
                  @for (p of t.pagos; track p.id) {
                    <div class="grid grid-cols-[100px_1fr_80px_105px_88px_64px_54px] gap-3 items-center border-b border-[#F3F4F6] py-2 last:border-0 text-[13px]">
                <span class="text-[#6B717F]">{{ p.fechaPago | date:'dd/MM/yyyy' }}</span>
                <span>{{ p.metodo }} {{ p.banco ? '|' + p.banco : '' }}</span>
                <span class="font-mono-data">{{ p.tipoCambio || '—' }}</span>
                <span class="text-right font-mono-data">{{ p.monto | currency:p.moneda }}</span>
                <span class="px-2 py-1 rounded-lg text-[11px] font-semibold text-center" [style]="p.verificado ? 'background:#DCFCE7;color:#166534;' : 'background:#FEF3C7;color:#92400E;'">{{ p.verificado ? 'Verificado' : 'Pendiente' }}</span>
                <a [href]="reciboUrl(p)" target="_blank" class="text-right text-[12px] font-medium text-[#C61D26]">Recibo</a>
                <button (click)="deletePago(p.id, p.monto, p.moneda)" class="text-right text-[12px] font-medium text-[#991B1B]">Borrar</button>
              </div>
                  }
                </div>
              </div>
          </div>
        }
      } @else {
        <div class="card-elevated rounded-2xl p-16 text-center">
          <p class="text-[14px] text-[#9EA3AE]">Cargando…</p>
        </div>
      }

      <!-- Modal: Cambiar estado -->
      @if (showCambiarEstado) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh] px-4 overflow-y-auto" (click)="showCambiarEstado = false">
          <div class="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-xl my-auto" (click)="$event.stopPropagation()">
            <h3 class="text-[16px] font-semibold mb-4">Cambiar estado</h3>
            <select [(ngModel)]="nuevoEstado" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-3">
              <option value="">Seleccionar estado…</option>
              @for (est of getEstadosPermitidos(); track est) {
                <option [value]="est">{{ est }}</option>
              }
            </select>
            <textarea [(ngModel)]="notasEstado" placeholder="Notas (opcional)" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mb-3" rows="2"></textarea>
            <div class="flex justify-end gap-2">
              <button (click)="showCambiarEstado = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button (click)="doCambiarEstado()" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Confirmar</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Pedimento -->
      @if (showPedimento) {
        <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-start justify-center pt-[8vh] px-4 overflow-y-auto" (click)="showPedimento = false">
          <div class="bg-white rounded-[24px] p-6 md:p-8 w-full max-w-[480px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#E4E7EC] my-auto" (click)="$event.stopPropagation()">
            <div class="mb-6">
              <h3 class="text-[20px] font-bold text-[#0D1017] tracking-[-0.5px]">Agregar Pedimento</h3>
              <p class="text-[13px] text-[#6B717F]">Registra la información oficial del despacho</p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-[12px] font-semibold text-[#9EA3AE] uppercase tracking-[0.5px] mb-1.5 ml-1">Número de pedimento</label>
                <input [(ngModel)]="pedForm.numero" placeholder="Ej. 24 00 3000 4000123" class="w-full px-4 py-3 rounded-xl border border-[#E4E7EC] text-[14px] font-mono-data focus:border-[#C61D26] focus:ring-4 focus:ring-[#C61D26]/5 outline-none transition-all bg-[#F9FAFB]">
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[12px] font-semibold text-[#9EA3AE] uppercase tracking-[0.5px] mb-1.5 ml-1">Tipo</label>
                  <select [(ngModel)]="pedForm.tipo" class="w-full px-4 py-3 rounded-xl border border-[#E4E7EC] text-[14px] focus:border-[#C61D26] focus:ring-4 focus:ring-[#C61D26]/5 outline-none transition-all bg-white">
                    <option value="ORIGINAL">Original</option>
                    <option value="R1">Rectificación R1</option>
                    <option value="R2">Rectificación R2</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[12px] font-semibold text-[#9EA3AE] uppercase tracking-[0.5px] mb-1.5 ml-1">Cobro Adic.</label>
                  <input [(ngModel)]="pedForm.cobroAdicional" type="number" step="0.01" class="w-full px-4 py-3 rounded-xl border border-[#E4E7EC] text-[14px] focus:border-[#C61D26] outline-none bg-white">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[12px] font-semibold text-[#9EA3AE] uppercase tracking-[0.5px] mb-1.5 ml-1">Fecha Entrada</label>
                  <input [(ngModel)]="pedForm.fechaEntrada" type="date" class="w-full px-4 py-3 rounded-xl border border-[#E4E7EC] text-[14px] outline-none bg-white">
                </div>
                <div>
                  <label class="block text-[12px] font-semibold text-[#9EA3AE] uppercase tracking-[0.5px] mb-1.5 ml-1">Fecha Pago</label>
                  <input [(ngModel)]="pedForm.fechaPago" type="date" class="w-full px-4 py-3 rounded-xl border border-[#E4E7EC] text-[14px] outline-none bg-white">
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 mt-8">
              <button (click)="showPedimento = false" class="flex-1 px-4 py-3 rounded-xl text-[14px] font-semibold text-[#4B5162] bg-[#F3F4F6] hover:bg-[#E4E7EC] transition-colors">
                Cancelar
              </button>
              <button (click)="doAgregarPedimento()" [disabled]="!pedForm.numero" class="flex-1 px-4 py-3 rounded-xl text-[14px] font-semibold bg-[#0D1017] text-white hover:bg-[#1E2330] transition-colors disabled:opacity-40">
                Guardar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Entrega Formal -->
      @if (showEntrega) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[8vh] px-4 overflow-y-auto backdrop-blur-sm" (click)="showEntrega = false">
          <div class="bg-white rounded-2xl w-full max-w-[600px] shadow-2xl my-auto overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
            <div class="px-6 py-5 border-b border-[#F3F4F6] flex justify-between items-center bg-[#FAFAFA]">
              <div>
                <h3 class="text-[18px] font-bold text-[#111827]">Acuse de Recibo / Entrega Oficial</h3>
                <p class="text-[13px] text-[#6B7280] mt-1">Registra la entrega formal del vehículo y documentos</p>
              </div>
              <button (click)="showEntrega = false" class="text-[#9CA3AF] hover:text-[#4B5563] transition-colors p-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-6 h-6 stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="px-6 py-5 overflow-y-auto max-h-[60vh]">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label class="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-1.5 ml-1">Ubicación de Entrega</label>
                  <input [(ngModel)]="entForm.ubicacion" placeholder="Ej. Yarda Nuevo Laredo" class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[14px] outline-none focus:border-[#C61D26] focus:ring-4 focus:ring-[#C61D26]/5 transition-all bg-white">
                </div>
                <div>
                  <label class="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-1.5 ml-1">Entregado a (Nombre Completo)</label>
                  <input [(ngModel)]="entForm.nombreRecibe" placeholder="Nombre de quien recibe" class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[14px] outline-none focus:border-[#C61D26] focus:ring-4 focus:ring-[#C61D26]/5 transition-all bg-white">
                </div>
              </div>

              <div class="mb-5">
                <label class="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-2 ml-1">Documentación Entregada</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border border-[#E5E7EB] rounded-xl bg-[#F9FAFB]">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="entForm.documentos.vehiculo" class="w-5 h-5 rounded border-[#D1D5DB] text-[#C61D26] focus:ring-[#C61D26]">
                    <span class="text-[14px] font-medium text-[#374151]">Vehículo / Llaves</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="entForm.documentos.pedimento" class="w-5 h-5 rounded border-[#D1D5DB] text-[#C61D26] focus:ring-[#C61D26]">
                    <span class="text-[14px] font-medium text-[#374151]">Pedimento</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="entForm.documentos.factura" class="w-5 h-5 rounded border-[#D1D5DB] text-[#C61D26] focus:ring-[#C61D26]">
                    <span class="text-[14px] font-medium text-[#374151]">Factura Comercial</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="entForm.documentos.titulo" class="w-5 h-5 rounded border-[#D1D5DB] text-[#C61D26] focus:ring-[#C61D26]">
                    <span class="text-[14px] font-medium text-[#374151]">Título</span>
                  </label>
                </div>
              </div>

              <div class="mb-5">
                <label class="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-1.5 ml-1">Evidencia (Foto o Firma escaneada)</label>
                <input type="file" (change)="onEntregaFileSelected($event)" accept="image/*" class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[14px] bg-white cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[#FEE2E2] file:text-[#B91C1C] hover:file:bg-[#FECACA]">
                @if (entForm.fotoUrl) {
                  <p class="text-[12px] text-green-600 font-semibold mt-2 ml-1">✓ Archivo cargado correctamente</p>
                }
              </div>

              <div>
                <label class="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-[0.5px] mb-1.5 ml-1">Notas adicionales (Opcional)</label>
                <input [(ngModel)]="entForm.descripcion" placeholder="Ej. El cliente se retiró conforme..." class="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[14px] outline-none focus:border-[#C61D26] transition-all bg-white">
              </div>
            </div>

            <div class="px-6 py-5 border-t border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-end gap-3">
              <button (click)="showEntrega = false" class="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#4B5563] hover:bg-[#E5E7EB] transition-colors">Cancelar</button>
              <button (click)="doAgregarEntrega()" class="px-6 py-2.5 rounded-xl text-[14px] font-semibold bg-[#111827] text-white hover:bg-[#1F2937] transition-colors shadow-lg shadow-gray-900/20 disabled:opacity-50" [disabled]="!entForm.nombreRecibe || !entForm.ubicacion">Registrar Entrega</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Nota -->
      @if (showNota) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh] px-4 overflow-y-auto" (click)="showNota = false">
          <div class="bg-white rounded-2xl p-6 w-full max-w-[450px] shadow-xl my-auto" (click)="$event.stopPropagation()">
            <h3 class="text-[16px] font-semibold mb-4">Agregar nota</h3>
            <textarea [(ngModel)]="notaContenido" placeholder="Escribe tu nota..." class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-3" rows="3"></textarea>
            <div class="flex justify-end gap-2">
              <button (click)="showNota = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button (click)="doAgregarNota()" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Guardar</button>
            </div>
          </div>
        </div>
      }

      @if (showPago) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh] px-4 overflow-y-auto" (click)="!savingPago && (showPago = false)">
          <form class="bg-white rounded-2xl p-6 w-full max-w-[560px] shadow-xl my-auto" (click)="$event.stopPropagation()" (ngSubmit)="doRegistrarPago()">
            <h3 class="text-[16px] font-semibold mb-4">Registrar pago</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input [(ngModel)]="pagoForm.fechaPago" name="fechaPago" type="date" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <input [(ngModel)]="pagoForm.monto" name="monto" type="number" min="0.01" step="0.01" placeholder="Monto" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <select [(ngModel)]="pagoForm.moneda" name="moneda" (change)="onPagoMonedaChange()" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
              <input [(ngModel)]="pagoForm.tipoCambio" name="tipoCambio" type="number" step="0.000001" [readonly]="pagoForm.moneda !== 'USD'" [placeholder]="pagoForm.moneda === 'USD' ? 'TC automatico' : 'Solo USD'" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] read-only:bg-[#F3F4F6]">
              <select [(ngModel)]="pagoForm.metodo" name="metodo" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="CHEQUE">Cheque</option>
              </select>
              @if (pagoForm.metodo === 'TRANSFERENCIA' || pagoForm.metodo === 'DEPOSITO') {
                <select [(ngModel)]="pagoForm.banco" name="banco" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
                  <option value="">Banco registrado</option>
                  @for (b of bancos; track b.id) {
                    <option [value]="b.nombre">{{ b.identificador }} · {{ b.nombre }}{{ b.cuenta ? ' · ' + b.cuenta : '' }}</option>
                  }
                </select>
              } @else {
                <input [(ngModel)]="pagoForm.banco" name="banco" placeholder="Banco (opcional)" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              }
            </div>
            <input [(ngModel)]="pagoForm.referencia" name="referencia" placeholder="Referencia" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mt-2">
            <div class="mt-3 rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-3 text-[12px] text-[#4B5162]">
              <div class="flex items-center justify-between gap-3">
                <span>Saldo disponible</span>
                <strong class="font-mono-data text-[#0D1017]">{{ saldoDisponiblePago() | currency:'MXN' }}</strong>
              </div>
              <div class="flex items-center justify-between gap-3 mt-1">
                <span>Este pago en MXN</span>
                <strong class="font-mono-data" [class.text-[#991B1B]]="pagoExcedeSaldo()">{{ pagoFormMxn() | currency:'MXN' }}</strong>
              </div>
            </div>
            @if (pagoValidationMessages().length > 0) {
              <div class="mt-3 rounded-2xl border border-[#FEE2E2] bg-[#FFF7F7] px-3 py-2 text-[12px] text-[#991B1B]">
                @for (message of pagoValidationMessages(); track message) {
                  <p>{{ message }}</p>
                }
              </div>
            }
            <textarea [(ngModel)]="pagoForm.notas" name="notas" placeholder="Notas" class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] mt-2" rows="2"></textarea>
            <label class="mt-3 block text-[12px] text-[#6B717F]">{{ pagoForm.metodo === 'EFECTIVO' ? 'Comprobante opcional en efectivo' : 'Comprobante bancario obligatorio' }}</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" (change)="onPagoFile($event)" class="mt-1 text-[13px]">
            @if (pagoFileName) { <p class="text-[12px] text-[#6B717F] mt-1">Comprobante: {{ pagoFileName }}</p> }
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" [disabled]="savingPago" (click)="showPago = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC] disabled:opacity-50">Cancelar</button>
              <button type="submit" [disabled]="savingPago || pagoValidationMessages().length > 0" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white disabled:opacity-50">
                @if (savingPago) {
                  <span class="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  Guardando...
                } @else {
                  <span>Guardar</span>
                }
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Modal: Entregar vehículo (→ ENTREGADO_AL_CLIENTE) -->
      @if (showFinalizarModal && tramite()) {
        @let t = tramite()!;
        <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center px-4" (click)="showFinalizarModal = false">
          <div class="bg-white rounded-[24px] w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-[#E4E7EC]" (click)="$event.stopPropagation()">
            <div class="px-6 pt-6 pb-4 border-b border-[#F0F2F5]">
              <div class="flex items-center gap-3 mb-1">
                <div class="w-9 h-9 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-[#16A34A]"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <h3 class="text-[17px] font-bold text-[#0D1017]">Entregar vehículo</h3>
                  <p class="text-[12px] text-[#6B717F]">{{ t.numeroConsecutivo }} · {{ t.clienteApodo || '—' }}</p>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 space-y-3">
              <div class="rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] px-4 py-3 grid grid-cols-2 gap-y-2 text-[13px]">
                <span class="text-[#6B717F]">Cobro total</span>
                <span class="text-right font-semibold font-mono-data">{{ t.cobroTotal | currency:'MXN' }}</span>
                <span class="text-[#6B717F]">Total pagado</span>
                <span class="text-right font-semibold font-mono-data">{{ t.totalPagado | currency:'MXN' }}</span>
                <span class="text-[#6B717F]">Saldo pendiente</span>
                <span class="text-right font-semibold font-mono-data" [style.color]="t.saldoPendiente > 0 ? '#D97706' : '#16A34A'">{{ t.saldoPendiente | currency:'MXN' }}</span>
              </div>

              <div class="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 flex items-start gap-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-[#2563EB] mt-0.5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-[12.5px] text-[#1E40AF]">Al confirmar, el trámite quedará en estado <strong>ENTREGADO_AL_CLIENTE</strong> (finalizado). Debes tener al menos una entrega registrada.</p>
              </div>

              <textarea [(ngModel)]="notasEstado" placeholder="Notas de entrega (opcional)" rows="2"
                class="w-full px-3 py-2 rounded-xl border border-[#E4E7EC] text-[13px] resize-none focus:outline-none focus:border-[#16A34A]"></textarea>
            </div>

            <div class="px-6 pb-6 flex gap-2">
              <button (click)="showFinalizarModal = false" class="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-[#D8DEE8] hover:bg-[#F3F4F6] transition-colors">
                Cancelar
              </button>
              <button (click)="doFinalizar()" class="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#16A34A] text-white hover:bg-[#15803D] transition-colors">
                Confirmar entrega
              </button>
            </div>
          </div>
        </div>
      }

      @if (showGasto) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh] px-4 overflow-y-auto" (click)="showGasto = false">
          <form class="bg-white rounded-2xl p-6 w-full max-w-[520px] shadow-xl my-auto" (click)="$event.stopPropagation()" (ngSubmit)="doRegistrarGasto()">
            <h3 class="text-[16px] font-semibold mb-4">Nuevo gasto</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input [(ngModel)]="gastoForm.fechaGasto" name="fechaGasto" type="date" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <select [(ngModel)]="gastoForm.tipoGastoId" name="tipoGastoId" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option value="">Tipo</option>
                @for (tipo of tiposGasto; track tipo.id) { <option [value]="tipo.id">{{ tipo.nombre }}</option> }
              </select>
              <input [(ngModel)]="gastoForm.monto" name="monto" type="number" min="0.01" step="0.01" placeholder="Monto" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
              <select [(ngModel)]="gastoForm.moneda" name="moneda" class="px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px]">
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input [(ngModel)]="gastoForm.concepto" name="concepto" placeholder="Concepto" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mt-2">
            <label class="flex items-center gap-2 text-[13px] mt-3"><input [(ngModel)]="gastoForm.seCargaAlCliente" name="seCargaAlCliente" type="checkbox"> Se carga al cliente</label>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" (click)="showGasto = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button type="submit" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Guardar</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class TramiteDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tramiteService = inject(TramiteService);
  private pagoService = inject(PagoService);
  private gastoService = inject(GastoHormigaService);
  private bancoService = inject(BancoService);
  private cotizacionService = inject(CotizacionService);
  private notifications = inject(NotificationService);
  auth = inject(AuthService);
  router = inject(Router);

  tramite = signal<TramiteDetailDto | null>(null);
  activeTab = signal('timeline');
  estadosPermitidos: string[] = [];

  showCambiarEstado = false;
  showPedimento = false;
  showEntrega = false;
  showNota = false;
  showPago = false;
  showGasto = false;
  showFinalizarModal = false;

  nuevoEstado = '';
  notasEstado = '';

  uploadingDoc: string | null = null;

  pedForm = { numero: '', tipo: 'ORIGINAL', fechaEntrada: '', fechaPago: '', cobroAdicional: 0 };
  entForm = {
    descripcion: '',
    ubicacion: '',
    nombreRecibe: '',
    documentos: {
      vehiculo: true,
      pedimento: false,
      factura: false,
      titulo: false
    },
    fotoUrl: '',
    firmaBase64: ''
  };
  notaContenido = '';
  tiposGasto: TipoGastoDto[] = [];
  bancos: BancoDto[] = [];
  savingPago = false;
  pagoFile: File | null = null;
  pagoFileName = '';
  pagoForm = this.emptyPagoForm();
  gastoForm = this.emptyGastoForm();

  tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'pedimentos', label: 'Pedimentos' },
    { key: 'documentos', label: 'Documentos' },
    { key: 'entregas', label: 'Entregas' },
    { key: 'gastos', label: 'Gastos hormiga' },
    { key: 'pagos', label: 'Pagos' },
  ];

  documentosBase = [
    { tipoDocumento: 'FACTURA', nombre: 'Factura', descripcion: 'Obligatoria para iniciar baja.' },
    { tipoDocumento: 'IDENTIFICACION_INE', nombre: 'Identificación INE', descripcion: 'O alternativa notariada del vendedor.' },
    { tipoDocumento: 'HOJA_NOTARIADA', nombre: 'Hoja notariada', descripcion: 'Alternativa cuando el vendedor es estadounidense.' },
    { tipoDocumento: 'IDENTIFICACION_AMERICANA', nombre: 'Identificación americana', descripcion: 'Identificación del vendedor estadounidense.' },
    { tipoDocumento: 'BAJA', nombre: 'Baja', descripcion: 'Resultado del proceso de baja, aprox. 72 horas.' },
    { tipoDocumento: 'TITULO', nombre: 'Título', descripcion: 'Se entrega con el vehículo después de la baja.' },
    { tipoDocumento: 'PEDIMENTO_PDF', nombre: 'Pedimento PDF', descripcion: 'Documento devuelto por el externo al tramitador.' },
  ];

  ngOnInit() {
    this.gastoService.getTiposGasto().subscribe(t => this.tiposGasto = t);
    this.bancoService.getAll(true).subscribe(b => this.bancos = b);
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadTramite(id);
    });
  }

  loadTramite(id: string) {
    this.tramiteService.getById(id).subscribe(t => {
      this.tramite.set(t);
      this.tramiteService.getEstadosPermitidos(t.estatus).subscribe(estados => {
        this.estadosPermitidos = estados;
      });
    });
  }

  totalVerificado(t: TramiteDetailDto): number {
    return t.pagos
      .filter(p => p.verificado)
      .reduce((sum, p) => sum + (p.moneda === 'USD' ? p.monto * (p.tipoCambio || 0) : p.monto), 0);
  }

  openPagoModal() {
    this.pagoForm = this.emptyPagoForm();
    this.pagoFile = null;
    this.pagoFileName = '';
    this.showPago = true;
  }

  openGastoModal() {
    this.gastoForm = this.emptyGastoForm();
    const t = this.tramite();
    if (t) {
      this.gastoForm.tramiteId = t.id;
      this.gastoForm.clienteId = t.clienteId;
      this.gastoForm.vehiculoId = t.vehiculoId;
    }
    this.showGasto = true;
  }

  private portalService = inject(PortalService);

  openPortal(id: string) {
    this.portalService.generateToken(id).subscribe({
      next: res => window.open(`/portal/acceso/${res.token}`, '_blank', 'noopener,noreferrer'),
      error: () => window.open('/portal', '_blank', 'noopener,noreferrer'),
    });
  }

  onPagoFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pagoFile = input.files?.[0] ?? null;
    this.pagoFileName = this.pagoFile?.name ?? '';
  }

  onPagoMonedaChange() {
    if (this.pagoForm.moneda !== 'USD') {
      this.pagoForm.tipoCambio = null;
      return;
    }
    this.cotizacionService.getTipoCambio().subscribe({
      next: tc => this.pagoForm.tipoCambio = tc.tipoCambio,
      error: err => this.notifications.fromHttpError(err, 'No se pudo obtener el tipo de cambio. Puedes capturarlo manualmente.'),
    });
  }

  pagoFormMxn(): number {
    if (!this.pagoForm.monto || this.pagoForm.monto <= 0) return 0;
    if (this.pagoForm.moneda === 'USD') return this.pagoForm.monto * (this.pagoForm.tipoCambio || 0);
    return this.pagoForm.monto;
  }

  saldoDisponiblePago(): number {
    const t = this.tramite();
    if (!t) return 0;
    const pagosPendientes = t.pagos
      .filter(p => !p.verificado)
      .reduce((sum, p) => sum + (p.moneda === 'USD' ? p.monto * (p.tipoCambio || 0) : p.monto), 0);
    return Math.max(0, t.saldoPendiente - pagosPendientes);
  }

  pagoExcedeSaldo(): boolean {
    return this.pagoFormMxn() > this.saldoDisponiblePago();
  }

  pagoValidationMessages(): string[] {
    const messages: string[] = [];
    if (!this.pagoForm.monto || this.pagoForm.monto <= 0) messages.push('El monto debe ser mayor a cero.');
    if (this.pagoForm.moneda === 'USD' && (!this.pagoForm.tipoCambio || this.pagoForm.tipoCambio <= 0)) messages.push('El tipo de cambio es obligatorio para pagos en USD.');
    if ((this.pagoForm.metodo === 'TRANSFERENCIA' || this.pagoForm.metodo === 'DEPOSITO') && !this.pagoForm.banco) messages.push('Selecciona el banco para transferencias o depositos.');
    if (this.pagoForm.metodo !== 'EFECTIVO' && !this.pagoFile) messages.push('Adjunta el comprobante bancario.');
    if (this.pagoExcedeSaldo()) messages.push(`El pago excede el saldo disponible por ${(this.pagoFormMxn() - this.saldoDisponiblePago()).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
    return messages;
  }

  doRegistrarPago() {
    const t = this.tramite();
    const messages = this.pagoValidationMessages();
    if (!t || messages.length > 0) {
      this.notifications.warning(messages[0] || 'Revisa los datos del pago.');
      return;
    }
    if (this.savingPago) return;

    const file = this.pagoFile;
    this.savingPago = true;
    this.pagoService.create({
      ...this.pagoForm,
      tramiteId: t.id,
      comprobanteUrl: file ? `pendiente-upload:${file.name}` : null,
      tipoCambio: this.pagoForm.moneda === 'USD' ? this.pagoForm.tipoCambio : null,
    }).subscribe({
      next: pago => {
        if (!file) {
          this.savingPago = false;
          this.showPago = false;
          this.notifications.success(pago.reciboPagoUrl ? 'Pago registrado y recibo generado.' : 'Pago registrado. Puedes regenerar el recibo desde pagos.');
          this.loadTramite(t.id);
          return;
        }

        this.pagoService.uploadComprobante(pago.id, file).subscribe({
          next: () => {
            this.savingPago = false;
            this.showPago = false;
            this.notifications.success(pago.reciboPagoUrl ? 'Pago registrado y recibo generado.' : 'Pago registrado. Puedes regenerar el recibo desde pagos.');
            this.loadTramite(t.id);
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

  async deletePago(id: string, monto: number, moneda: string): Promise<void> {
    const t = this.tramite();
    if (!t) return;

    const confirmed = await this.notifications.confirm({
      title: 'Borrar pago',
      message: 'Se ocultara del tramite y de los saldos operativos. La bitacora administrativa conservara el movimiento.',
      detail: `${t.numeroConsecutivo} | ${monto.toLocaleString('es-MX', { style: 'currency', currency: moneda })}`,
      confirmText: 'Borrar pago',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    this.pagoService.delete(id).subscribe({
      next: () => {
        this.notifications.success('Pago borrado correctamente.');
        this.loadTramite(t.id);
      },
      error: err => this.notifications.fromHttpError(err, 'No se pudo borrar el pago'),
    });
  }

  doRegistrarGasto() {
    const t = this.tramite();
    if (!t || !this.gastoForm.tipoGastoId || !this.gastoForm.concepto || this.gastoForm.monto <= 0) return;
    this.gastoService.create(this.gastoForm).subscribe({
      next: () => {
        this.showGasto = false;
        this.notifications.success('Gasto registrado correctamente.');
        this.loadTramite(t.id);
      },
      error: err => this.notifications.fromHttpError(err, 'Error al registrar gasto'),
    });
  }

  getEstadosPermitidos(): string[] {
    return this.estadosPermitidos;
  }

  doCambiarEstado() {
    if (!this.nuevoEstado) return;
    const t = this.tramite();
    if (!t) return;
    this.tramiteService.cambiarEstado(t.id, {
      nuevoEstado: this.nuevoEstado,
      notas: this.notasEstado || undefined,
    }).subscribe({
      next: () => {
        this.showCambiarEstado = false;
        this.nuevoEstado = '';
        this.notasEstado = '';
        this.notifications.success('Estado actualizado correctamente.');
        this.loadTramite(t.id);
      },
      error: (err) => this.notifications.fromHttpError(err, 'Error al cambiar estado'),
    });
  }

  doAgregarPedimento() {
    const t = this.tramite();
    if (!t || !this.pedForm.numero) return;
    this.tramiteService.agregarPedimento(t.id, {
      numeroPedimento: this.pedForm.numero,
      tipo: this.pedForm.tipo,
      fechaEntrada: this.pedForm.fechaEntrada || undefined,
      fechaPago: this.pedForm.fechaPago || undefined,
      cobroAdicional: this.pedForm.cobroAdicional,
    }).subscribe({
      next: () => {
        this.showPedimento = false;
        this.notifications.success('Pedimento agregado correctamente.');
        this.loadTramite(t.id);
      },
      error: (err) => this.notifications.fromHttpError(err, 'Error al agregar pedimento'),
    });
  }

  onEntregaFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.tramiteService.uploadEvidence(file).subscribe({
        next: (res: any) => this.entForm.fotoUrl = res.url,
        error: err => this.notifications.fromHttpError(err, 'Error al subir la evidencia')
      });
    }
  }

  doAgregarEntrega() {
    const t = this.tramite();
    if (!t || !this.entForm.ubicacion || !this.entForm.nombreRecibe) return;

    const docs = [];
    if (this.entForm.documentos.vehiculo) docs.push('Vehículo/Llaves');
    if (this.entForm.documentos.pedimento) docs.push('Pedimento');
    if (this.entForm.documentos.factura) docs.push('Factura Comercial');
    if (this.entForm.documentos.titulo) docs.push('Título');

    this.tramiteService.agregarEntrega(t.id, {
      descripcion: this.entForm.descripcion || undefined,
      ubicacionEntrega: this.entForm.ubicacion || undefined,
      nombreRecibe: this.entForm.nombreRecibe,
      documentosEntregados: docs,
      fotoEvidenciaUrl: this.entForm.fotoUrl,
      firmaBase64: this.entForm.firmaBase64
    }).subscribe({
      next: () => {
        this.showEntrega = false;
        this.entForm = { descripcion: '', ubicacion: '', nombreRecibe: '', documentos: { vehiculo: true, pedimento: false, factura: false, titulo: false }, fotoUrl: '', firmaBase64: '' };
        this.notifications.success('Entrega registrada correctamente.');
        this.loadTramite(t.id);
      },
      error: (err) => this.notifications.fromHttpError(err, 'Error al registrar entrega'),
    });
  }

  doAgregarNota() {
    const t = this.tramite();
    if (!t || !this.notaContenido.trim()) return;
    this.tramiteService.agregarNota(t.id, this.notaContenido).subscribe({
      next: () => {
        this.showNota = false;
        this.notaContenido = '';
        this.notifications.success('Nota agregada correctamente.');
        this.loadTramite(t.id);
      },
      error: (err) => this.notifications.fromHttpError(err, 'Error al agregar nota'),
    });
  }

  esTerminal(estatus: string): boolean {
    return estatus === 'CANCELADO' || estatus === 'ENTREGADO_AL_CLIENTE';
  }

  esFinalizable(estatus: string): boolean {
    return estatus === 'ROJO_DESADUANADO';
  }

  doFinalizar(): void {
    const t = this.tramite();
    if (!t) return;
    this.tramiteService.cambiarEstado(t.id, {
      nuevoEstado: 'ENTREGADO_AL_CLIENTE',
      notas: this.notasEstado || undefined,
    }).subscribe({
      next: () => {
        this.showFinalizarModal = false;
        this.notasEstado = '';
        this.notifications.success('Vehículo entregado correctamente. Trámite finalizado.');
        this.loadTramite(t.id);
      },
      error: (err) => this.notifications.fromHttpError(err, 'Error al entregar el vehículo'),
    });
  }

  hasCampo(t: TramiteDetailDto): boolean {
    return t.tareasCampo.some(x => x.estatus !== 'CANCELADA');
  }

  copiarEnlaceCampo(tareaId: string): void {
    const url = `${window.location.origin}/campo/${tareaId}/captura`;
    navigator.clipboard.writeText(url).then(() => {
      this.notifications.success('Enlace copiado al portapapeles.');
    }).catch(() => {
      this.notifications.error('No se pudo copiar el enlace.');
    });
  }

  whatsappEnlaceCampo(tareaId: string, vehiculoResumen: string, vin: string | null | undefined): string {
    const url = `${window.location.origin}/campo/${tareaId}/captura`;
    const mensaje = `Hola, te comparto el enlace para la captura de fotos de la unidad *${vehiculoResumen}*${vin ? ` (VIN: ${vin})` : ''}: ${url}`;
    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }

  vehiculoLabel(t: TramiteDetailDto): string {
    const parts = [t.vehiculoMarca, t.vehiculoModelo, t.vehiculoAnno?.toString()].filter(Boolean);
    return parts.length ? parts.join(' ') : (t.descripcionMercancia ?? 'Unidad sin descripción');
  }

  hasPedimento(t: TramiteDetailDto): boolean {
    return t.pedimentos.length > 0;
  }

  hasEntrega(t: TramiteDetailDto): boolean {
    return t.entregas.length > 0;
  }

  findDocumento(t: TramiteDetailDto, tipoDocumento: string) {
    return t.documentos.find(d => d.tipoDocumento === tipoDocumento);
  }

  guardarDocumento(tramiteId: string, tipoDocumento: string, estatus: string, archivoUrl?: string | null) {
    if (estatus === 'VALIDADO' && !archivoUrl) {
      this.notifications.error('Debe subir un archivo (Requerido) para poder marcar el documento como Validado.');
      return;
    }

    const base = this.documentosBase.find(d => d.tipoDocumento === tipoDocumento);
    this.tramiteService.guardarDocumento(tramiteId, {
      tipoDocumento,
      nombre: base?.nombre,
      estatus,
      esRequerido: true,
      archivoUrl
    }).subscribe({
      next: () => {
        this.notifications.success(`Documento actualizado a ${estatus}.`);
        this.loadTramite(tramiteId);
      },
      error: err => this.notifications.fromHttpError(err, 'Error al actualizar documento'),
    });
  }

  onDocumentoFileSelected(event: any, tipoDocumento: string, targetEstatus: string) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.notifications.error('El archivo no puede exceder 10 MB');
      return;
    }

    const t = this.tramite();
    if (!t) return;

    this.uploadingDoc = tipoDocumento;

    this.tramiteService.uploadDocumento(file).subscribe({
      next: (res) => {
        this.guardarDocumento(t.id, tipoDocumento, targetEstatus, res.url);
        this.uploadingDoc = null;
      },
      error: (err) => {
        this.notifications.fromHttpError(err, 'Error al subir el documento');
        this.uploadingDoc = null;
      }
    });
  }

  eventoColor(tipo: string): string {
    const colors: Record<string, string> = {
      CAMBIO_ESTADO: 'background: #2563EB;',
      CREACION: 'background: #16A34A;',
      NOTA: 'background: #9EA3AE;',
      PEDIMENTO: 'background: #D97706;',
      ENTREGA: 'background: #8B5CF6;',
      PAGO: 'background: #16A34A;',
    };
    return colors[tipo] || 'background: #9EA3AE;';
  }

  tipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      CAMBIO_ESTADO: 'Cambio de estado',
      CREACION: 'Creación',
      NOTA: 'Nota',
      PEDIMENTO: 'Pedimento',
      ENTREGA: 'Entrega',
      PAGO: 'Pago',
    };
    return labels[tipo] || tipo;
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:5198${url}`;
  }

  reciboUrl(pago: TramitePagoDto): string {
    return pago.reciboPagoUrl ? this.fileUrl(pago.reciboPagoUrl) : this.pagoService.reciboUrl(pago.id);
  }

  estadoPill(estatus: string): string {
    const colors: Record<string, string> = {
      PENDIENTE_TRAMITE: 'background: #FEF3C7; color: #92400E;',
      EN_PROCESO: 'background: #DBEAFE; color: #1E40AF;',
      ROJO_DESADUANADO: 'background: #FEE2E2; color: #991B1B;',
      ENTREGADO_AL_CLIENTE: 'background: #DCFCE7; color: #166534;',
      CANCELADO: 'background: #F3F4F6; color: #6B7280;',
    };
    return colors[estatus] || 'background: #F3F4F6; color: #4B5162;';
  }

  documentoPill(estatus: string): string {
    const colors: Record<string, string> = {
      PENDIENTE: 'background:#FEF3C7;color:#92400E;',
      RECIBIDO: 'background:#DBEAFE;color:#1E40AF;',
      VALIDADO: 'background:#DCFCE7;color:#166534;',
      RECHAZADO: 'background:#FEE2E2;color:#991B1B;',
      NO_APLICA: 'background:#F3F4F6;color:#6B7280;',
    };
    return colors[estatus] || colors['PENDIENTE'];
  }

  private emptyPagoForm() {
    return {
      tramiteId: '',
      monto: 0,
      moneda: 'MXN',
      tipoCambio: null as number | null,
      metodo: 'TRANSFERENCIA',
      banco: '',
      referencia: null as string | null,
      comprobanteUrl: '',
      notas: null as string | null,
      fechaPago: new Date().toISOString().slice(0, 10),
    };
  }

  private emptyGastoForm() {
    return {
      tramiteId: null as string | null,
      clienteId: null as string | null,
      vehiculoId: null as string | null,
      tipoGastoId: '',
      concepto: '',
      monto: 0,
      moneda: 'MXN',
      gastoUsd: null as number | null,
      comprobanteUrl: null as string | null,
      seCargaAlCliente: false,
      fechaGasto: new Date().toISOString().slice(0, 10),
    };
  }
}
