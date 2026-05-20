import { Component, HostListener, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { RodriPanelComponent } from '../rodri-panel/rodri-panel.component';
import { RealtimeService, CampoNotificacionEvent, PinResetRequestedEvent } from '../../services/realtime.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, RodriPanelComponent],
  template: `
    <app-sidebar
      [mobileOpen]="mobileMenuOpen()"
      (mobileClose)="mobileMenuOpen.set(false)"
      (collapsedChange)="sidebarCollapsed.set($event)"
    />
    <app-topbar (menuClick)="mobileMenuOpen.set(true)" />
    <app-rodri-panel />
    <main
      class="pt-[56px] min-h-screen transition-all duration-200 ease-in-out"
      [style.margin-left.px]="isMobile() ? 0 : (sidebarCollapsed() ? 64 : 220)"
      style="background: #F5F6F8;"
    >
      <div class="max-w-[1560px] p-4 sm:p-5 lg:p-7">
        <router-outlet />
      </div>
    </main>

    <!-- ── Notificaciones campo (SignalR push toasts) ── -->
    @if (campoNotif()) {
      @let n = campoNotif()!;
      <div
        class="campo-toast"
        [class.campo-toast--incidencia]="n.tieneIncidencia"
        role="alert"
        aria-live="assertive">
        <div class="campo-toast__bar" [class.bar--incidencia]="n.tieneIncidencia"></div>

        <div class="campo-toast__body">
          <div class="campo-toast__icon" [class.icon--incidencia]="n.tieneIncidencia">
            @if (n.tieneIncidencia) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
              </svg>
            }
          </div>

          <div class="campo-toast__content">
            <p class="campo-toast__title">
              {{ n.tieneIncidencia ? '\u26a0\ufe0f Incidencia en campo' : '\u2705 Captura completada' }}
            </p>
            <p class="campo-toast__vehicle">{{ n.vehiculoResumen }}</p>
            <div class="campo-toast__meta">
              <span>{{ n.numeroConsecutivo }}</span>
              <span class="dot">·</span>
              <span>{{ n.operadorNombre }}</span>
              @if (n.totalFotos > 0) {
                <span class="dot">·</span>
                <span>{{ n.totalFotos }} foto{{ n.totalFotos !== 1 ? 's' : '' }}</span>
              }
            </div>
            @if (n.tieneIncidencia && n.incidencia) {
              <p class="campo-toast__incidencia">{{ n.incidencia }}</p>
            }
            <button
              class="campo-toast__link"
              (click)="irATramite(n.tramiteId)">
              Ver trámite &rarr;
            </button>
          </div>

          <button
            class="campo-toast__close"
            (click)="campoNotif.set(null)"
            aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    }

    <!-- ── Notificaciones PIN reset ── -->
    @if (pinResetNotif()) {
      @let pr = pinResetNotif()!;
      <div
        class="campo-toast pin-reset-toast"
        role="alert"
        aria-live="assertive">
        <div class="campo-toast__bar bar--pin-reset"></div>

        <div class="campo-toast__body">
          <div class="campo-toast__icon icon--pin-reset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z"/>
            </svg>
          </div>

          <div class="campo-toast__content">
            <p class="campo-toast__title">⚠️ Reinicio de PIN solicitado</p>
            <p class="campo-toast__vehicle">{{ pr.operadorNombre }}</p>
            <div class="campo-toast__meta">
              <span>Usuario: {{ '@' + pr.username }}</span>
            </div>
            <button
              class="campo-toast__link"
              (click)="irAUsuarios()">
              Asignar PIN &rarr;
            </button>
          </div>

          <button
            class="campo-toast__close"
            (click)="pinResetNotif.set(null)"
            aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .campo-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      width: 340px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08);
      border: 1px solid #e5e7eb;
      overflow: hidden;
      animation: slideUp .3s cubic-bezier(.16,1,.3,1);
    }
    .campo-toast--incidencia {
      border-color: #FCD34D;
    }
    .campo-toast__bar {
      height: 4px;
      background: #16A34A;
    }
    .bar--incidencia { background: #D97706; }
    .campo-toast__body {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 14px 16px;
    }
    .campo-toast__icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #DCFCE7;
      color: #16A34A;
      display: grid;
      place-items: center;
    }
    .campo-toast__icon.icon--incidencia {
      background: #FEF3C7;
      color: #D97706;
    }
    .campo-toast__icon svg { width: 18px; height: 18px; }
    .campo-toast__content { flex: 1; min-width: 0; }
    .campo-toast__title {
      margin: 0 0 2px;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
    }
    .campo-toast__vehicle {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 700;
      color: #0D1017;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .campo-toast__meta {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #6B7280;
      flex-wrap: wrap;
    }
    .dot { opacity: .5; }
    .campo-toast__incidencia {
      margin: 6px 0 0;
      font-size: 12px;
      color: #78350F;
      background: #FEF3C7;
      border-radius: 6px;
      padding: 5px 8px;
      line-height: 1.45;
    }
    .campo-toast__link {
      margin-top: 10px;
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: #C61D26;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .campo-toast__link:hover { text-decoration: underline; }
    .campo-toast__close {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      color: #9CA3AF;
      cursor: pointer;
      padding: 0;
      display: grid;
      place-items: center;
      border-radius: 6px;
    }
    .campo-toast__close:hover { background: #F3F4F6; color: #374151; }
    .campo-toast__close svg { width: 16px; height: 16px; }
    .pin-reset-toast {
      border-color: #EF4444;
    }
    .bar--pin-reset {
      background: #EF4444;
    }
    .icon--pin-reset {
      background: #FEE2E2;
      color: #EF4444;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 480px) {
      .campo-toast { right: 12px; left: 12px; width: auto; }
    }
  `],
})
export class AppLayoutComponent implements OnInit, OnDestroy {
  private realtime  = inject(RealtimeService);
  private router    = inject(Router);
  private auth      = inject(AuthService);
  private notifSub?: Subscription;
  private pinResetSub?: Subscription;
  private authSub?:  Subscription;
  private autoDismissTimer?: ReturnType<typeof setTimeout>;
  private pinResetDismissTimer?: ReturnType<typeof setTimeout>;

  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  isMobile = signal(window.innerWidth < 768);
  campoNotif = signal<CampoNotificacionEvent | null>(null);
  pinResetNotif = signal<PinResetRequestedEvent | null>(null);

