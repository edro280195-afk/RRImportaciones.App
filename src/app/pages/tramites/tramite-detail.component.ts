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
import { CampoService } from '../../services/campo.service';

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
              <button (click)="crearTareaCampo(t.id)" [disabled]="hasCampo(t)" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#FFF1F1] text-[#A31820] border border-[#FFC5C5] hover:bg-[#FFE0E0] transition-colors disabled:opacity-55" [title]="hasCampo(t) ? 'Este trámite ya está en campo' : 'Crear tarea de campo'">
                {{ hasCampo(t) ? 'En campo' : '+ Campo' }}
              </button>
            }
            @if (auth.can('EVENTOS_CREAR')) {
              <button (click)="showNota = true" class="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#F3F4F6] text-[#4B5162] border border-[#E4E7EC] hover:bg-[#E4E7EC] transition-colors">
                + Nota
              </button>
            }
          </div>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-3 gap-4 mb-6">
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
              <table class="w-full">
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
            }
          </div>
        }

        @if (activeTab() === 'entregas') {
          <div class="card-elevated rounded-2xl p-5">
            @if (t.entregas.length === 0) {
              <p class="text-[13px] text-[#9EA3AE] text-center py-8">Sin entregas registradas</p>
            }
            @for (e of t.entregas; track e.id) {
              <div class="border-b border-[#F3F4F6] pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                <p class="text-[13px] font-semibold">{{ e.descripcion || 'Entrega' }}</p>
                <p class="text-[12px] text-[#6B717F]">{{ e.fechaEntrega | date:'dd/MM/yyyy HH:mm' }} — {{ e.ubicacionEntrega || '' }}</p>
                <p class="text-[12px] text-[#6B717F]">Responsable: {{ e.responsableCampoNombre || '—' }} | Recibió: {{ e.recibidoPorPartnerNombre || '—' }}</p>
              </div>
            }
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
                  <div class="grid grid-cols-2 gap-2">
                    <button (click)="guardarDocumento(t.id, doc.tipoDocumento, 'RECIBIDO')" class="rounded-xl border border-[#E4E7EC] px-3 py-2 text-[12px] font-medium">Recibido</button>
                    <button (click)="guardarDocumento(t.id, doc.tipoDocumento, 'VALIDADO')" class="rounded-xl bg-[#0D1017] px-3 py-2 text-[12px] font-medium text-white">Validado</button>
                  </div>
                </div>
              }
            </div>

            @if (t.tareasCampo.length) {
              <h3 class="text-[14px] font-semibold mb-3">Tareas de campo</h3>
              @for (tc of t.tareasCampo; track tc.id) {
                <div class="flex justify-between gap-3 border-t border-[#F3F4F6] py-3 text-[13px]">
                  <div>
                    <p class="font-semibold">{{ tc.tipo }} · {{ tc.estatus }}</p>
                    <p class="text-[#6B717F]">{{ tc.personalCampoNombre || 'Abierta' }} · {{ tc.ubicacion || 'Sin ubicación' }}</p>
                  </div>
                  <p class="text-[#9EA3AE]">{{ tc.fechaCreacion | date:'dd/MM/yyyy' }}</p>
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
        }
      } @else {
        <div class="card-elevated rounded-2xl p-16 text-center">
          <p class="text-[14px] text-[#9EA3AE]">Cargando…</p>
        </div>
      }

      <!-- Modal: Cambiar estado -->
      @if (showCambiarEstado) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh]" (click)="showCambiarEstado = false">
          <div class="bg-white rounded-2xl p-6 w-[400px] shadow-xl" (click)="$event.stopPropagation()">
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
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh]" (click)="showPedimento = false">
          <div class="bg-white rounded-2xl p-6 w-[450px] shadow-xl" (click)="$event.stopPropagation()">
            <h3 class="text-[16px] font-semibold mb-4">Agregar pedimento</h3>
            <input [(ngModel)]="pedForm.numero" placeholder="Número de pedimento" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-2">
            <select [(ngModel)]="pedForm.tipo" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-2">
              <option value="ORIGINAL">Original</option>
              <option value="R1">Rectificación R1</option>
              <option value="R2">Rectificación R2</option>
              <option value="R3">Rectificación R3</option>
            </select>
            <input [(ngModel)]="pedForm.fecha" type="date" placeholder="Fecha" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-2">
            <input [(ngModel)]="pedForm.cobroAdicional" type="number" placeholder="Cobro adicional" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-3">
            <div class="flex justify-end gap-2">
              <button (click)="showPedimento = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button (click)="doAgregarPedimento()" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Guardar</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Entrega -->
      @if (showEntrega) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh]" (click)="showEntrega = false">
          <div class="bg-white rounded-2xl p-6 w-[450px] shadow-xl" (click)="$event.stopPropagation()">
            <h3 class="text-[16px] font-semibold mb-4">Registrar entrega</h3>
            <input [(ngModel)]="entForm.descripcion" placeholder="Descripción" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-2">
            <input [(ngModel)]="entForm.ubicacion" placeholder="Ubicación de entrega" class="w-full px-3 py-2.5 rounded-xl border border-[#E4E7EC] text-[13px] mb-3">
            <div class="flex justify-end gap-2">
              <button (click)="showEntrega = false" class="px-4 py-2 rounded-xl text-[12.5px] border border-[#E4E7EC]">Cancelar</button>
              <button (click)="doAgregarEntrega()" class="px-4 py-2 rounded-xl text-[12.5px] bg-[#0D1017] text-white">Guardar</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Nota -->
      @if (showNota) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh]" (click)="showNota = false">
          <div class="bg-white rounded-2xl p-6 w-[450px] shadow-xl" (click)="$event.stopPropagation()">
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
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh]" (click)="!savingPago && (showPago = false)">
          <form class="bg-white rounded-2xl p-6 w-[560px] shadow-xl" (click)="$event.stopPropagation()" (ngSubmit)="doRegistrarPago()">
            <h3 class="text-[16px] font-semibold mb-4">Registrar pago</h3>
            <div class="grid grid-cols-2 gap-2">
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

      @if (showGasto) {
        <div class="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[8vh]" (click)="showGasto = false">
          <form class="bg-white rounded-2xl p-6 w-[520px] shadow-xl" (click)="$event.stopPropagation()" (ngSubmit)="doRegistrarGasto()">
            <h3 class="text-[16px] font-semibold mb-4">Nuevo gasto</h3>
            <div class="grid grid-cols-2 gap-2">
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
  private campoService = inject(CampoService);
  private notifications = inject(NotificationService);
  auth = inject(AuthService);
  router = inject(Router);

  tramite = signal<TramiteDetailDto | null>(null);
  activeTab = signal('timeline');

  showCambiarEstado = false;
  showPedimento = false;
  showEntrega = false;
  showNota = false;
  showPago = false;
  showGasto = false;

  nuevoEstado = '';
  notasEstado = '';

  pedForm = { numero: '', tipo: 'ORIGINAL', fecha: '', cobroAdicional: 0 };
  entForm = { descripcion: '', ubicacion: '' };
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
    this.tramiteService.getById(id).subscribe(t => this.tramite.set(t));
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

  openPortal(id: string) {
    window.open(`/portal/tramite/${id}`, '_blank', 'noopener,noreferrer');
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
    const t = this.tramite();
    if (!t) return [];
    const map: Record<string, string[]> = {
      PENDIENTE_TRAMITE: ['FOTOS_SOLICITADAS', 'REQUISITOS_PENDIENTES', 'CANCELADO'],
      FOTOS_SOLICITADAS: ['FOTOS_RECIBIDAS', 'REQUISITOS_PENDIENTES', 'CANCELADO'],
      FOTOS_RECIBIDAS: ['REQUISITOS_PENDIENTES', 'BAJA_EN_PROCESO', 'CANCELADO'],
      REQUISITOS_PENDIENTES: ['BAJA_EN_PROCESO', 'LISTO_PARA_PEDIMENTO', 'CANCELADO'],
      BAJA_EN_PROCESO: ['BAJA_COMPLETADA', 'CANCELADO'],
      BAJA_COMPLETADA: ['LISTO_PARA_PEDIMENTO', 'CANCELADO'],
      LISTO_PARA_PEDIMENTO: ['PEDIMENTO_DOCUMENTADO', 'CANCELADO'],
      PEDIMENTO_DOCUMENTADO: ['PAGO_PEDIMENTO_PENDIENTE', 'MANDADO_A_CRUCE', 'CANCELADO'],
      PAGO_PEDIMENTO_PENDIENTE: ['MANDADO_A_CRUCE', 'CANCELADO'],
      MANDADO_A_CRUCE: ['ROJO_DESADUANADO', 'CANCELADO'],
      EN_PROCESO: ['ROJO_DESADUANADO', 'FOTOS_SOLICITADAS', 'REQUISITOS_PENDIENTES', 'CANCELADO'],
      ROJO_DESADUANADO: ['VERDE_ENTREGADO'],
      VERDE_ENTREGADO: ['AMARILLO_PENDIENTE_PAGO', 'COBRADO'],
      AMARILLO_PENDIENTE_PAGO: ['COBRADO'],
    };
    return Array.from(new Set([...(map[t.estatus] || []), 'CANCELADO']));
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
      fechaEntrada: this.pedForm.fecha || undefined,
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

  doAgregarEntrega() {
    const t = this.tramite();
    if (!t) return;
    this.tramiteService.agregarEntrega(t.id, {
      descripcion: this.entForm.descripcion || undefined,
      ubicacionEntrega: this.entForm.ubicacion || undefined,
    }).subscribe({
      next: () => {
        this.showEntrega = false;
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

  crearTareaCampo(tramiteId: string) {
    this.campoService.crear({ tramiteId, tipo: 'FOTOS_YARDA' }).subscribe({
      next: () => {
        this.notifications.success('Tarea de campo creada.');
        this.loadTramite(tramiteId);
      },
      error: err => this.notifications.fromHttpError(err, 'Error al crear tarea de campo'),
    });
  }

  hasCampo(t: TramiteDetailDto): boolean {
    return t.tareasCampo.some(x => x.estatus !== 'CANCELADA');
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

  guardarDocumento(tramiteId: string, tipoDocumento: string, estatus: string) {
    const base = this.documentosBase.find(d => d.tipoDocumento === tipoDocumento);
    this.tramiteService.guardarDocumento(tramiteId, {
      tipoDocumento,
      nombre: base?.nombre,
      estatus,
      esRequerido: true,
    }).subscribe({
      next: () => {
        this.notifications.success('Documento actualizado.');
        this.loadTramite(tramiteId);
      },
      error: err => this.notifications.fromHttpError(err, 'Error al actualizar documento'),
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
      VERDE_ENTREGADO: 'background: #DCFCE7; color: #166534;',
      AMARILLO_PENDIENTE_PAGO: 'background: #FEF3C7; color: #92400E;',
      COBRADO: 'background: #DCFCE7; color: #166534;',
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
