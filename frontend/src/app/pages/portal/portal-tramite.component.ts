import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { PortalService, PortalTramiteDto, PortalTimelineItemDto } from '../../services/portal.service';

@Component({
  selector: 'app-portal-tramite',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <main class="portal-shell">

      @if (loading()) {
        <section class="loading-state">
          <div class="loading-mark"></div>
          <p>Consultando el seguimiento de tu trámite...</p>
        </section>
      } @else if (error()) {
        <section class="error-state">
          <p class="eyebrow">R&R Importaciones</p>
          <h1>No encontramos este trámite</h1>
          <p>{{ error() }}</p>
          <a [href]="contactUrl()" class="primary-action">Contactar a R&R</a>
        </section>
      } @else if (tramite()) {
        @let t = tramite()!;

        <!-- HEADER SECTION: VEHICLE CARD & GENERAL STATS -->
        <section class="vehicle-card">
          <div class="vehicle-card-info">
            <div class="vehicle-card-header">
              <span class="folio-tag">Folio #{{ t.numeroConsecutivo }}</span>
              <span class="type-badge" [class]="t.tipoTramite || 'NORMAL'">
                {{ labelTipo(t.tipoTramite) }}
              </span>
            </div>
            
            <h1 class="vehicle-title">
              @if (t.vehiculoMarca || t.vehiculoModelo) {
                {{ t.vehiculoMarca }} <strong>{{ t.vehiculoModelo }}</strong>
              } @else {
                {{ t.vehiculoResumen }}
              }
            </h1>
            
            <div class="vehicle-specs-grid">
              @if (t.vehiculoAnno) {
                <div class="spec-item">
                  <span class="spec-label">Año</span>
                  <strong class="spec-val">{{ t.vehiculoAnno }}</strong>
                </div>
              }
              @if (t.vehiculoVin) {
                <div class="spec-item vin-item" (click)="copyVin(t.vehiculoVin)">
                  <span class="spec-label">NÚMERO DE SERIE (VIN)</span>
                  <div class="vin-copy-wrapper">
                    <strong class="spec-val monospace">{{ t.vehiculoVin }}</strong>
                    <button class="btn-copy-vin" [class.copied]="vinCopied()">
                      @if (vinCopied()) {
                        <svg class="icon-copied" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      } @else {
                        <svg class="icon-copy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                      }
                    </button>
                  </div>
                </div>
              } @else if (t.vehiculoVinCorto) {
                <div class="spec-item vin-item" (click)="copyVin(t.vehiculoVinCorto)">
                  <span class="spec-label">VIN</span>
                  <div class="vin-copy-wrapper">
                    <strong class="spec-val monospace">{{ t.vehiculoVinCorto }}</strong>
                    <button class="btn-copy-vin" [class.copied]="vinCopied()">
                      @if (vinCopied()) {
                        <svg class="icon-copied" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      } @else {
                        <svg class="icon-copy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                      }
                    </button>
                  </div>
                </div>
              }
              @if (t.aduanaNombre) {
                <div class="spec-item">
                  <span class="spec-label">Aduana de Cruce</span>
                  <strong class="spec-val">{{ t.aduanaNombre }}</strong>
                </div>
              }
            </div>
          </div>
          
          <div class="vehicle-card-photo-wrapper">
            @if (vehiclePhoto()) {
              <img [src]="vehiclePhoto()" alt="Foto del vehículo" class="vehicle-photo" (click)="openLightbox(vehiclePhoto()!, t.vehiculoResumen)">
            } @else {
              <div class="vehicle-photo-placeholder">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1-1.5 1zm11 0c-.83 0-1.5-.67-1.5-1s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1-1.5 1zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
                <span>Foto en yarda pendiente</span>
              </div>
            }
          </div>
        </section>

        <!-- STATUS TRACKER -->
        <section class="status-tracker-card">
          <div class="status-tracker-header">
            <div class="status-current">
              <span class="label">Estado Actual</span>
              <h3>{{ t.estatusCliente }}</h3>
            </div>
            <div class="status-percentage">
              <span class="pct">{{ t.progreso }}%</span>
              <span class="label">Progreso</span>
            </div>
          </div>
          <div class="status-progress-bar">
            <div class="status-progress-fill" [style.width.%]="t.progreso"></div>
          </div>
          <p class="status-description-text">{{ t.estatusDescripcion }}</p>
        </section>

        <!-- STICKY NAV -->
        <nav class="sticky-tabs">
          <button [class.active]="activeTab() === 'SEGUIMIENTO'" (click)="activeTab.set('SEGUIMIENTO')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            Seguimiento
          </button>
          <button [class.active]="activeTab() === 'PAGOS'" (click)="activeTab.set('PAGOS')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Pagos
          </button>
          <button [class.active]="activeTab() === 'DOCUMENTOS'" (click)="activeTab.set('DOCUMENTOS')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
            Docs y Fotos
          </button>
        </nav>

        <section class="content-container">
          <!-- TAB CONTENT: SEGUIMIENTO -->
          @if (activeTab() === 'SEGUIMIENTO') {
            <article class="tab-panel timeline-panel">
              <div class="panel-header">
                <h2>Historial de Seguimiento</h2>
                <p>Detalle paso a paso de tu importación en tiempo real</p>
              </div>

              <div class="modern-timeline">
                @for (item of visibleTimeline(); track item.id; let last = $last) {
                  <div class="timeline-node" [class.pending]="!item.completado" [class.last]="last">
                    <div class="node-indicator">
                      <div class="node-icon-circle" [class]="timelineIconClass(item)">
                        {{ iconText(item) }}
                      </div>
                      @if (!last) {
                        <div class="node-line"></div>
                      }
                    </div>
                    <div class="node-content-card">
                      <div class="node-header">
                        <h4 class="node-title">{{ item.titulo }}</h4>
                        <span class="node-time">{{ item.fecha | date:'dd MMM yyyy, HH:mm' }}</span>
                      </div>
                      <p class="node-desc">{{ item.descripcion }}</p>
                      
                      @if (item.fotoUrl) {
                        <div class="node-photo-preview" (click)="openLightbox(fileUrl(item.fotoUrl), item.titulo)">
                          <img [src]="fileUrl(item.fotoUrl)" alt="Foto del evento">
                          <div class="photo-overlay">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path></svg>
                            <span>Expandir imagen</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              @if (t.timeline.length > 3) {
                <button class="expand-timeline-btn" (click)="timelineExpanded.set(!timelineExpanded())">
                  {{ timelineExpanded() ? 'Ocultar historial anterior' : 'Ver historial completo (' + t.timeline.length + ' pasos)' }}
                </button>
              }
            </article>
          }

          <!-- TAB CONTENT: PAGOS -->
          @if (activeTab() === 'PAGOS') {
            <article class="tab-panel payment-panel">
              <div class="panel-header">
                <h2>Resumen Financiero</h2>
                <p>Monitorea tu saldo y los pagos realizados</p>
              </div>

              <div class="financial-card-hero">
                <div class="financial-info">
                  <span class="label">Saldo Pendiente</span>
                  <h3 class="amount-pending">{{ t.pagosResumen.pendiente | currency:'MXN':'symbol':'1.2-2' }}</h3>
                </div>
                <div class="financial-progress-box">
                  <div class="meter-text">
                    <span>Cubierto: {{ paidPercent() }}%</span>
                  </div>
                  <div class="financial-meter">
                    <div class="financial-fill" [style.width.%]="paidPercent()"></div>
                  </div>
                </div>
              </div>

              <div class="financial-stats-grid">
                <div class="stat-card">
                  <span class="label">Costo Total Trámite</span>
                  <strong>{{ t.pagosResumen.total | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="stat-card paid">
                  <span class="label">Total Pagado</span>
                  <strong>{{ t.pagosResumen.pagado | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
              </div>

              @if (t.pagosResumen.pendienteVerificacion > 0) {
                <div class="alert-notice warning">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>Hay <strong>{{ t.pagosResumen.pendienteVerificacion | currency:'MXN':'symbol':'1.2-2' }}</strong> en proceso de validación.</span>
                </div>
              }
              @if (t.pagosResumen.cubiertoPorRr > 0) {
                <div class="alert-notice info">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>R&R cubrió un saldo de <strong>{{ t.pagosResumen.cubiertoPorRr | currency:'MXN':'symbol':'1.2-2' }}</strong> para agilizar tu cruce.</span>
                </div>
              }

              <div class="payments-log">
                <h3>Desglose de Transacciones</h3>
                @if (t.pagos.length === 0) {
                  <p class="empty-copy">Aún no se registran transacciones en el sistema.</p>
                } @else {
                  <div class="payments-grid-list">
                    @for (p of t.pagos; track p.id) {
                      <div class="payment-item-card">
                        <div class="payment-icon-badge" [class.verified]="p.verificado">
                          @if (p.verificado) {
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          } @else {
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          }
                        </div>
                        <div class="payment-details">
                          <div class="payment-primary">
                            <span class="payment-method">{{ p.metodo }}{{ p.banco ? ' • ' + p.banco : '' }}</span>
                            <span class="payment-date">{{ p.fechaPago | date:'dd MMM yyyy' }}</span>
                          </div>
                          @if (p.referencia) {
                            <span class="payment-ref">Ref: {{ p.referencia }}</span>
                          }
                        </div>
                        <div class="payment-amount-status">
                          <strong class="amount">{{ p.monto | currency:p.moneda:'symbol':'1.2-2' }}</strong>
                          <span class="status-label-badge" [class.verified]="p.verificado">
                            {{ p.verificado ? 'Verificado' : 'Por Validar' }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </article>
          }

          <!-- TAB CONTENT: DOCUMENTOS Y FOTOS -->
          @if (activeTab() === 'DOCUMENTOS') {
            <article class="tab-panel documents-photos-panel">
              <!-- Official Delivery Receipt Section (Featured) -->
              @if (t.entrega) {
                <div class="official-delivery-card">
                  <div class="delivery-badge-ribbon">
                    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.177-7.86l-2.765-2.767L7 12.431l3.823 3.824 7.653-7.568-1.06-1.06-6.593 6.513z"/></svg>
                    <span>Acuse de Entrega Confirmado</span>
                  </div>
                  
                  <div class="delivery-card-content">
                    <div class="delivery-meta-grid">
                      <div class="meta-item">
                        <span class="label">Entregado a</span>
                        <strong>{{ t.entrega.nombreRecibe }}</strong>
                      </div>
                      <div class="meta-item">
                        <span class="label">Fecha y Hora</span>
                        <strong>{{ t.entrega.fecha | date:'dd MMMM yyyy, HH:mm' }}</strong>
                      </div>
                      <div class="meta-item full-width">
                        <span class="label">Lugar de Entrega</span>
                        <strong>{{ t.entrega.ubicacion }}</strong>
                      </div>
                    </div>
                    
                    <div class="delivery-docs-box">
                      <span class="label">Documentos validados físicamente</span>
                      <div class="delivery-docs-tags">
                        @for (doc of t.entrega.documentosEntregados; track doc) {
                          <span class="doc-tag">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            {{ doc }}
                          </span>
                        }
                      </div>
                    </div>
                    
                    @if (t.entrega.fotoEvidenciaUrl) {
                      <div class="delivery-evidence-container">
                        <span class="label">Evidencia de Entrega</span>
                        <div class="evidence-image-card" (click)="openLightbox(fileUrl(t.entrega.fotoEvidenciaUrl), 'Evidencia de Entrega')">
                          <img [src]="fileUrl(t.entrega.fotoEvidenciaUrl)" alt="Evidencia de entrega">
                          <div class="image-overlay">
                            <span>Ver firma y foto de entrega</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- PHOTOS GALLERY: FOTOS TOMADAS DE LA UNIDAD -->
              <div class="gallery-wrapper-box">
                <div class="panel-subheader">
                  <h3>Fotos de la Unidad</h3>
                  <p>Registro fotográfico tomado durante el proceso en yarda y aduana</p>
                </div>
                
                @if (allVehiclePhotos().length === 0) {
                  <div class="empty-gallery-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <p>Las fotos de tu unidad se mostrarán aquí conforme avance el trámite.</p>
                  </div>
                } @else {
                  <div class="photos-grid-layout">
                    @for (photo of allVehiclePhotos(); track photo.url) {
                      <div class="photo-card-item" (click)="openLightbox(photo.url, photo.title)">
                        <div class="image-holder">
                          <img [src]="photo.url" [alt]="photo.title" loading="lazy">
                        </div>
                        <div class="info-footer">
                          <strong>{{ photo.title }}</strong>
                          <span>{{ photo.date | date:'dd MMM, yyyy' }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- DOCUMENTS SECTION -->
              <div class="documents-wrapper-box">
                <div class="panel-subheader">
                  <h3>Archivos y Pedimentos</h3>
                  <p>Documentación digital oficial ligada a tu importación</p>
                </div>

                @if (t.documentos.length === 0) {
                  <p class="empty-copy">No hay documentos cargados en el expediente aún.</p>
                } @else {
                  <div class="documents-cards-grid">
                    @for (doc of t.documentos; track doc.titulo) {
                      <div class="document-card-file" [class.pending]="!doc.url">
                        <div class="file-icon" [class]="doc.tipo">
                          @if (doc.tipo === 'PEDIMENTO') {
                            <span>PD</span>
                          } @else if (doc.tipo === 'COMPROBANTE') {
                            <span>$</span>
                          } @else {
                            <span>PDF</span>
                          }
                        </div>
                        
                        <div class="file-details">
                          <h4>{{ doc.titulo }}</h4>
                          <span>
                            @if (doc.fecha) {
                              Actualizado el {{ doc.fecha | date:'dd/MM/yyyy' }}
                            } @else {
                              Requisito Pendiente
                            }
                          </span>
                        </div>
                        
                        <div class="file-action">
                          @if (doc.url) {
                            <a [href]="fileUrl(doc.url)" target="_blank" rel="noopener" class="btn-download-file">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                              Descargar
                            </a>
                          } @else {
                            <span class="badge-pending">Falta Entregar</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </article>
          }

          <!-- CONTACT COMPONENT -->
          <article class="tab-panel contact-panel-simple">
            <div class="contact-card-inner">
              <div class="contact-copy">
                <span>¿Tienes dudas sobre los pagos o estatus?</span>
                <h3>Atención al Cliente R&R</h3>
                <p>Estamos disponibles para ayudarte de manera directa.</p>
              </div>
              <div class="contact-actions">
                <a [href]="contactUrl()" target="_blank" rel="noopener" class="btn-whatsapp">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 2.012 14.077.99 11.45.989c-5.44.001-9.866 4.372-9.87 9.802 0 1.714.452 3.39 1.31 4.877L1.87 21.03l5.093-1.332c.18-.09.36-.18.68-.26-.18.17 0 0 0 0z"/></svg>
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          </article>
        </section>

        <!-- LIGHTBOX MODAL -->
        @if (activeLightboxImg()) {
          <div class="lightbox-overlay" (click)="closeLightbox()">
            <button class="btn-close-lightbox" (click)="closeLightbox()">&times;</button>
            <div class="lightbox-content" (click)="$event.stopPropagation()">
              <img [src]="activeLightboxImg()" alt="Ampliación de imagen">
              @if (activeLightboxTitle()) {
                <span class="lightbox-caption">{{ activeLightboxTitle() }}</span>
              }
            </div>
          </div>
        }
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      font-family: var(--font-body), system-ui, sans-serif;
    }

    .portal-shell {
      width: min(900px, 100%);
      max-width: 100vw;
      margin: 0 auto;
      padding: 16px 16px 60px;
      box-sizing: border-box;
    }

    .portal-shell * {
      box-sizing: border-box;
    }

    .security-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 0 auto 20px;
      color: #0f766e;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: #ccfbf1;
      padding: 8px 16px;
      border-radius: 99px;
      border: 1px solid #99f6e4;
      width: fit-content;
    }

    .security-badge svg {
      width: 14px;
      height: 14px;
    }

    /* ── VEHICLE CARD ── */
    .vehicle-card {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
    }

    .vehicle-card-info {
      flex: 1;
      min-width: 0;
    }

    .vehicle-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .folio-tag {
      font-family: var(--font-mono), monospace;
      font-size: 12px;
      font-weight: 700;
      color: #c61d26;
      background: rgba(198, 29, 38, 0.08);
      padding: 4px 10px;
      border-radius: 8px;
    }

    .type-badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px;
      border-radius: 8px;
    }
    
    .type-badge.NORMAL {
      background: #f1f5f9;
      color: #475569;
    }
    .type-badge.EXPRESS {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .type-badge.ASESORIA_LOGISTICA {
      background: #e0f2fe;
      color: #0369a1;
    }

    .vehicle-title {
      margin: 0 0 16px;
      font-size: clamp(22px, 4vw, 32px);
      font-weight: 400;
      color: #0f172a;
      line-height: 1.2;
    }

    .vehicle-title strong {
      font-weight: 800;
    }

    .vehicle-specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 16px;
    }

    .spec-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .spec-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
    }

    .spec-val {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .spec-val.monospace {
      font-family: var(--font-mono), monospace;
      font-size: 13px;
      letter-spacing: -0.02em;
    }

    .vin-item {
      grid-column: span 2;
      cursor: pointer;
    }

    .vin-copy-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      width: fit-content;
      max-width: 100%;
      transition: background 0.2s, border-color 0.2s;
    }

    .vin-copy-wrapper:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .btn-copy-vin {
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .btn-copy-vin svg {
      width: 16px;
      height: 16px;
    }

    .btn-copy-vin.copied {
      color: #10b981;
    }

    .vehicle-card-photo-wrapper {
      width: 160px;
      height: 110px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      border: 2px solid white;
      flex-shrink: 0;
      background: #f1f5f9;
      cursor: pointer;
      position: relative;
    }

    .vehicle-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .vehicle-card-photo-wrapper:hover .vehicle-photo {
      transform: scale(1.05);
    }

    .vehicle-photo-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      padding: 12px;
      text-align: center;
    }

    .vehicle-photo-placeholder svg {
      width: 32px;
      height: 32px;
      margin-bottom: 4px;
      opacity: 0.6;
    }

    .vehicle-photo-placeholder span {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── STATUS TRACKER CARD ── */
    .status-tracker-card {
      background: white;
      border-radius: 24px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
      margin-bottom: 24px;
    }

    .status-tracker-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 12px;
    }

    .status-current .label, .status-percentage .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
    }

    .status-current h3 {
      margin: 4px 0 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }

    .status-percentage {
      text-align: right;
    }

    .status-percentage .pct {
      display: block;
      font-family: var(--font-mono), monospace;
      font-size: 24px;
      font-weight: 800;
      color: #c61d26;
      line-height: 1;
    }

    .status-progress-bar {
      height: 8px;
      background: #f1f5f9;
      border-radius: 99px;
      overflow: hidden;
      margin-bottom: 14px;
    }

    .status-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #c61d26, #ef4444);
      transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .status-description-text {
      margin: 0;
      font-size: 14px;
      color: #475569;
      line-height: 1.5;
    }

    /* ── STICKY TABS ── */
    .sticky-tabs {
      position: sticky;
      top: 12px;
      z-index: 40;
      display: flex;
      gap: 6px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding: 6px;
      border-radius: 99px;
      border: 1px solid rgba(15, 23, 42, 0.06);
      box-shadow: 0 10px 35px rgba(15, 23, 42, 0.05);
      margin-bottom: 24px;
    }

    .sticky-tabs button {
      flex: 1;
      background: transparent;
      border: none;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      border-radius: 99px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .sticky-tabs button svg {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .sticky-tabs button.active {
      background: #0f172a;
      color: white;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }

    .sticky-tabs button.active svg {
      opacity: 1;
      color: #ef4444;
    }

    /* ── TAB CONTENT CONTAINERS ── */
    .content-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .tab-panel {
      background: white;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
    }

    .panel-header {
      margin-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 16px;
    }

    .panel-header h2 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }

    .panel-header p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .panel-subheader {
      margin-bottom: 16px;
    }

    .panel-subheader h3 {
      margin: 0 0 2px;
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
    }

    .panel-subheader p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }

    /* ── TIMELINE TAB ── */
    .modern-timeline {
      position: relative;
      padding-left: 8px;
    }

    .timeline-node {
      display: flex;
      gap: 20px;
      position: relative;
      padding-bottom: 28px;
    }

    .timeline-node.last {
      padding-bottom: 0;
    }

    .node-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .node-icon-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #c61d26;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono), monospace;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 0 0 4px rgba(198, 29, 38, 0.1);
      z-index: 2;
    }

    .node-icon-circle.pending {
      background: #f1f5f9;
      color: #64748b;
      border: 1.5px dashed #cbd5e1;
      box-shadow: none;
    }

    .node-line {
      width: 2px;
      flex-grow: 1;
      background: #e2e8f0;
      margin-top: 4px;
      margin-bottom: -4px;
    }

    .node-content-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      flex-grow: 1;
      min-width: 0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.01);
      transition: border-color 0.2s;
    }

    .timeline-node:not(.pending):hover .node-content-card {
      border-color: #cbd5e1;
    }

    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }

    .node-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .node-time {
      font-family: var(--font-mono), monospace;
      font-size: 11px;
      color: #64748b;
    }

    .node-desc {
      margin: 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.45;
    }

    .node-photo-preview {
      margin-top: 12px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      aspect-ratio: 16/9;
      max-width: 280px;
      position: relative;
      cursor: pointer;
      background: #e2e8f0;
    }

    .node-photo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .node-photo-preview:hover img {
      transform: scale(1.03);
    }

    .photo-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .node-photo-preview:hover .photo-overlay {
      opacity: 1;
    }

    .photo-overlay svg {
      width: 16px;
      height: 16px;
    }

    .expand-timeline-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 20px;
      background: #f1f5f9;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      text-align: center;
    }

    .expand-timeline-btn:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }

    /* ── PAYMENTS TAB ── */
    .financial-card-hero {
      background: linear-gradient(135deg, #fff5f5 0%, #fff1f2 100%);
      border: 1px solid #ffe4e6;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .financial-info .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #9f1239;
      letter-spacing: 0.05em;
    }

    .amount-pending {
      margin: 4px 0 0;
      font-size: clamp(24px, 5vw, 36px);
      font-weight: 900;
      color: #9f1239;
      line-height: 1;
    }

    .financial-progress-box {
      flex: 1;
      max-width: 280px;
      min-width: 200px;
    }

    .meter-text {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 6px;
    }

    .financial-meter {
      height: 8px;
      background: #f1f5f9;
      border-radius: 99px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .financial-fill {
      height: 100%;
      border-radius: inherit;
      background: #10b981;
    }

    .financial-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      border-radius: 16px;
    }

    .stat-card .label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
    }

    .stat-card strong {
      display: block;
      margin-top: 4px;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    .stat-card.paid strong {
      color: #10b981;
    }

    .alert-notice {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      margin-bottom: 12px;
    }

    .alert-notice svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .alert-notice.warning {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .alert-notice.info {
      background: #e0f2fe;
      color: #075985;
      border: 1px solid #bae6fd;
    }

    .payments-log {
      margin-top: 24px;
    }

    .payments-log h3 {
      margin: 0 0 14px;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }

    .payments-grid-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .payment-item-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
    }

    .payment-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #fee2e2;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .payment-icon-badge svg {
      width: 18px;
      height: 18px;
    }

    .payment-icon-badge.verified {
      background: #d1fae5;
      color: #10b981;
    }

    .payment-details {
      flex: 1;
      min-width: 0;
    }

    .payment-primary {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;
      flex-wrap: wrap;
    }

    .payment-method {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    .payment-date {
      font-size: 11px;
      color: #64748b;
    }

    .payment-ref {
      display: block;
      font-size: 11px;
      color: #64748b;
      font-family: var(--font-mono), monospace;
    }

    .payment-amount-status {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .payment-amount-status .amount {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }

    .status-label-badge {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #64748b;
    }

    .status-label-badge.verified {
      background: #d1fae5;
      color: #065f46;
    }

    /* ── DOCUMENTS & PHOTOS TAB ── */
    .documents-photos-panel {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .official-delivery-card {
      border: 1px solid #a7f3d0;
      border-radius: 20px;
      background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.03);
      overflow: hidden;
    }

    .delivery-badge-ribbon {
      background: #10b981;
      color: white;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .delivery-badge-ribbon svg {
      width: 14px;
      height: 14px;
    }

    .delivery-card-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .delivery-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .delivery-meta-grid .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .delivery-meta-grid .meta-item.full-width {
      grid-column: 1 / -1;
    }

    .delivery-meta-grid .label, .delivery-docs-box .label, .delivery-evidence-container .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #047857;
      letter-spacing: 0.05em;
    }

    .delivery-meta-grid strong {
      font-size: 14px;
      color: #065f46;
    }

    .delivery-docs-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .doc-tag {
      background: white;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #065f46;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .doc-tag svg {
      width: 12px;
      height: 12px;
      color: #10b981;
    }

    .evidence-image-card {
      margin-top: 6px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #a7f3d0;
      aspect-ratio: 16/9;
      max-width: 320px;
      position: relative;
      cursor: pointer;
    }

    .evidence-image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .evidence-image-card .image-overlay {
      position: absolute;
      inset: 0;
      background: rgba(4, 120, 87, 0.4);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .evidence-image-card:hover .image-overlay {
      opacity: 1;
    }

    /* Photos Grid */
    .empty-gallery-state {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
      padding: 32px 16px;
      text-align: center;
      color: #64748b;
    }

    .empty-gallery-state svg {
      width: 40px;
      height: 40px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .empty-gallery-state p {
      margin: 0;
      font-size: 13px;
    }

    .photos-grid-layout {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 12px;
    }

    .photo-card-item {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      display: flex;
      flex-direction: column;
    }

    .photo-card-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      border-color: #cbd5e1;
    }

    .photo-card-item .image-holder {
      aspect-ratio: 3/2;
      background: #f1f5f9;
      overflow: hidden;
    }

    .photo-card-item .image-holder img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .photo-card-item:hover .image-holder img {
      transform: scale(1.04);
    }

    .photo-card-item .info-footer {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .photo-card-item .info-footer strong {
      font-size: 11px;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .photo-card-item .info-footer span {
      font-size: 9px;
      color: #64748b;
      font-family: var(--font-mono), monospace;
    }

    /* Documents Folder Cards Grid */
    .documents-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }

    .document-card-file {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .document-card-file:not(.pending):hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
    }

    .document-card-file.pending {
      background: #f8fafc;
      border-style: dashed;
    }

    .file-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 10px;
      flex-shrink: 0;
    }

    .file-icon.PEDIMENTO {
      background: #eff6ff;
      color: #2563eb;
    }

    .file-icon.COMPROBANTE {
      background: #ecfdf5;
      color: #059669;
    }

    .file-details {
      flex: 1;
      min-width: 0;
    }

    .file-details h4 {
      margin: 0 0 2px;
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-details span {
      font-size: 10px;
      color: #64748b;
    }

    .btn-download-file {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      border: none;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-decoration: none;
      transition: background 0.2s, color 0.2s;
    }

    .btn-download-file:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-download-file svg {
      width: 12px;
      height: 12px;
    }

    .badge-pending {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: 6px;
      background: #fee2e2;
      color: #9f1239;
    }

    /* ── SIMPLE CONTACT INNER ── */
    .contact-panel-simple {
      background: #0f172a;
      color: white;
      border-radius: 24px;
      padding: 24px;
    }

    .contact-card-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .contact-copy span {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .contact-copy h3 {
      margin: 4px 0 2px;
      font-size: 18px;
      font-weight: 800;
    }

    .contact-copy p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }

    .btn-whatsapp {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #25d366;
      color: white;
      text-decoration: none;
      padding: 10px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      transition: background 0.2s, transform 0.2s;
      box-shadow: 0 4px 14px rgba(37, 211, 102, 0.2);
    }

    .btn-whatsapp:hover {
      background: #20ba59;
      transform: translateY(-1px);
    }

    .btn-whatsapp svg {
      width: 16px;
      height: 16px;
    }

    /* ── LIGHTBOX OVERLAY ── */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      cursor: zoom-out;
    }

    .btn-close-lightbox {
      position: absolute;
      top: 24px;
      right: 24px;
      background: transparent;
      border: none;
      color: white;
      font-size: 36px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .btn-close-lightbox:hover {
      opacity: 1;
    }

    .lightbox-content {
      position: relative;
      max-width: min(800px, 100%);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: default;
    }

    .lightbox-content img {
      max-width: 100%;
      max-height: 75vh;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }

    .lightbox-caption {
      margin-top: 12px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
    }

    /* ── RESPONSIVE MEDIA QUERIES ── */
    @media (max-width: 767px) {
      .vehicle-card {
        flex-direction: column-reverse;
        align-items: stretch;
        padding: 20px;
        gap: 16px;
      }

      .vehicle-card-photo-wrapper {
        width: 100%;
        height: 160px;
      }

      .vin-item {
        grid-column: span 1;
      }

      .financial-card-hero {
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
      }

      .financial-progress-box {
        max-width: 100%;
      }

      .contact-card-inner {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-whatsapp {
        justify-content: center;
      }

      .node-header {
        flex-direction: column;
        gap: 2px;
      }
    }
  `],
})
export class PortalTramiteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private portalService = inject(PortalService);

  tramite = signal<PortalTramiteDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  activeTab = signal<'SEGUIMIENTO' | 'PAGOS' | 'DOCUMENTOS'>('SEGUIMIENTO');
  timelineExpanded = signal(false);

  // Lightbox & Copy signals
  activeLightboxImg = signal<string | null>(null);
  activeLightboxTitle = signal<string | null>(null);
  vinCopied = signal(false);

  vehiclePhoto = computed(() => {
    const t = this.tramite();
    if (!t) return null;
    const photoItem = t.timeline.find(item => !!item.fotoUrl);
    return photoItem?.fotoUrl ? this.fileUrl(photoItem.fotoUrl) : null;
  });

  copyVin(vin: string): void {
    navigator.clipboard.writeText(vin).then(() => {
      this.vinCopied.set(true);
      setTimeout(() => this.vinCopied.set(false), 2000);
    });
  }

  openLightbox(imgUrl: string, title: string | null = null): void {
    this.activeLightboxImg.set(imgUrl);
    this.activeLightboxTitle.set(title);
  }

  closeLightbox(): void {
    this.activeLightboxImg.set(null);
    this.activeLightboxTitle.set(null);
  }

  allVehiclePhotos = computed(() => {
    const t = this.tramite();
    if (!t) return [];
    const photos: { url: string; title: string; date: string }[] = [];
    const seen = new Set<string>();

    t.timeline.forEach(item => {
      if (item.fotoUrl && !seen.has(item.fotoUrl)) {
        seen.add(item.fotoUrl);
        photos.push({
          url: this.fileUrl(item.fotoUrl),
          title: item.titulo,
          date: item.fecha
        });
      }
    });

    if (t.entrega?.fotoEvidenciaUrl && !seen.has(t.entrega.fotoEvidenciaUrl)) {
      seen.add(t.entrega.fotoEvidenciaUrl);
      photos.push({
        url: this.fileUrl(t.entrega.fotoEvidenciaUrl),
        title: 'Evidencia de entrega',
        date: t.entrega.fecha
      });
    }
    return photos;
  });

  visibleTimeline = computed(() => {
    const t = this.tramite();
    if (!t) return [];
    if (this.timelineExpanded() || t.timeline.length <= 3) return t.timeline;
    return t.timeline.slice(t.timeline.length - 3);
  });

  paidPercent = computed(() => {
    const resumen = this.tramite()?.pagosResumen;
    if (!resumen || resumen.total <= 0) return 0;
    return Math.min(100, Math.round((resumen.pagado / resumen.total) * 100));
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('El enlace no incluye un identificador válido.');
      return;
    }

    this.portalService.getTramite(token).subscribe({
      next: data => {
        this.tramite.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Revisa el enlace o contacta a R&R para confirmar tu seguimiento.');
        this.loading.set(false);
      },
    });
  }

  labelTipo(value: string | null): string {
    const labels: Record<string, string> = {
      NORMAL: 'Normal',
      EXPRESS: 'Express',
      ASESORIA_LOGISTICA: 'Asesoría logística',
    };
    return value ? labels[value] ?? value : 'Normal';
  }

  timelineIconClass(item: PortalTimelineItemDto): string {
    return item.completado ? 'timeline-dot' : 'timeline-dot pending';
  }

  iconText(item: PortalTimelineItemDto): string {
    const icons: Record<string, string> = {
      CREACION: 'IN',
      CAMBIO_ESTADO: 'OK',
      PEDIMENTO: 'PD',
      ENTREGA: 'EN',
      PAGO: '$',
      SIGUIENTE: '...',
    };
    return icons[item.tipo] ?? 'OK';
  }

  documentIcon(tipo: string): string {
    return tipo === 'COMPROBANTE' ? '$' : 'PDF';
  }

  fileUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `http://localhost:5198${url}`;
  }

  contactUrl(): string {
    const t = this.tramite();
    const phone = t?.contacto.whatsApp ?? '528677221596';
    const folio = t?.numeroConsecutivo ?? '';
    const message = encodeURIComponent(`Hola R&R, quiero consultar mi trámite ${folio}.`);
    return `https://wa.me/${phone}?text=${message}`;
  }
}