  ngOnInit(): void {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') this.sidebarCollapsed.set(true);

    // Iniciar SignalR y suscribirse a notificaciones de campo
    this.realtime.start();
    this.notifSub = this.realtime.tareaCampoCompletada$.subscribe(event => {
      this.showNotif(event);
    });

    this.pinResetSub = this.realtime.pinResetRequested$.subscribe(event => {
      this.showPinResetNotif(event);
    });

    // Si el token expiró, SignalR detectará un 401 y redirigiremos a login
    this.authSub = this.realtime.authError$.subscribe(() => {
      this.auth.clearSession();
      void this.router.navigateByUrl('/login?session=expired', { replaceUrl: true });
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    this.pinResetSub?.unsubscribe();
    this.authSub?.unsubscribe();
    clearTimeout(this.autoDismissTimer);
    clearTimeout(this.pinResetDismissTimer);
  }

  private showNotif(event: CampoNotificacionEvent): void {
    clearTimeout(this.autoDismissTimer);
    this.campoNotif.set(event);
    // Auto-dismiss tras 8 segundos (más tiempo si tiene incidencia)
    const delay = event.tieneIncidencia ? 12_000 : 8_000;
    this.autoDismissTimer = setTimeout(() => this.campoNotif.set(null), delay);
    // Vibrar si el navegador lo soporta (móvil)
    navigator.vibrate?.([100, 50, 100]);
  }

  private showPinResetNotif(event: PinResetRequestedEvent): void {
    clearTimeout(this.pinResetDismissTimer);
    this.pinResetNotif.set(event);
    // Auto-dismiss tras 12 segundos
    this.pinResetDismissTimer = setTimeout(() => this.pinResetNotif.set(null), 12_000);
    // Vibrar
    navigator.vibrate?.([100, 50, 100]);
  }

  irATramite(tramiteId: string): void {
    this.campoNotif.set(null);
    this.router.navigate(['/tramites', tramiteId]);
  }

  irAUsuarios(): void {
    this.pinResetNotif.set(null);
    this.router.navigate(['/usuarios']);
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (!mobile) this.mobileMenuOpen.set(false);
  }
}
