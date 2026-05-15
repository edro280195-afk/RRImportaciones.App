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

        <section class="hero">
          <div class="hero-topline">
            <span>R&R Importaciones</span>
            <span class="folio">{{ t.numeroConsecutivo }}</span>
          </div>

          <div class="hero-copy">
            <p class="welcome">Hola, {{ t.clienteNombre }}</p>
            <h1>{{ t.vehiculoResumen }}</h1>
            <p class="status-copy">{{ t.estatusDescripcion }}</p>
          </div>

          <div class="status-band">
            <div>
              <span class="status-label">Estado actual</span>
              <strong>{{ t.estatusCliente }}</strong>
            </div>
            <div class="progress-box">
              <span>{{ t.progreso }}%</span>
              <div class="progress-track">
                <div [style.width.%]="t.progreso"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="quick-facts">
          <div>
            <span>VIN corto</span>
            <strong>{{ t.vehiculoVinCorto || 'Pendiente' }}</strong>
          </div>
          <div>
            <span>Aduana</span>
            <strong>{{ t.aduanaNombre || 'Por confirmar' }}</strong>
          </div>
          <div>
            <span>Tipo</span>
            <strong>{{ labelTipo(t.tipoTramite) }}</strong>
          </div>
        </section>

        <section class="content-grid">
          <article class="timeline-panel">
            <div class="section-heading">
              <p>Seguimiento</p>
              <h2>Línea de tiempo</h2>
            </div>

            <div class="timeline">
              @for (item of t.timeline; track item.id; let last = $last) {
                <div class="timeline-item" [class.pending]="!item.completado" [class.last]="last">
                  <div class="timeline-rail">
                    <span [class]="timelineIconClass(item)">{{ iconText(item) }}</span>
                  </div>
                  <div class="timeline-body">
                    <div class="timeline-meta">
                      <strong>{{ item.titulo }}</strong>
                      <span>{{ item.fecha | date:'dd MMM, HH:mm' }}</span>
                    </div>
                    <p>{{ item.descripcion }}</p>
                    @if (item.fotoUrl) {
                      <a class="photo-link" [href]="fileUrl(item.fotoUrl)" target="_blank" rel="noopener">Ver foto</a>
                    }
                  </div>
                </div>
              }
            </div>
          </article>

          <aside class="side-stack">
            <article class="payment-panel">
              <div class="section-heading compact">
                <p>Pagos</p>
                <h2>Resumen financiero</h2>
              </div>

              <div class="money-hero">
                <span>Saldo pendiente</span>
                <strong>{{ t.pagosResumen.pendiente | currency:'MXN':'symbol':'1.2-2' }}</strong>
              </div>

              <div class="money-meter">
                <div [style.width.%]="paidPercent()"></div>
              </div>

              <div class="money-grid">
                <div>
                  <span>Total</span>
                  <strong>{{ t.pagosResumen.total | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
                <div>
                  <span>Pagado</span>
                  <strong>{{ t.pagosResumen.pagado | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
              </div>

              @if (t.pagosResumen.pendienteVerificacion > 0) {
                <div class="notice">
                  Hay {{ t.pagosResumen.pendienteVerificacion | currency:'MXN':'symbol':'1.2-2' }} en revisión.
                </div>
              }
              @if (t.pagosResumen.cubiertoPorRr > 0) {
                <div class="notice">
                  R&R cubrió {{ t.pagosResumen.cubiertoPorRr | currency:'MXN':'symbol':'1.2-2' }} para avanzar el trámite.
                </div>
              }

              <div class="payment-list">
                @if (t.pagos.length === 0) {
                  <p class="empty-copy">Aún no hay pagos registrados.</p>
                }
                @for (p of t.pagos; track p.id) {
                  <div class="payment-row">
                    <div>
                      <strong>{{ p.monto | currency:p.moneda:'symbol':'1.2-2' }}</strong>
                      <span>{{ p.metodo }}{{ p.banco ? ' · ' + p.banco : '' }}</span>
                    </div>
                    <div class="payment-status">
                      <span [class.verified]="p.verificado">{{ p.verificado ? 'Verificado' : 'En revisión' }}</span>
                      <small>{{ p.fechaPago | date:'dd/MM/yyyy' }}</small>
                    </div>
                  </div>
                }
              </div>
            </article>

            <article class="documents-panel">
              <div class="section-heading compact">
                <p>Documentos</p>
                <h2>Archivos y referencias</h2>
              </div>
              @if (t.documentos.length === 0) {
                <p class="empty-copy">Cuando haya documentos disponibles aparecerán aquí.</p>
              }
              @for (doc of t.documentos; track doc.titulo) {
                @if (doc.url) {
                  <a class="document-row" [href]="fileUrl(doc.url)" target="_blank" rel="noopener">
                    <span>{{ documentIcon(doc.tipo) }}</span>
                    <strong>{{ doc.titulo }}</strong>
                  </a>
                } @else {
                  <div class="document-row">
                    <span>{{ documentIcon(doc.tipo) }}</span>
                    <strong>{{ doc.titulo }}</strong>
                  </div>
                }
              }
            </article>

            <article class="contact-panel">
              <span>¿Necesitas ayuda?</span>
              <strong>{{ t.contacto.telefono }}</strong>
              <a [href]="contactUrl()" target="_blank" rel="noopener">Enviar WhatsApp</a>
            </article>
          </aside>
        </section>
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      overflow-x: hidden;
      background:
        radial-gradient(circle at 12% 0%, rgba(198, 29, 38, 0.13), transparent 28rem),
        linear-gradient(180deg, #f7f3ef 0%, #f4f6f8 42%, #eef1f4 100%);
      color: #181b22;
      font-family: var(--font-body);
    }

    .portal-shell {
      width: min(1180px, 100%);
      max-width: 100vw;
      margin: 0 auto;
      padding: 18px 14px 40px;
      overflow-x: hidden;
    }

    .portal-shell,
    .portal-shell * {
      box-sizing: border-box;
    }

    .hero {
      position: relative;
      overflow: hidden;
      max-width: 100%;
      border-radius: 30px;
      background:
        linear-gradient(135deg, rgba(22, 25, 32, 0.96), rgba(67, 27, 29, 0.94)),
        linear-gradient(90deg, rgba(198, 29, 38, 0.28), transparent);
      color: #fffaf4;
      padding: 18px;
      box-shadow: 0 24px 70px rgba(24, 27, 34, 0.22);
    }

    .hero::after {
      content: '';
      position: absolute;
      inset: auto -30px -84px 26%;
      height: 170px;
      border-radius: 999px;
      background: rgba(232, 35, 45, 0.32);
      filter: blur(42px);
      pointer-events: none;
    }

    .hero-topline,
    .status-band,
    .quick-facts,
    .content-grid,
    .timeline-body,
    .payment-panel,
    .documents-panel,
    .contact-panel {
      position: relative;
      z-index: 1;
    }

    .hero-topline {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      font-size: 12px;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 250, 244, 0.72);
    }

    .folio {
      font-family: var(--font-mono);
      color: #fffaf4;
    }

    .hero-copy {
      padding: 40px 0 28px;
      max-width: 760px;
    }

    .welcome {
      margin: 0 0 8px;
      color: #ffc8c8;
      font-size: 14px;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      font-size: clamp(34px, 10vw, 82px);
      line-height: 0.95;
      letter-spacing: 0;
      max-width: 10ch;
      overflow-wrap: anywhere;
    }

    .status-copy {
      max-width: 58ch;
      margin: 18px 0 0;
      color: rgba(255, 250, 244, 0.78);
      font-size: 15px;
      overflow-wrap: anywhere;
    }

    .status-band {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      min-width: 0;
      padding: 16px;
      border: 1px solid rgba(255, 250, 244, 0.14);
      border-radius: 22px;
      background: rgba(255, 250, 244, 0.08);
    }

    .status-label,
    .quick-facts span,
    .section-heading p,
    .money-hero span,
    .money-grid span,
    .contact-panel span {
      display: block;
      color: #6f7580;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .status-band .status-label {
      color: rgba(255, 250, 244, 0.58);
    }

    .status-band strong {
      display: block;
      margin-top: 4px;
      font-size: 22px;
      letter-spacing: 0;
    }

    .progress-box span {
      display: block;
      margin-bottom: 8px;
      color: #fffaf4;
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
      text-align: right;
    }

    .progress-box,
    .status-band > div,
    .quick-facts div,
    .timeline-body,
    .payment-panel,
    .documents-panel,
    .contact-panel {
      min-width: 0;
    }

    .progress-track,
    .money-meter {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 250, 244, 0.16);
    }

    .progress-track div {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #ff8a8a, #f6c56f);
    }

    .quick-facts {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin: 14px 0;
    }

    .quick-facts div {
      border: 1px solid rgba(24, 27, 34, 0.08);
      border-radius: 20px;
      background: rgba(255, 252, 248, 0.82);
      padding: 15px;
      box-shadow: 0 8px 24px rgba(24, 27, 34, 0.06);
    }

    .quick-facts strong {
      display: block;
      margin-top: 5px;
      font-size: 16px;
      color: #191c23;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      align-items: start;
    }

    .timeline-panel,
    .payment-panel,
    .documents-panel,
    .contact-panel {
      border: 1px solid rgba(24, 27, 34, 0.08);
      border-radius: 26px;
      background: rgba(255, 252, 248, 0.9);
      box-shadow: 0 16px 44px rgba(24, 27, 34, 0.08);
    }

    .timeline-panel {
      padding: 20px 16px 6px;
    }

    .section-heading {
      margin-bottom: 20px;
    }

    .section-heading.compact {
      margin-bottom: 16px;
    }

    .section-heading p {
      margin: 0 0 4px;
    }

    .section-heading h2 {
      margin: 0;
      color: #171a21;
      font-size: 24px;
      line-height: 1.1;
      letter-spacing: 0;
    }

    .timeline {
      padding: 2px 0 8px;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: 42px 1fr;
      min-height: 98px;
    }

    .timeline-rail {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .timeline-rail::after {
      content: '';
      position: absolute;
      top: 34px;
      bottom: 0;
      width: 2px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(198, 29, 38, 0.42), rgba(24, 27, 34, 0.08));
    }

    .timeline-item.last .timeline-rail::after {
      display: none;
    }

    .timeline-dot {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #c61d26;
      color: #fffaf4;
      font-size: 12px;
      font-weight: 900;
      box-shadow: 0 9px 22px rgba(198, 29, 38, 0.28);
      z-index: 1;
    }

    .timeline-dot.pending {
      background: #f4efe9;
      color: #8a6b37;
      border: 1px dashed rgba(138, 107, 55, 0.45);
      box-shadow: none;
    }

    .timeline-body {
      padding: 2px 0 24px;
    }

    .timeline-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 7px;
    }

    .timeline-meta strong {
      color: #171a21;
      font-size: 16px;
      line-height: 1.2;
    }

    .timeline-meta span {
      color: #8b919b;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .timeline-body p {
      max-width: 68ch;
      margin: 0;
      color: #555d68;
      font-size: 14px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .photo-link {
      display: inline-flex;
      margin-top: 10px;
      color: #a31820;
      font-size: 13px;
      font-weight: 750;
      text-decoration: none;
    }

    .side-stack {
      display: grid;
      gap: 14px;
    }

    .payment-panel,
    .documents-panel,
    .contact-panel {
      padding: 18px;
    }

    .money-hero {
      padding: 18px;
      border-radius: 22px;
      background: linear-gradient(135deg, #fff3ef, #f7f0e3);
      border: 1px solid rgba(198, 29, 38, 0.11);
    }

    .money-hero strong {
      display: block;
      margin-top: 4px;
      color: #9d141c;
      font-size: clamp(25px, 8vw, 31px);
      line-height: 1;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }

    .money-meter {
      margin: 16px 0;
      background: #e8edf0;
    }

    .money-meter div {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #1d8b50, #58c888);
    }

    .money-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .money-grid div {
      padding: 13px;
      border-radius: 18px;
      background: #f5f7f8;
    }

    .money-grid strong {
      display: block;
      margin-top: 5px;
      font-size: 15px;
      color: #171a21;
    }

    .notice {
      margin-top: 12px;
      border-radius: 16px;
      background: #fff2d8;
      color: #7f4e0d;
      padding: 11px 12px;
      font-size: 13px;
      font-weight: 650;
    }

    .payment-list {
      margin-top: 16px;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 0;
      border-top: 1px solid #eceff2;
    }

    .payment-row strong,
    .payment-row span,
    .payment-status small {
      display: block;
    }

    .payment-row strong {
      color: #171a21;
      font-size: 15px;
    }

    .payment-row span {
      color: #68707b;
      font-size: 12px;
    }

    .payment-status {
      text-align: right;
      flex: 0 0 auto;
    }

    .payment-status span {
      color: #8a5f13;
      font-weight: 800;
    }

    .payment-status span.verified {
      color: #167348;
    }

    .payment-status small {
      color: #8b919b;
      font-size: 11px;
      margin-top: 2px;
    }

    .document-row {
      display: grid;
      grid-template-columns: 32px 1fr;
      gap: 10px;
      align-items: center;
      padding: 12px 0;
      color: #171a21;
      text-decoration: none;
      border-top: 1px solid #eceff2;
    }

    .document-row span {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 12px;
      background: #f1e5e5;
      color: #a31820;
      font-size: 13px;
      font-weight: 900;
    }

    .document-row strong {
      font-size: 13px;
      line-height: 1.25;
    }

    .contact-panel {
      display: grid;
      gap: 5px;
      background: #181b22;
      color: #fffaf4;
    }

    .contact-panel span {
      color: rgba(255, 250, 244, 0.58);
    }

    .contact-panel strong {
      font-size: 23px;
    }

    .contact-panel a,
    .primary-action {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 44px;
      margin-top: 10px;
      border-radius: 16px;
      background: #c61d26;
      color: #fffaf4;
      font-size: 14px;
      font-weight: 850;
      text-decoration: none;
      box-shadow: 0 12px 28px rgba(198, 29, 38, 0.28);
    }

    .empty-copy {
      margin: 0;
      color: #7c838e;
      font-size: 13px;
      line-height: 1.45;
    }

    .loading-state,
    .error-state {
      min-height: 100vh;
      display: grid;
      place-items: center;
      align-content: center;
      text-align: center;
      padding: 24px;
    }

    .loading-mark {
      width: 48px;
      height: 48px;
      margin-bottom: 14px;
      border-radius: 999px;
      border: 4px solid rgba(198, 29, 38, 0.18);
      border-top-color: #c61d26;
      animation: spin 850ms linear infinite;
    }

    .loading-state p,
    .error-state p {
      color: #656d78;
      font-size: 14px;
    }

    .error-state h1 {
      max-width: 14ch;
      font-size: clamp(34px, 12vw, 68px);
      color: #171a21;
    }

    .eyebrow {
      margin: 0 0 12px;
      color: #a31820 !important;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (min-width: 720px) {
      .portal-shell {
        padding: 28px 24px 56px;
      }

      .hero {
        padding: 26px;
      }

      .status-band {
        grid-template-columns: 1fr 260px;
        align-items: end;
      }

      .quick-facts {
        grid-template-columns: repeat(3, 1fr);
      }

      .timeline-panel {
        padding: 26px 24px 8px;
      }

      .timeline-meta {
        flex-direction: row;
        justify-content: space-between;
      }
    }

    @media (max-width: 719px) {
      .hero,
      .quick-facts,
      .content-grid {
        width: calc(100vw - 28px);
        max-width: calc(100vw - 28px);
      }

      .timeline-panel,
      .payment-panel,
      .documents-panel,
      .contact-panel,
      .quick-facts div {
        width: 100%;
        max-width: 100%;
      }
    }

    @media (min-width: 980px) {
      .content-grid {
        grid-template-columns: minmax(0, 1.35fr) 410px;
      }

      .hero-copy {
        padding-top: 64px;
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

  paidPercent = computed(() => {
    const resumen = this.tramite()?.pagosResumen;
    if (!resumen || resumen.total <= 0) return 0;
    return Math.min(100, Math.round((resumen.pagado / resumen.total) * 100));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('El enlace no incluye un identificador válido.');
      return;
    }

    this.portalService.getTramite(id).subscribe({
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
