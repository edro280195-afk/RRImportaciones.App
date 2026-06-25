import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteListDto, ClienteService } from '../../services/cliente.service';
import {
  CandidatoPrecio,
  CandidatosPrecioOutput,
  CotizacionInput,
  CotizacionOutput,
  CotizacionService,
} from '../../services/cotizacion.service';
import { MarcaDto, VehiculoService } from '../../services/vehiculo.service';

@Component({
  selector: 'app-cotizacion-nueva',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="cot-shell">
      <!-- ─────────── Header ─────────── -->
      <header class="cot-header">
        <div>
          <p class="eyebrow">Cotizador automático</p>
          <h1 class="title">Nueva cotización</h1>
        </div>
        <div class="tc-chip" [class.tc-chip--stale]="!tipoCambio()">
          <div class="tc-chip__label">
            <span class="tc-dot" [class.tc-dot--live]="!!tipoCambio()"></span>
            TC Banxico DOF
          </div>
          <div class="tc-chip__value">
            {{ tipoCambio()?.tipoCambio?.toFixed(4) || '— — — —' }}
            <small>MXN/USD</small>
          </div>
          @if (tipoCambio()?.fetchedAt) {
            <p class="tc-chip__time">Consultado {{ tipoCambio()?.fetchedAt | date: 'HH:mm' }}</p>
          }
        </div>
      </header>

      <!-- ─────────── Workspace grid ─────────── -->
      <div class="cot-grid">
        <!-- LEFT — formulario -->
        <div class="cot-form">
          <!-- VIN hero -->
          <section class="card vin-card" [class.vin-card--decoded]="decodeOk()">
            <div class="step-pill">
              <span class="step-num">1</span>
              <span>Identifica el vehículo</span>
            </div>
            <label class="big-label">VIN del vehículo</label>
            <div class="vin-input-row">
              <input
                [(ngModel)]="form.vin"
                maxlength="17"
                (input)="onVinInput()"
                placeholder="17 caracteres alfanuméricos"
                class="vin-input"
              />
              <div class="vin-counter" [class.vin-counter--ok]="(form.vin || '').length === 17">
                {{ (form.vin || '').length }}/17
              </div>
            </div>

            @if (decoding()) {
              <div class="vin-status vin-status--decoding">
                <span class="spinner"></span>
                Decodificando VIN en NHTSA…
              </div>
            } @else if (decodeOk()) {
              <div class="vin-status vin-status--ok">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l3 3 7-7"
                    stroke="#16A34A"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Decodificado: <strong>{{ decodeMessage() }}</strong>
              </div>
            } @else if (decodeMessage()) {
              <div class="vin-status vin-status--err">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#991B1B" stroke-width="1.5" />
                  <path
                    d="M7 4v3M7 10h.01"
                    stroke="#991B1B"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                {{ decodeMessage() }}
              </div>
            }
          </section>

          <!-- Identidad del vehículo (compacta) -->
          <section class="card">
            <div class="step-pill">
              <span class="step-num">2</span>
              <span>Confirma los datos del vehículo</span>
              @if (decodeOk()) {
                <button class="ghost-btn" type="button" (click)="detailsOpen.set(!detailsOpen())">
                  {{ detailsOpen() ? 'Ocultar' : 'Editar' }}
                </button>
              }
            </div>

            @if (decodeOk() && !detailsOpen()) {
              <div class="vehicle-summary">
                <div>
                  <span>Marca</span><strong>{{ form.marca || '—' }}</strong>
                </div>
                <div>
                  <span>Modelo</span><strong>{{ form.modelo || '—' }}</strong>
                </div>
                <div>
                  <span>Año</span><strong>{{ form.anno || '—' }}</strong>
                </div>
                <div>
                  <span>Cilindrada</span
                  ><strong>{{ form.cilindradaCm3 ? form.cilindradaCm3 + ' cc' : '—' }}</strong>
                </div>
              </div>
            } @else {
              <div class="grid-2">
                <div class="field">
                  <label>Marca catalogada</label>
                  <select [(ngModel)]="form.marcaId">
                    <option [ngValue]="null">— Sin marca ligada —</option>
                    @for (m of marcas(); track m.id) {
                      <option [value]="m.id">{{ m.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>Marca manual</label>
                  <input [(ngModel)]="form.marca" placeholder="Ej. Ford" />
                </div>
                <div class="field">
                  <label>Modelo</label>
                  <input [(ngModel)]="form.modelo" placeholder="Ej. F-150" />
                </div>
                <div class="field">
                  <label>Año</label>
                  <input [(ngModel)]="form.anno" type="number" placeholder="2024" />
                </div>
                <div class="field">
                  <label>Cilindrada cm³</label>
                  <input [(ngModel)]="form.cilindradaCm3" type="number" placeholder="1400" />
                </div>
                <div class="field">
                  <label>Tipo de vehículo</label>
                  <select [(ngModel)]="form.tipoVehiculo">
                    <option value="AUTOMOVIL">Automóvil</option>
                    <option value="CAMIONETA">Camioneta</option>
                    <option value="PICKUP">Pick up</option>
                    <option value="TRACTOCAMION">Tractocamión</option>
                  </select>
                </div>
              </div>
            }
          </section>

          <!-- Parámetros de cálculo -->
          <section class="card">
            <div class="step-pill">
              <span class="step-num">3</span>
              <span>Parámetros del cálculo</span>
            </div>

            <div class="grid-3">
              <div class="field">
                <label>Margen sobre TC</label>
                <input
                  [ngModel]="tcMargen()"
                  (ngModelChange)="onTcMargenChange($event)"
                  type="number"
                  step="0.01"
                />
                <small class="hint">Se suma al FIX para protegerte de variación</small>
              </div>
              <div class="field">
                <label>TC aplicado</label>
                <div class="readonly">
                  {{ tcAplicadoPreview() }}
                </div>
                <small class="hint">FIX + margen</small>
              </div>
              <div class="field">
                <label>Tipo de trámite</label>
                <select [(ngModel)]="form.tipoTramite">
                  <option value="NORMAL">Normal</option>
                  <option value="EXPRESS">Express (+$2,000)</option>
                </select>
              </div>
            </div>

            <div class="value-source">
              <div class="value-source__head">
                <div>
                  <strong>Valor del vehiculo</strong>
                  <span>Elige si se toma del Anexo 2 o se captura manualmente.</span>
                </div>
              </div>
              <div class="value-toggle" role="group" aria-label="Origen del valor aduana">
                <button
                  type="button"
                  class="value-option"
                  [class.value-option--active]="!manualMode()"
                  (click)="setManualMode(false)"
                >
                  <span>Anexo 2</span>
                  <small>Buscar en catalogo SAT y elegir la entrada correcta.</small>
                </button>
                <button
                  type="button"
                  class="value-option"
                  [class.value-option--active]="manualMode()"
                  (click)="setManualMode(true)"
                >
                  <span>Valor manual</span>
                  <small>Usar un monto USD capturado por el operador.</small>
                </button>
              </div>

              @if (manualMode()) {
                <div class="manual-value-panel">
                  <label class="field">
                    <span>Valor aduana manual (USD)</span>
                    <input
                      [ngModel]="form.valorAduanaUsdOverride"
                      (ngModelChange)="onManualValorChange($event)"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej. 12500"
                    />
                    <small class="hint">Este valor reemplaza el precio estimado del Anexo 2 para este calculo.</small>
                  </label>
                </div>
              }
            </div>

            <button
              type="button"
              class="ghost-btn ghost-btn--inline"
              (click)="advancedOpen = !advancedOpen"
            >
              {{ advancedOpen ? '− Ocultar' : '+ Mostrar' }} ajustes avanzados
            </button>

            @if (advancedOpen) {
              <div class="grid-2 advanced">
                <div class="field manual-legacy">
                  <label>Override valor aduana (USD)</label>
                  <input
                    [(ngModel)]="form.valorAduanaUsdOverride"
                    type="number"
                    placeholder="Sobrescribe Anexo 2"
                  />
                  <small class="hint">
                    Captura el valor en USD y presiona <em>Calcular cotización</em>. Se ignora el
                    catálogo.
                  </small>
                </div>
                <div class="field">
                  <label>Override honorarios (MXN)</label>
                  <input
                    [(ngModel)]="form.honorariosOverride"
                    type="number"
                    placeholder="Default según régimen"
                  />
                </div>
                <div class="field">
                  <label>Categoría Amparo</label>
                  <select [(ngModel)]="form.categoriaAmparoOverride">
                    <option [ngValue]="null">Auto-detectar</option>
                    <option value="NORMAL">Normal (Amparo)</option>
                    <option value="LUJO">Lujo (Amparo)</option>
                  </select>
                </div>
              </div>
            }

            <div class="calc-row">
              <button
                (click)="buscarOCalcular()"
                [disabled]="cargando() || !canCalculate()"
                class="btn-calc"
              >
                @if (cargando()) {
                  <span class="spinner spinner--white"></span>
                  {{ buscandoCandidatos() ? 'Buscando en catálogo…' : 'Calculando…' }}
                } @else {
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7l3 3 5-6"
                      stroke="white"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Calcular cotización
                }
              </button>
              @if (calcError()) {
                <p class="err-msg">{{ calcError() }}</p>
              }
            </div>
          </section>

          <!-- Cliente y guardado -->
          <section class="card">
            <div class="step-pill">
              <span class="step-num">4</span>
              <span>Cliente y guardado</span>
            </div>

            <div class="grid-2">
              <div class="field relative">
                <label>Cliente</label>
                <input
                  [(ngModel)]="clienteText"
                  (input)="onClienteSearch()"
                  (focus)="showClienteResults.set(true)"
                  (blur)="hideClienteResults()"
                  placeholder="Buscar por apodo o nombre"
                  autocomplete="off"
                />
                @if (showClienteResults() && clienteResults().length > 0) {
                  <div class="cliente-pop">
                    @for (c of clienteResults(); track c.id) {
                      <button type="button" (mousedown)="selectCliente(c)" class="cliente-row">
                        <span class="cliente-row__apodo">{{ c.apodo }}</span>
                        @if (c.nombreCompleto) {
                          <span class="cliente-row__full">/ {{ c.nombreCompleto }}</span>
                        }
                      </button>
                    }
                  </div>
                }
                @if (clienteId) {
                  <button
                    type="button"
                    (click)="clearCliente()"
                    class="ghost-btn ghost-btn--inline"
                  >
                    Quitar
                  </button>
                }
              </div>
              <div class="field">
                <label>Notas internas</label>
                <input [(ngModel)]="notas" placeholder="Opcional" />
              </div>
            </div>

            <button (click)="guardar()" [disabled]="!resultado() || saving()" class="btn-save">
              @if (saving()) {
                <span class="spinner spinner--white"></span>
                Guardando…
              } @else {
                Guardar borrador
              }
            </button>
          </section>
        </div>

        <!-- RIGHT — panel de resultado (sticky) -->
        <aside class="cot-result">
          @if (cargando()) {
            <div class="result-loading">
              <p class="eyebrow">{{ buscandoCandidatos() ? 'Buscando' : 'Cotizando' }}</p>
              <div class="loader-bar"><div class="loader-bar__fill"></div></div>
              <p class="loader-stage">{{ calcStage() }}</p>
              <p class="loader-help">
                Se consulta NHTSA, Anexo 2, Banxico y parámetros fiscales del régimen.
              </p>
            </div>
          } @else if (candidatos() && !resultado()) {
            <!-- Paso de selección de candidato -->
            <div class="cand-header">
              <p class="eyebrow">Paso 2 de 3</p>
              @if (candidatos()!.candidatos.length === 0) {
                <h3 class="cand-title">No encontramos este vehículo en el catálogo</h3>
                <p class="cand-sub">
                  No hay entradas que coincidan con
                  <strong>{{ candidatos()!.marca }} {{ candidatos()!.modelo }}</strong>
                  en el Anexo 2. Puedes capturar el valor aduana manualmente o ajustar los datos del
                  vehículo y volver a intentar.
                </p>
              } @else {
                <h3 class="cand-title">¿Cuál entrada del catálogo es la correcta?</h3>
                <p class="cand-sub">
                  Encontramos {{ especificosCount() }}
                  {{ especificosCount() === 1 ? 'coincidencia' : 'coincidencias' }} para
                  <strong>{{ candidatos()!.marca }} {{ candidatos()!.modelo }}</strong>
                  ({{ candidatos()!.antiguedadAnios }} año{{
                    candidatos()!.antiguedadAnios === 1 ? '' : 's'
                  }}
                  de antigüedad). Elige la que corresponde a este vehículo.
                </p>
              }
            </div>

            <div class="cand-list">
              @for (c of candidatos()!.candidatos; track c.precioEstimadoId) {
                <button
                  type="button"
                  class="cand-card"
                  [class.cand-card--suggested]="c.esSugerido"
                  [class.cand-card--generic]="c.esGenerico"
                  (click)="calcularConCandidato(c)"
                >
                  <div class="cand-card__top">
                    <span class="cand-frac">{{ c.fraccion }}</span>
                    <span class="cand-origen">{{ c.hojaOrigen }}</span>
                    @if (c.esSugerido) {
                      <span class="cand-badge">Sugerido</span>
                    }
                    @if (c.esGenerico) {
                      <span class="cand-badge cand-badge--generic">Precio estimado</span>
                    }
                  </div>
                  <div class="cand-card__body">
                    @if (c.esGenerico) {
                      <p class="cand-modelo">
                        {{ c.modeloCatalogo || 'PRECIOS ESTIMADOS APLICABLES A VEHICULOS EN CUYO ANO-MODELO NO SE ESTABLECE DICHO PRECIO' }}
                      </p>
                      <p class="cand-sub-small">
                        Fraccion {{ c.fraccion }}
                        @if (c.inciso) {
                          · inciso {{ c.inciso }}
                        }
                        · aplica cuando el modelo no esta listado en el catalogo SAT
                      </p>
                    } @else {
                      <p class="cand-modelo">{{ c.marcaTextoCatalogo }} {{ c.modeloCatalogo }}</p>
                    }
                    <div class="cand-meta">
                      <span class="cand-price">\${{ c.precioUsd | number: '1.0-0' }} USD</span>
                      @if (!c.esAntiguedadExacta) {
                        <span class="cand-age-warn">
                          año {{ c.antiguedadDisponible }} (pedido:
                          {{ candidatos()!.antiguedadAnios }})
                        </span>
                      } @else {
                        <span class="cand-age-ok">año {{ c.antiguedadDisponible }} ✓</span>
                      }
                    </div>
                    <div class="cand-years">
                      @for (a of c.aniosDisponibles; track a) {
                        <span
                          class="year-pill"
                          [class.year-pill--active]="a === c.antiguedadDisponible"
                          >{{ a }}</span
                        >
                      }
                    </div>
                  </div>
                </button>
              }

              <!-- Opción manual: siempre disponible como última tarjeta -->
              <button type="button" class="cand-card cand-card--manual" (click)="abrirManual()">
                <div class="cand-card__body">
                  <p class="cand-modelo">Capturar precio aduana manualmente</p>
                  <p class="cand-sub-small">
                    @if (candidatos()!.candidatos.length === 0) {
                      No se encontró este vehículo. Captura el valor aduana en USD y continúa con el
                      cálculo.
                    } @else {
                      Ninguna de las opciones anteriores corresponde a este vehículo
                    }
                  </p>
                </div>
              </button>
            </div>

            <!-- Disclaimer -->
            <div class="cand-disclaimer">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="6" stroke="#78350F" stroke-width="1.3" />
                <path
                  d="M6.5 4v3M6.5 9h.01"
                  stroke="#78350F"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </svg>
              <span
                >¿Ves entradas incorrectas o duplicadas? Ve a
                <a href="/admin/catalogo-precios" target="_blank">Catálogo de precios</a>
                para corregirlas o eliminar duplicados.</span
              >
            </div>
          } @else if (resultado()) {
            @if (resultado(); as r) {
              <!-- Total card -->
              <div class="total-card">
                <p class="eyebrow">Total</p>
                <p class="total-number">\${{ r.total | number: '1.2-2' }}<span>MXN</span></p>
                <div class="total-meta">
                  <span class="regimen-pill">{{ r.regimenFiscal }}</span>
                  <span class="fraccion">{{ r.fraccion }}</span>
                  <span class="source">{{ sourceLabel(r.fuentePrecio) }}</span>
                </div>
              </div>

              <!-- Visual proportion bar -->
              <div class="bar-wrap">
                <div class="bar">
                  <div
                    class="bar-seg bar-seg--base"
                    [style.flex]="props().base"
                    title="Base en pesos"
                  ></div>
                  <div
                    class="bar-seg bar-seg--imp"
                    [style.flex]="props().imp"
                    title="Impuestos"
                  ></div>
                  <div
                    class="bar-seg bar-seg--hon"
                    [style.flex]="props().hon"
                    title="Honorarios + extras"
                  ></div>
                </div>
                <div class="bar-legend">
                  <span><i class="dot dot--base"></i>Base {{ pctOfTotal(r.valorPesos) }}%</span>
                  <span
                    ><i class="dot dot--imp"></i>Impuestos {{ pctOfTotal(r.impuestosTotal) }}%</span
                  >
                  <span
                    ><i class="dot dot--hon"></i>Honorarios+
                    {{ pctOfTotal(r.honorarios + (r.cargoExpress || 0)) }}%</span
                  >
                </div>
              </div>

              <!-- Toggle math -->
              <button type="button" class="math-toggle" (click)="showMath.set(!showMath())">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M1.5 5.5L4.5 8.5L9.5 2.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                {{ showMath() ? 'Ocultar' : 'Mostrar' }} cálculo línea por línea
              </button>

              <!-- Line items -->
              <div class="lines" [class.lines--math]="showMath()">
                <div class="line line--base">
                  <div class="line__main">
                    <span class="line__label">Valor pesos</span>
                    <strong class="line__amount">\${{ r.valorPesos | number: '1.2-2' }}</strong>
                  </div>
                  @if (showMath()) {
                    <span class="line__formula"
                      >\${{ r.valorAduanaUsd | number: '1.2-2' }} ×
                      {{ r.tipoCambioAplicado?.toFixed(4) }}</span
                    >
                  }
                </div>

                <div class="line">
                  <div class="line__main">
                    <span class="line__label"
                      >IGI <em>{{ r.igiPorcentaje * 100 | number: '1.0-2' }}%</em></span
                    >
                    <strong class="line__amount">\${{ r.igi | number: '1.2-2' }}</strong>
                  </div>
                  @if (showMath()) {
                    <span class="line__formula"
                      >Valor × {{ r.igiPorcentaje * 100 | number: '1.0-2' }}%</span
                    >
                  }
                </div>

                <div class="line">
                  <div class="line__main">
                    <span class="line__label">DTA</span>
                    <strong class="line__amount">\${{ r.dta | number: '1.2-2' }}</strong>
                  </div>
                  @if (showMath()) {
                    <span class="line__formula">
                      @if (r.regimenFiscal === 'POST_2017') {
                        máx(Valor × 0.8%, $202)
                      } @else {
                        Cuota fija
                      }
                    </span>
                  }
                </div>

                <div class="line">
                  <div class="line__main">
                    <span class="line__label">IVA <em>16%</em></span>
                    <strong class="line__amount">\${{ r.iva | number: '1.2-2' }}</strong>
                  </div>
                  @if (showMath()) {
                    <span class="line__formula">(Valor + IGI + DTA) × 16%</span>
                  }
                </div>

                @if (r.prev > 0) {
                  <div class="line">
                    <div class="line__main">
                      <span class="line__label">PREV</span>
                      <strong class="line__amount">\${{ r.prev | number: '1.2-2' }}</strong>
                    </div>
                    @if (showMath()) {
                      <span class="line__formula">Cuota fija {{ r.regimenFiscal }}</span>
                    }
                  </div>
                }

                @if (r.prv > 0) {
                  <div class="line">
                    <div class="line__main">
                      <span class="line__label">PRV</span>
                      <strong class="line__amount">\${{ r.prv | number: '1.2-2' }}</strong>
                    </div>
                    @if (showMath()) {
                      <span class="line__formula">Cuota fija PRE_2016</span>
                    }
                  </div>
                }

                <div class="line line--subtotal">
                  <div class="line__main">
                    <span class="line__label">Impuestos</span>
                    <strong class="line__amount">\${{ r.impuestosTotal | number: '1.2-2' }}</strong>
                  </div>
                </div>

                <div class="line">
                  <div class="line__main">
                    <span class="line__label">Honorarios</span>
                    <strong class="line__amount">\${{ r.honorarios | number: '1.2-2' }}</strong>
                  </div>
                  @if (showMath() && r.regimenFiscal === 'POST_2017') {
                    <span class="line__formula">$18,000 base + $350 adicional</span>
                  }
                </div>

                @if (r.cargoExpress > 0) {
                  <div class="line">
                    <div class="line__main">
                      <span class="line__label">Cargo express</span>
                      <strong class="line__amount">\${{ r.cargoExpress | number: '1.2-2' }}</strong>
                    </div>
                  </div>
                }

                <div class="line line--total">
                  <div class="line__main">
                    <span class="line__label">TOTAL</span>
                    <strong class="line__amount">\${{ r.total | number: '1.2-2' }}</strong>
                  </div>
                </div>
              </div>

              <!-- Evidence -->
              <div class="evidence">
                <div class="evidence__head">
                  <span>Evidencia del precio</span>
                  <span
                    class="match-pill"
                    [class]="'match-pill--' + (r.precioMatchTipo || 'na').toLowerCase()"
                  >
                    {{ r.precioMatchTipo || 'SIN DATO' }}
                    @if (r.precioMatchScore) {
                      · {{ r.precioMatchScore }}
                    }
                  </span>
                </div>
                <p class="evidence__row">
                  <span>Vehículo en catálogo</span>
                  <strong
                    >{{ r.precioCatalogoMarca || r.marca || '—' }}
                    {{ r.precioCatalogoModelo || '' }}</strong
                  >
                </p>
                <p class="evidence__row">
                  <span>Antigüedad usada</span>
                  <strong>{{ r.precioAntiguedadAnios || 'N/D' }} años</strong>
                </p>
                <p class="evidence__row">
                  <span>Origen</span>
                  <strong>{{ r.precioCatalogoOrigen || sourceLabel(r.fuentePrecio) }}</strong>
                </p>
                @if (r.tipoCambioContexto) {
                  <p class="evidence__row">
                    <span>TC fuente</span>
                    <strong>{{ r.tipoCambioContexto }}</strong>
                  </p>
                }
                @if (r.precioAdvertencia) {
                  <div class="evidence__warn">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path
                        d="M6.5 1L12 11H1L6.5 1z"
                        stroke="#B45309"
                        stroke-width="1.4"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M6.5 5.5v2.5M6.5 9.5h.01"
                        stroke="#B45309"
                        stroke-width="1.4"
                        stroke-linecap="round"
                      />
                    </svg>
                    {{ r.precioAdvertencia }}
                  </div>
                }
              </div>
            }
          } @else {
            <div class="empty">
              <div class="empty__icon">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect
                    x="4"
                    y="4"
                    width="28"
                    height="28"
                    rx="4"
                    stroke="#C5C8D6"
                    stroke-width="1.5"
                  />
                  <path
                    d="M10 18h16M10 24h10M10 12h16"
                    stroke="#C5C8D6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <p class="empty__title">Sin cálculo todavía</p>
              <p class="empty__help">
                Captura el VIN o los datos básicos del vehículo y presiona
                <em>Calcular cotización</em>.
              </p>
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      /* ─── Layout shell ─────────────────────────── */
      .cot-shell {
        padding-bottom: 40px;
      }
      .cot-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .eyebrow {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        color: #8b93a1;
        margin: 0 0 4px;
      }
      .title {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #0d1017;
        margin: 0;
        line-height: 1.1;
      }

      /* TC chip top right */
      .tc-chip {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px 16px 10px;
        border: 1px solid #e4e7ec;
        border-radius: 14px;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        min-width: 200px;
        box-shadow: 0 1px 2px rgba(13, 16, 23, 0.04);
      }
      .tc-chip__label {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #6b717f;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tc-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #d1d5db;
      }
      .tc-dot--live {
        background: #16a34a;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
      }
      .tc-chip__value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 22px;
        font-weight: 600;
        color: #0d1017;
        line-height: 1;
        letter-spacing: -0.5px;
      }
      .tc-chip__value small {
        font-family: 'Inter', system-ui;
        font-size: 10.5px;
        font-weight: 500;
        color: #8b93a1;
        margin-left: 6px;
        letter-spacing: 0.3px;
      }
      .tc-chip__time {
        font-size: 10.5px;
        color: #8b93a1;
        margin: 0;
      }

      /* ─── Grid ─────────────────────────── */
      .cot-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(0, 1fr) 380px;
      }
      @media (max-width: 1100px) {
        .cot-grid {
          grid-template-columns: 1fr;
        }
      }

      .cot-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
      }

      /* ─── Cards ─────────────────────────── */
      .card {
        background: white;
        border-radius: 16px;
        padding: 22px 22px;
        border: 1px solid #eceff3;
        box-shadow:
          0 1px 3px rgba(13, 16, 23, 0.05),
          0 0 0 1px rgba(13, 16, 23, 0.02);
        transition: box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .card:hover {
        box-shadow:
          0 6px 24px rgba(13, 16, 23, 0.06),
          0 0 0 1px rgba(13, 16, 23, 0.03);
      }

      .step-pill {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        font-size: 13.5px;
        font-weight: 600;
        color: #1e2330;
      }
      .step-num {
        display: inline-grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #0d1017;
        color: white;
        font-size: 11px;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
      }
      .ghost-btn {
        margin-left: auto;
        padding: 4px 10px;
        border-radius: 7px;
        background: transparent;
        border: 1px solid #e4e7ec;
        font-size: 11.5px;
        font-weight: 600;
        color: #6b717f;
        cursor: pointer;
        transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .ghost-btn:hover {
        border-color: #c61d26;
        color: #c61d26;
        background: #fef2f2;
      }
      .ghost-btn--inline {
        margin-top: 12px;
        margin-left: 0;
      }

      /* ─── VIN card ─────────────────────────── */
      .vin-card {
        padding-bottom: 18px;
      }
      .vin-card--decoded {
        border-color: rgba(22, 163, 74, 0.3);
        background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
      }
      .big-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        color: #6b717f;
        display: block;
        margin-bottom: 6px;
      }
      .vin-input-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .vin-input {
        flex: 1;
        height: 52px;
        border-radius: 12px;
        border: 1.5px solid #e4e7ec;
        background: white;
        padding: 0 16px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 18px;
        font-weight: 500;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #0d1017;
        outline: none;
        transition:
          border-color 150ms,
          box-shadow 150ms;
      }
      .vin-input:focus {
        border-color: #c61d26;
        box-shadow: 0 0 0 4px rgba(198, 29, 38, 0.1);
      }
      .vin-input::placeholder {
        color: #c5c8d6;
        letter-spacing: normal;
        font-size: 13px;
        text-transform: none;
      }
      .vin-counter {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        color: #8b93a1;
        font-weight: 600;
        min-width: 48px;
        text-align: right;
        transition: color 140ms;
      }
      .vin-counter--ok {
        color: #16a34a;
      }

      .vin-status {
        margin-top: 10px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 500;
      }
      .vin-status--decoding {
        background: #eff6ff;
        color: #1e40af;
      }
      .vin-status--ok {
        background: #f0fdf4;
        color: #166534;
      }
      .vin-status--err {
        background: #fef2f2;
        color: #991b1b;
      }
      .vin-status strong {
        font-weight: 600;
      }

      /* ─── Vehicle summary (compact when decoded) ─── */
      .vehicle-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        padding: 14px 16px;
        background: #f8fafc;
        border-radius: 10px;
      }
      .vehicle-summary > div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .vehicle-summary span {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #8b93a1;
      }
      .vehicle-summary strong {
        font-size: 13.5px;
        color: #0d1017;
        font-weight: 600;
      }

      /* ─── Form fields ─────────────────────────── */
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
      }
      @media (max-width: 640px) {
        .grid-2,
        .grid-3 {
          grid-template-columns: 1fr;
        }
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
      }
      .field label {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #6b717f;
      }
      .field input,
      .field select {
        height: 38px;
        border-radius: 10px;
        border: 1px solid #e4e7ec;
        background: white;
        padding: 0 12px;
        font-size: 13px;
        color: #1e2330;
        font-family: 'Inter', system-ui;
        outline: none;
        transition:
          border-color 140ms,
          box-shadow 140ms;
      }
      .field input:focus,
      .field select:focus {
        border-color: #c61d26;
        box-shadow: 0 0 0 3px rgba(198, 29, 38, 0.08);
      }
      .field .readonly {
        height: 38px;
        line-height: 38px;
        padding: 0 12px;
        border-radius: 10px;
        background: #f8fafc;
        border: 1px solid #eceff3;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 600;
        color: #0d1017;
      }
      .field .hint {
        font-size: 11px;
        color: #8b93a1;
        margin-top: 2px;
      }
      .advanced {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px dashed #eceff3;
      }
      .manual-legacy {
        display: none;
      }
      .value-source {
        margin-top: 16px;
        border: 1px solid #d8dee8;
        border-radius: 12px;
        background: #f8fafc;
        padding: 14px;
      }
      .value-source__head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .value-source__head strong {
        display: block;
        color: #0d1017;
        font-size: 13.5px;
      }
      .value-source__head span {
        display: block;
        margin-top: 2px;
        color: #6b717f;
        font-size: 12px;
      }
      .value-toggle {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .value-option {
        min-height: 82px;
        border: 1px solid #d8dee8;
        border-radius: 10px;
        background: #fff;
        padding: 12px;
        text-align: left;
        cursor: pointer;
        transition:
          border-color 0.14s,
          box-shadow 0.14s,
          background 0.14s;
      }
      .value-option span {
        display: block;
        margin-bottom: 4px;
        color: #1e2330;
        font-size: 13px;
        font-weight: 800;
      }
      .value-option small {
        display: block;
        color: #6b717f;
        font-size: 11.5px;
        line-height: 1.35;
      }
      .value-option--active {
        border-color: #c61d26;
        background: #fff7f7;
        box-shadow: 0 0 0 3px rgba(198, 29, 38, 0.08);
      }
      .value-option--active span {
        color: #991b1b;
      }
      .manual-value-panel {
        margin-top: 12px;
        border-top: 1px dashed #d8dee8;
        padding-top: 12px;
      }
      @media (max-width: 640px) {
        .value-toggle {
          grid-template-columns: 1fr;
        }
      }

      /* ─── Calculate button ─────────────────────── */
      .calc-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-top: 18px;
        flex-wrap: wrap;
      }
      .btn-calc {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 11px 20px;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #c61d26 0%, #a91720 100%);
        color: white;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        transition:
          transform 140ms cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 140ms;
        box-shadow:
          0 2px 8px rgba(198, 29, 38, 0.18),
          0 0 0 1px rgba(198, 29, 38, 0.1);
      }
      .btn-calc:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(198, 29, 38, 0.28);
      }
      .btn-calc:active:not(:disabled) {
        transform: translateY(0);
      }
      .btn-calc:disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }
      .err-msg {
        color: #991b1b;
        font-size: 12.5px;
        margin: 0;
        font-weight: 500;
      }

      /* ─── Cliente autocomplete ─────────────────── */
      .cliente-pop {
        position: absolute;
        left: 0;
        right: 0;
        top: 100%;
        z-index: 30;
        margin-top: 4px;
        max-height: 220px;
        overflow-y: auto;
        background: white;
        border: 1px solid #e4e7ec;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(13, 16, 23, 0.1);
      }
      .cliente-row {
        display: block;
        width: 100%;
        text-align: left;
        padding: 10px 14px;
        border: none;
        background: transparent;
        font-size: 13px;
        color: #1e2330;
        cursor: pointer;
        transition: background 120ms;
      }
      .cliente-row:hover {
        background: #f8fafc;
      }
      .cliente-row__apodo {
        font-weight: 600;
      }
      .cliente-row__full {
        color: #8b93a1;
        margin-left: 4px;
      }

      /* ─── Save button ─────────────────────────── */
      .btn-save {
        margin-top: 18px;
        padding: 11px 22px;
        border-radius: 12px;
        border: none;
        background: #16a34a;
        color: white;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition:
          transform 140ms,
          box-shadow 140ms;
      }
      .btn-save:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(22, 163, 74, 0.25);
      }
      .btn-save:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* ─── Result panel ─────────────────────────── */
      .cot-result {
        position: sticky;
        top: 76px;
        align-self: flex-start;
        background: white;
        border-radius: 18px;
        padding: 22px;
        border: 1px solid #eceff3;
        box-shadow:
          0 8px 32px rgba(13, 16, 23, 0.06),
          0 0 0 1px rgba(13, 16, 23, 0.02);
        max-height: calc(100vh - 96px);
        overflow-y: auto;
      }
      @media (max-width: 1100px) {
        .cot-result {
          position: static;
          max-height: none;
        }
      }

      /* Total card */
      .total-card {
        margin: -6px -6px 16px;
        padding: 18px 18px 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, #0d1017 0%, #1e2330 100%);
        color: white;
      }
      .total-card .eyebrow {
        color: rgba(255, 255, 255, 0.55);
        margin-bottom: 6px;
      }
      .total-number {
        font-family: 'JetBrains Mono', monospace;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -1px;
        color: white;
        margin: 0;
        line-height: 1;
      }
      .total-number span {
        font-family: 'Inter', system-ui;
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.55);
        margin-left: 8px;
        letter-spacing: 0.5px;
      }
      .total-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 12px;
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0.4px;
      }
      .regimen-pill {
        padding: 3px 8px;
        border-radius: 5px;
        background: rgba(198, 29, 38, 0.2);
        color: #fca5a5;
        font-family: 'JetBrains Mono', monospace;
      }
      .fraccion {
        padding: 3px 8px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.8);
        font-family: 'JetBrains Mono', monospace;
      }
      .source {
        padding: 3px 8px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.65);
      }

      /* Proportion bar */
      .bar-wrap {
        margin-bottom: 14px;
      }
      .bar {
        display: flex;
        height: 8px;
        border-radius: 6px;
        overflow: hidden;
        background: #f1f3f6;
        gap: 2px;
      }
      .bar-seg {
        transition: flex 240ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .bar-seg--base {
        background: #3b82f6;
      }
      .bar-seg--imp {
        background: #d97706;
      }
      .bar-seg--hon {
        background: #16a34a;
      }

      .bar-legend {
        display: flex;
        gap: 12px;
        margin-top: 8px;
        font-size: 11px;
        color: #6b717f;
        flex-wrap: wrap;
      }
      .bar-legend span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
      }
      .dot--base {
        background: #3b82f6;
      }
      .dot--imp {
        background: #d97706;
      }
      .dot--hon {
        background: #16a34a;
      }

      /* Math toggle */
      .math-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
        padding: 6px 10px;
        border-radius: 8px;
        background: transparent;
        border: 1px dashed #d8dee8;
        font-size: 11.5px;
        font-weight: 600;
        color: #6b717f;
        cursor: pointer;
        transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .math-toggle:hover {
        border-style: solid;
        border-color: #c61d26;
        color: #c61d26;
      }
      .math-toggle svg {
        color: currentColor;
      }

      /* Line items */
      .lines {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px 0;
      }
      .line {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px 8px;
        border-radius: 7px;
        transition: background 140ms;
      }
      .line:hover {
        background: #f8fafc;
      }
      .line__main {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }
      .line__label {
        font-size: 12.5px;
        color: #1e2330;
        font-weight: 500;
      }
      .line__label em {
        font-style: normal;
        color: #8b93a1;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        margin-left: 4px;
      }
      .line__amount {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        color: #0d1017;
        font-weight: 600;
        letter-spacing: -0.3px;
      }
      .line__formula {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        color: #8b93a1;
        padding-left: 0;
        line-height: 1.3;
        letter-spacing: 0;
      }
      .lines--math .line {
        padding: 8px;
      }

      .line--base {
        background: #eff6ff;
      }
      .line--base .line__label {
        color: #1e40af;
        font-weight: 600;
      }
      .line--base .line__amount {
        color: #1e40af;
      }

      .line--subtotal {
        margin-top: 4px;
        padding-top: 9px;
        border-top: 1px solid #eceff3;
      }
      .line--subtotal .line__label {
        font-weight: 700;
        color: #0d1017;
      }
      .line--subtotal .line__amount {
        color: #0d1017;
        font-weight: 700;
      }

      .line--total {
        margin-top: 6px;
        padding: 11px 8px;
        background: linear-gradient(
          135deg,
          rgba(198, 29, 38, 0.06) 0%,
          rgba(198, 29, 38, 0.02) 100%
        );
        border: 1px solid rgba(198, 29, 38, 0.16);
        border-radius: 9px;
      }
      .line--total .line__label {
        font-size: 13px;
        font-weight: 700;
        color: #0d1017;
        letter-spacing: 0.4px;
        text-transform: uppercase;
      }
      .line--total .line__amount {
        font-size: 15px;
        color: #c61d26;
        font-weight: 700;
      }

      /* Evidence */
      .evidence {
        margin-top: 14px;
        padding: 14px;
        background: #fafbfc;
        border: 1px solid #eceff3;
        border-radius: 12px;
      }
      .evidence__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #6b717f;
      }
      .evidence__row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 4px 0;
        margin: 0;
        font-size: 11.5px;
      }
      .evidence__row span {
        color: #8b93a1;
      }
      .evidence__row strong {
        color: #1e2330;
        font-weight: 600;
        text-align: right;
      }
      .evidence__warn {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #fffbeb;
        border: 1px solid rgba(217, 119, 6, 0.22);
        color: #78350f;
        font-size: 11.5px;
        line-height: 1.4;
        display: flex;
        gap: 6px;
        align-items: flex-start;
      }
      .match-pill {
        padding: 2px 7px;
        border-radius: 5px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.4px;
        font-weight: 700;
      }
      .match-pill--especifico {
        background: #f0fdf4;
        color: #166534;
      }
      .match-pill--marca {
        background: #fffbeb;
        color: #78350f;
      }
      .match-pill--generico {
        background: #fef2f2;
        color: #991b1b;
      }
      .match-pill--override {
        background: #f5f3ff;
        color: #5b21b6;
      }
      .match-pill--amparo {
        background: #eff6ff;
        color: #1e40af;
      }
      .match-pill--na {
        background: #f1f3f6;
        color: #6b717f;
      }

      /* Empty state */
      .empty {
        padding: 60px 20px;
        text-align: center;
      }
      .empty__icon {
        display: inline-grid;
        place-items: center;
        margin-bottom: 14px;
        opacity: 0.7;
      }
      .empty__title {
        font-size: 14.5px;
        font-weight: 600;
        color: #1e2330;
        margin: 0 0 4px;
      }
      .empty__help {
        font-size: 12.5px;
        color: #8b93a1;
        margin: 0;
        line-height: 1.5;
      }
      .empty__help em {
        color: #c61d26;
        font-style: normal;
        font-weight: 600;
      }

      /* Loading state */
      .result-loading {
        padding: 20px 4px;
      }
      .loader-bar {
        margin: 14px 0 12px;
        height: 6px;
        background: #f1f3f6;
        border-radius: 3px;
        overflow: hidden;
      }
      .loader-bar__fill {
        width: 40%;
        height: 100%;
        background: linear-gradient(90deg, #c61d26, #fb7185);
        border-radius: 3px;
        animation: loader-slide 1.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }
      @keyframes loader-slide {
        0% {
          margin-left: -40%;
        }
        100% {
          margin-left: 100%;
        }
      }
      .loader-stage {
        font-size: 14px;
        font-weight: 600;
        color: #0d1017;
        margin: 0 0 6px;
      }
      .loader-help {
        font-size: 12px;
        color: #8b93a1;
        margin: 0;
        line-height: 1.5;
      }

      /* ─── Candidatos picker ────────────────────── */
      .cand-header {
        margin-bottom: 14px;
      }
      .cand-title {
        font-size: 15px;
        font-weight: 700;
        color: #0d1017;
        margin: 4px 0 6px;
        letter-spacing: -0.3px;
      }
      .cand-sub {
        font-size: 12px;
        color: #6b717f;
        margin: 0;
        line-height: 1.5;
      }
      .cand-sub strong {
        color: #0d1017;
        font-weight: 600;
      }

      .cand-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }

      .cand-card {
        width: 100%;
        text-align: left;
        border: 1.5px solid #e4e7ec;
        border-radius: 12px;
        padding: 0;
        background: white;
        cursor: pointer;
        transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      .cand-card:hover {
        border-color: #c61d26;
        box-shadow: 0 4px 14px rgba(198, 29, 38, 0.1);
      }
      .cand-card--suggested {
        border-color: rgba(22, 163, 74, 0.4);
        background: #f0fdf4;
      }
      .cand-card--suggested:hover {
        border-color: #16a34a;
        box-shadow: 0 4px 14px rgba(22, 163, 74, 0.14);
      }
      .cand-card--manual {
        background: #f8fafc;
        border-style: dashed;
      }
      .cand-card--manual:hover {
        border-color: #6b717f;
        border-style: solid;
        background: white;
      }
      .cand-card--generic {
        border-color: rgba(217, 119, 6, 0.35);
        background: #fffbeb;
      }
      .cand-card--generic:hover {
        border-color: #d97706;
        box-shadow: 0 4px 14px rgba(217, 119, 6, 0.14);
      }
      .cand-card--generic .cand-card__top {
        background: rgba(217, 119, 6, 0.06);
      }
      .cand-badge--generic {
        background: #fef3c7;
        color: #92400e;
      }

      .cand-card__top {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px 6px;
        background: rgba(13, 16, 23, 0.03);
        border-bottom: 1px solid #f1f3f6;
        flex-wrap: wrap;
      }
      .cand-frac {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        font-weight: 700;
        color: #1e2330;
        letter-spacing: 0.2px;
      }
      .cand-origen {
        font-size: 10px;
        color: #8b93a1;
        font-weight: 500;
        padding: 2px 6px;
        background: #eceff3;
        border-radius: 4px;
      }
      .cand-badge {
        margin-left: auto;
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        padding: 2px 7px;
        border-radius: 4px;
        background: #dcfce7;
        color: #15803d;
      }

      .cand-card__body {
        padding: 10px 12px 10px;
      }
      .cand-modelo {
        font-size: 13px;
        font-weight: 600;
        color: #1e2330;
        margin: 0 0 6px;
      }
      .cand-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .cand-price {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12.5px;
        font-weight: 700;
        color: #0d1017;
      }
      .cand-age-ok {
        font-size: 10.5px;
        font-weight: 600;
        color: #15803d;
        padding: 2px 6px;
        background: #dcfce7;
        border-radius: 4px;
      }
      .cand-age-warn {
        font-size: 10.5px;
        font-weight: 600;
        color: #92400e;
        padding: 2px 6px;
        background: #fef3c7;
        border-radius: 4px;
      }
      .cand-years {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .year-pill {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9.5px;
        padding: 2px 5px;
        border-radius: 4px;
        background: #f1f3f6;
        color: #6b717f;
        font-weight: 600;
      }
      .year-pill--active {
        background: #dbeafe;
        color: #1e40af;
      }
      .cand-sub-small {
        font-size: 11px;
        color: #8b93a1;
        margin: 2px 0 0;
      }

      .cand-disclaimer {
        display: flex;
        gap: 7px;
        align-items: flex-start;
        padding: 10px 12px;
        border-radius: 9px;
        background: #fffbeb;
        border: 1px solid rgba(217, 119, 6, 0.2);
        font-size: 11px;
        color: #78350f;
        line-height: 1.5;
      }
      .cand-disclaimer a {
        color: #b45309;
        font-weight: 600;
        text-decoration: underline;
      }
      .cand-disclaimer a:hover {
        color: #78350f;
      }

      /* Spinner */
      .spinner {
        width: 12px;
        height: 12px;
        border: 1.6px solid #e4e7ec;
        border-top-color: #c61d26;
        border-radius: 50%;
        display: inline-block;
        animation: spin 0.7s linear infinite;
      }
      .spinner--white {
        border-color: rgba(255, 255, 255, 0.4);
        border-top-color: white;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class CotizacionNuevaComponent {
  private cotizacionService = inject(CotizacionService);
  private vehiculoService = inject(VehiculoService);
  private clienteService = inject(ClienteService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private calcTimer: number | null = null;

  marcas = signal<MarcaDto[]>([]);
  clienteResults = signal<ClienteListDto[]>([]);
  showClienteResults = signal(false);
  tipoCambio = signal<{ tipoCambio: number; fetchedAt?: string } | null>(null);
  resultado = signal<CotizacionOutput | null>(null);
  candidatos = signal<CandidatosPrecioOutput | null>(null);
  decodeMessage = signal('');
  decodeOk = signal(false);
  calcError = signal('');
  calcStage = signal('');
  decoding = signal(false);
  calculating = signal(false);
  buscandoCandidatos = signal(false);
  saving = signal(false);
  detailsOpen = signal(false);
  showMath = signal(false);
  advancedOpen = false;

  /** True mientras haya cualquier operación de fondo en curso */
  cargando = computed(() => this.calculating() || this.buscandoCandidatos());

  /** Conteo de candidatos específicos (sin contar la entrada genérica de la fracción) */
  especificosCount = computed(
    () => this.candidatos()?.candidatos.filter(c => !c.esGenerico).length ?? 0
  );
  clienteId: string | null = null;
  clienteText = '';
  notas = '';
  private clienteSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private hideClienteTimer: ReturnType<typeof setTimeout> | null = null;

  form: CotizacionInput = {
    vin: null,
    marcaId: null,
    marca: null,
    modelo: null,
    anno: null,
    cilindradaCm3: null,
    tipoVehiculo: 'AUTOMOVIL',
    valorAduanaUsdOverride: null,
    precioEstimadoIdOverride: null,
    tcMargen: 0.3,
    tipoTramite: 'NORMAL',
    honorariosOverride: null,
    categoriaAmparoOverride: null,
  };

  tcMargen = signal(0.3);
  manualMode = signal(false);

  tcAplicadoPreview = computed(() => {
    const tc = this.tipoCambio()?.tipoCambio;
    if (!tc) return '— — — —';
    return (tc + this.tcMargen()).toFixed(4);
  });

  onTcMargenChange(value: string) {
    const parsed = parseFloat(value);
    this.tcMargen.set(isNaN(parsed) ? 0 : parsed);
    this.form.tcMargen = this.tcMargen();
  }

  /** Proporciones para la barra visual (base / impuestos / honorarios) */
  props = computed(() => {
    const r = this.resultado();
    if (!r) return { base: 1, imp: 1, hon: 1 };
    const base = Math.max(r.valorPesos, 0);
    const imp = Math.max(r.impuestosTotal - base, 0); // impuestos contienen valorPesos en AMPARO; restamos base
    const hon = Math.max((r.honorarios || 0) + (r.cargoExpress || 0), 0);
    return { base, imp: imp || 1, hon: hon || 1 };
  });

  pctOfTotal(amount: number): string {
    const r = this.resultado();
    if (!r || !r.total) return '0';
    return ((amount / r.total) * 100).toFixed(0);
  }

  constructor() {
    this.vehiculoService.getMarcas().subscribe(m => this.marcas.set(m));
    this.cotizacionService
      .getTipoCambio()
      .subscribe({ next: tc => this.tipoCambio.set(tc), error: () => this.tipoCambio.set(null) });

    const qp = this.route.snapshot.queryParamMap;
    const vehiculoId = qp.get('vehiculoId');
    const vinParam = qp.get('vin');
    const clienteIdParam = qp.get('clienteId');

    if (vehiculoId) {
      this.vehiculoService.getById(vehiculoId).subscribe({
        next: v => {
          if (v.vin) {
            this.form.vin = v.vin.toUpperCase();
            this.decodeVin();
          }
          if (v.clienteApodo) this.clienteText = v.clienteApodo;
        },
      });
    } else if (vinParam && vinParam.length === 17) {
      // Pre-rellenado desde bandeja de campo: arranca el flujo con el VIN del yardero.
      this.form.vin = vinParam.toUpperCase();
      this.decodeVin();
    }

    if (clienteIdParam) {
      this.clienteId = clienteIdParam;
      this.clienteService.getById(clienteIdParam).subscribe({
        next: c => {
          this.clienteText = c.nombreCompleto || c.apodo || '';
        },
        error: () => {
          /* si falla, el usuario puede buscar manualmente */
        },
      });
    }
  }

  onVinInput(): void {
    this.form.vin = this.form.vin?.toUpperCase() || null;
    if ((this.form.vin || '').length === 17) this.decodeVin();
  }

  canCalculate(): boolean {
    return (
      (this.form.vin || '').length === 17 ||
      !!(this.form.modelo && this.form.anno && (this.form.marcaId || this.form.marca))
    );
  }

  setManualMode(enabled: boolean): void {
    this.manualMode.set(enabled);
    this.resultado.set(null);
    this.candidatos.set(null);
    this.form.precioEstimadoIdOverride = null;

    if (!enabled) {
      this.form.valorAduanaUsdOverride = null;
      return;
    }

    setTimeout(() => {
      document.querySelector<HTMLElement>('.manual-value-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      document.querySelector<HTMLInputElement>('.manual-value-panel input')?.focus();
    }, 80);
  }

  onManualValorChange(value: string | number | null): void {
    const parsed = Number(value);
    this.form.valorAduanaUsdOverride = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  sourceLabel(source: string): string {
    if (source === 'ANEXO2') return 'Anexo 2';
    if (source === 'OVERRIDE') return 'Manual';
    if (source === 'AMPARO') return 'Amparo';
    if (source === 'GENERICO') return 'Genérico';
    return source;
  }

  onClienteSearch(): void {
    if (this.clienteSearchTimeout) clearTimeout(this.clienteSearchTimeout);
    this.clienteId = null;
    if (!this.clienteText.trim()) {
      this.clienteResults.set([]);
      return;
    }
    this.clienteSearchTimeout = setTimeout(() => {
      this.clienteService.searchAutocomplete(this.clienteText).subscribe({
        next: res => {
          this.clienteResults.set(res);
          this.showClienteResults.set(true);
        },
      });
    }, 250);
  }

  selectCliente(cliente: ClienteListDto): void {
    this.clienteId = cliente.id;
    this.clienteText = cliente.nombreCompleto
      ? `${cliente.apodo} / ${cliente.nombreCompleto}`
      : cliente.apodo;
    this.showClienteResults.set(false);
  }

  hideClienteResults(): void {
    if (this.hideClienteTimer) clearTimeout(this.hideClienteTimer);
    this.hideClienteTimer = setTimeout(() => this.showClienteResults.set(false), 180);
  }

  clearCliente(): void {
    this.clienteId = null;
    this.clienteText = '';
    this.clienteResults.set([]);
  }

  decodeVin(): void {
    if (!this.form.vin || this.form.vin.length !== 17 || this.decoding()) return;
    this.decoding.set(true);
    this.decodeMessage.set('');
    this.cotizacionService.decodeVin(this.form.vin).subscribe({
      next: v => {
        this.form.marca = v.make;
        this.form.modelo = v.model;
        this.form.anno = v.modelYear;
        this.form.cilindradaCm3 = v.displacementCC
          ? Math.round(v.displacementCC)
          : this.form.cilindradaCm3;
        const make = (v.make || '').toUpperCase();
        const found = this.marcas().find(
          m => m.nombre.toUpperCase() === make || m.aliases.some(a => a.toUpperCase() === make)
        );
        this.form.marcaId = found?.id || null;
        this.decodeOk.set(true);
        this.decodeMessage.set(`${v.make || ''} ${v.model || ''} ${v.modelYear || ''}`.trim());
        this.decoding.set(false);
      },
      error: () => {
        this.decodeOk.set(false);
        this.decodeMessage.set('No se pudo decodificar el VIN. Captura los datos manualmente.');
        this.decoding.set(false);
        this.detailsOpen.set(true);
      },
    });
  }

  /** Punto de entrada del botón. Busca candidatos primero; si hay ambigüedad, muestra el picker. */
  buscarOCalcular(): void {
    if (!this.canCalculate()) return;
    this.calcError.set('');
    this.resultado.set(null);
    this.candidatos.set(null);

    if (this.manualMode()) {
      if (!this.form.valorAduanaUsdOverride || this.form.valorAduanaUsdOverride <= 0) {
        this.calcError.set('Captura un valor aduana manual mayor a cero.');
        return;
      }
      this.form.precioEstimadoIdOverride = null;
      this.calcular();
      return;
    }

    // Si ya eligió un candidato del picker, respetar esa elección.
    if (this.form.precioEstimadoIdOverride) {
      this.calcular();
      return;
    }

    this.buscandoCandidatos.set(true);
    this.calcStage.set('Buscando en catálogo Anexo 2…');

    this.cotizacionService.obtenerCandidatos(this.form).subscribe({
      next: res => {
        this.buscandoCandidatos.set(false);
        if (res.candidatos.length === 0) {
          // Sin candidatos — mostrar UI explicativa con opciones (captura manual / editar datos)
          this.candidatos.set(res);
        } else if (res.requiereSeleccion) {
          // Mostrar el picker para que el admin elija
          this.candidatos.set(res);
        } else {
          // Match dominante e inequívoco → calcular directo
          this.calcular();
        }
      },
      error: () => {
        this.buscandoCandidatos.set(false);
        // Si el endpoint de candidatos falla, intentamos calcular directamente
        this.calcular();
      },
    });
  }

  /** El admin eligió una entrada del catálogo — calcular con ese ID. */
  calcularConCandidato(candidato: CandidatoPrecio): void {
    this.manualMode.set(false);
    this.form.valorAduanaUsdOverride = null;
    this.form.precioEstimadoIdOverride = candidato.precioEstimadoId;
    this.candidatos.set(null);
    this.calcular();
  }

  /** El admin prefiere capturar el valor manualmente — abre el campo de override y le da foco. */
  abrirManual(): void {
    this.setManualMode(true);
  }

  calcular(): void {
    if (!this.canCalculate()) return;
    this.startCalcProgress();
    this.calcError.set('');
    this.resultado.set(null);
    this.cotizacionService.calcular(this.form).subscribe({
      next: r => {
        this.stopCalcProgress();
        this.resultado.set(r);
        // Limpiar el override de ID para que al recalcular no use el mismo candidato
        this.form.precioEstimadoIdOverride = null;
      },
      error: err => {
        this.stopCalcProgress();
        this.calcError.set(err?.error?.message || 'No se pudo calcular');
      },
    });
  }

  guardar(): void {
    if (!this.resultado()) return;
    this.saving.set(true);
    this.cotizacionService
      .crear({
        ...this.form,
        folio: null,
        clienteId: this.clienteId,
        notas: this.notas || null,
        fechaExpiracion: null,
      })
      .subscribe({
        next: r => this.router.navigate(['/cotizaciones', r.id]),
        error: () => this.saving.set(false),
      });
  }

  private startCalcProgress(): void {
    const stages = [
      'Consultando datos del VIN en NHTSA',
      'Buscando valor aduana en Anexo 2',
      'Aplicando tipo de cambio DOF',
      'Calculando IGI, DTA, IVA y honorarios',
    ];
    let index = 0;
    this.calculating.set(true);
    this.calcStage.set(stages[index]);
    if (this.calcTimer) window.clearInterval(this.calcTimer);
    this.calcTimer = window.setInterval(() => {
      index = Math.min(index + 1, stages.length - 1);
      this.calcStage.set(stages[index]);
    }, 900);
  }

  private stopCalcProgress(): void {
    if (this.calcTimer) {
      window.clearInterval(this.calcTimer);
      this.calcTimer = null;
    }
    this.calculating.set(false);
  }
}
