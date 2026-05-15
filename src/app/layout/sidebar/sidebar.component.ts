import { Component, computed, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface MenuItem {
  label: string;
  icon: SafeHtml;
  route: string;
  badge?: string;
  /** Permiso requerido. null = siempre visible. 'ADMIN_ONLY' = solo rol ADMIN. */
  permiso?: string | null;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  /** Si todos los items están filtrados, el grupo se oculta. */
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (isMobile() && mobileOpen()) {
      <button
        type="button"
        class="fixed inset-0 z-20 bg-[#0D1017]/45"
        aria-label="Cerrar menu"
        (click)="closeMobileMenu()"
      ></button>
    }

    <aside
      class="sidebar-dark h-screen flex flex-col fixed left-0 top-0 z-30 overflow-y-auto transition-all duration-200 ease-in-out"
      [class.sidebar-collapsed]="collapsed() && !isMobile()"
      [class.-translate-x-full]="isMobile() && !mobileOpen()"
      [class.translate-x-0]="!isMobile() || mobileOpen()"
      [style.width]="isMobile() ? '100vw' : (collapsed() ? '64px' : '220px')"
    >
      <!-- Brand header + toggle -->
      <div class="flex items-center px-4 pt-5 pb-4 border-b border-white/[0.06]" [class.justify-center]="collapsed() && !isMobile()">
        <button
          (click)="isMobile() ? closeMobileMenu() : toggle()"
          class="w-7 h-7 rounded-[7px] bg-[#C61D26] flex items-center justify-center shadow-[0_2px_8px_rgba(198,29,38,0.4)] shrink-0 hover:bg-[#A5151F] transition-colors"
          [title]="collapsed() ? 'Expandir menú' : 'Colapsar menú'"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2 text-white">
            @if (isMobile()) {
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            } @else if (collapsed()) {
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            }
          </svg>
        </button>
        @if (showLabels()) {
          <div class="overflow-hidden ml-2.5">
            <p class="text-white font-semibold text-[13px] leading-none tracking-[-0.3px] whitespace-nowrap">Importaciones</p>
          </div>
        }
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2.5 py-3 overflow-y-auto">
        @for (group of menuGroups(); track group.label; let gi = $index) {
          <div class="mb-4" [style.animationDelay]="(gi * 40) + 'ms'">
            @if (showLabels()) {
              <p class="text-[10px] font-semibold text-white/25 uppercase tracking-[1px] px-2.5 mb-1 overflow-hidden whitespace-nowrap">{{ group.label }}</p>
            }
            @for (item of group.items; track item.label) {
              <a
                [routerLink]="item.route"
                routerLinkActive="nav-active"
                [routerLinkActiveOptions]="{exact: item.route === '/inicio'}"
                class="nav-link-dark"
                [title]="item.label"
                (click)="closeMobileMenu()"
              >
                @if (!showLabels()) {
                  <span class="nav-icon w-5 h-5" [innerHTML]="item.icon"></span>
                } @else {
                  <span class="nav-icon w-4 h-4" [innerHTML]="item.icon"></span>
                  <span class="overflow-hidden whitespace-nowrap">{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="nav-badge-dark">{{ item.badge }}</span>
                  }
                }
              </a>
            }
          </div>
        }
      </nav>

      <!-- User block -->
      <div class="p-2.5 border-t border-white/[0.06]">
        <div class="flex items-center justify-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-white/[0.06] transition-all duration-150 cursor-pointer group" [title]="!showLabels() ? displayName() : ''">
          <div class="w-[30px] h-[30px] rounded-full bg-[#C61D26] flex items-center justify-center text-white font-semibold text-[10px] shrink-0 shadow-[0_0_0_2px_rgba(198,29,38,0.3)]">
            {{ initials() }}
          </div>
          @if (showLabels()) {
            <div class="flex-1 min-w-0 overflow-hidden">
              <p class="text-white/80 text-[12.5px] font-medium truncate leading-none mb-0.5 group-hover:text-white transition-colors duration-150">{{ displayName() }}</p>
              <p class="text-white/30 text-[11px] truncate">{{ userRole() }}</p>
            </div>
            <button
              (click)="auth.logout()"
              class="text-white/25 hover:text-white/70 transition-colors duration-150 p-1 rounded shrink-0"
              title="Cerrar sesión"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[13px] h-[13px] stroke-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          }
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  auth = inject(AuthService);
  private storageKey = 'sidebar-collapsed';

  collapsed = signal(false);
  isMobile = signal(window.innerWidth < 768);
  mobileOpen = input(false);
  collapsedChange = output<boolean>();
  mobileClose = output<void>();

  private allGroups: MenuGroup[] = [];

  /** Grupos y items filtrados según los permisos del usuario actual. */
  menuGroups = computed(() => {
    // Leer el signal del usuario para que el computed reaccione a cambios de sesión.
    const _ = this.auth.user();
    return this.allGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (!item.permiso) return true;
          if (item.permiso === 'ADMIN_ONLY') return this.auth.isAdmin();
          return this.auth.can(item.permiso);
        }),
      }))
      .filter(group => group.items.length > 0);
  });

  constructor() {
    this.allGroups = this.buildMenu();
  }

  ngOnInit(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === 'true') {
      this.collapsed.set(true);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (!mobile) this.mobileClose.emit();
  }

  toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(this.storageKey, String(next));
    this.collapsedChange.emit(next);
  }

  closeMobileMenu(): void {
    if (this.isMobile()) this.mobileClose.emit();
  }

  showLabels(): boolean {
    return this.isMobile() || !this.collapsed();
  }

  displayName(): string {
    const u = this.auth.user();
    return u ? `${u.nombre} ${u.apellidos || ''}`.trim() : '';
  }

  userRole(): string {
    const u = this.auth.user();
    return u ? u.role : '';
  }

  initials(): string {
    const u = this.auth.user();
    return u ? `${u.nombre[0]}${u.apellidos?.[0] || ''}` : 'RR';
  }

  private svg(paths: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">${paths}</svg>`
    );
  }

  private p(d: string): string {
    return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="${d}"/>`;
  }

  private buildMenu(): MenuGroup[] {
    const s = this.p.bind(this);

    const icons = {
      home: this.svg(s('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')),
      clients: this.svg(s('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')),
      vehicles: this.svg(s('M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z') + s('M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m8 1H9m4 0h2m4-8h-4l-1-4H7l-1 3H2')),
      tramites: this.svg(s('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')),
      pedimentos: this.svg(s('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4')),
      inventario: this.svg(s('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')),
      nuevaCoti: this.svg(s('M12 4v16m8-8H4')),
      historico: this.svg(s('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')),
      pagos: this.svg(s('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z')),
      gastos: this.svg(s('M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z')),
      reportes: this.svg(s('M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z') + s('M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z')),
      marcas: this.svg(s('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z')),
      aduanas: this.svg(s('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4')),
      tramitadores: this.svg(s('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')),
      personal: this.svg(s('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z')),
      partners: this.svg(s('M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z')),
      usuarios: this.svg(
        s('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z') +
        s('M15 12a3 3 0 11-6 0 3 3 0 016 0z')
      ),
      roles: this.svg(s('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z')),
      auditoria: this.svg(s('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01')),
      importador: this.svg(s('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0l-4 4m4-4l4 4') + s('M4 12h16')),
      plantillas: this.svg(s('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01')),
      parametros: this.svg(s('M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z')),
    };

    return [
      {
        label: 'Operación',
        items: [
          { label: 'Inicio',      icon: icons.home,       route: '/inicio',      permiso: null },
          { label: 'Clientes',    icon: icons.clients,    route: '/clientes',    permiso: 'CLIENTES_VER' },
          { label: 'Vehículos',   icon: icons.vehicles,   route: '/vehiculos',   permiso: 'TRAMITES_VER' },
          { label: 'Trámites',    icon: icons.tramites,   route: '/tramites',    permiso: 'TRAMITES_VER' },
          { label: 'Campo',       icon: icons.personal,   route: '/campo',       permiso: 'EVENTOS_CREAR' },
          { label: 'Pedimentos',  icon: icons.pedimentos, route: '/pedimentos',  permiso: 'TRAMITES_VER' },
          { label: 'Inventario',  icon: icons.inventario, route: '/inventario',  permiso: 'TRAMITES_VER' },
        ],
      },
      {
        label: 'Cotizaciones',
        items: [
          { label: 'Nueva',      icon: icons.nuevaCoti, route: '/cotizaciones/nueva', permiso: 'COTIZACIONES_CREAR' },
          { label: 'Histórico',  icon: icons.historico, route: '/cotizaciones',        permiso: 'COTIZACIONES_VER' },
        ],
      },
      {
        label: 'Finanzas',
        items: [
          { label: 'Pagos',             icon: icons.pagos,    route: '/pagos',                    permiso: 'PAGOS_VER' },
          { label: 'Gastos hormiga',    icon: icons.gastos,   route: '/gastos-hormiga',            permiso: 'GASTOS_VER' },
          { label: 'Reportes',          icon: icons.reportes, route: '/reportes',                  permiso: 'REPORTES_FINANCIEROS' },
        ],
      },
      {
        label: 'Catálogos',
        items: [
          { label: 'Marcas',        icon: icons.marcas,       route: '/marcas',       permiso: 'CATALOGOS_VER' },
          { label: 'Aduanas',       icon: icons.aduanas,      route: '/aduanas',      permiso: 'CATALOGOS_VER' },
          { label: 'Bancos',        icon: icons.pagos,        route: '/bancos',       permiso: 'CATALOGOS_VER' },
          { label: 'Tramitadores',  icon: icons.tramitadores, route: '/tramitadores', permiso: 'CATALOGOS_VER' },
          { label: 'Partners',      icon: icons.partners,     route: '/partners',     permiso: 'CATALOGOS_VER' },
        ],
      },
      {
        label: 'Admin',
        items: [
          { label: 'Usuarios',           icon: icons.usuarios,  route: '/usuarios',                 permiso: 'USUARIOS_VER' },
          { label: 'Roles',              icon: icons.roles,     route: '/roles',                    permiso: 'ADMIN_ONLY' },
          { label: 'Auditoría',          icon: icons.auditoria, route: '/auditoria',                permiso: 'ADMIN_ONLY' },
          { label: 'Parámetros fiscales',icon: icons.parametros,route: '/admin/parametros-fiscales',permiso: 'ADMIN_ONLY' },
          { label: 'Importador',         icon: icons.importador,route: '/admin/importador',         permiso: 'ADMIN_ONLY' },
          { label: 'Plantillas',         icon: icons.plantillas,route: '/admin/plantillas',         permiso: 'ADMIN_ONLY' },
        ],
      },
    ];
  }
}
