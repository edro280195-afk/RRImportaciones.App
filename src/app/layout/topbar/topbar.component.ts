import { Component, computed, ElementRef, HostListener, inject, OnInit, output, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { PagoService } from '../../services/pago.service';
import { RodriStateService } from '../../services/rodri-state.service';
import { TramiteService } from '../../services/tramite.service';

interface QuickAction {
  label: string;
  detail: string;
  route: string;
  permiso?: string | 'ADMIN_ONLY';
}

interface AppNotification {
  title: string;
  detail: string;
  route: string;
  severity: 'warning' | 'info' | 'success';
  permiso?: string | 'ADMIN_ONLY';
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header
      class="topbar-glass h-[56px] fixed top-0 right-0 z-10 flex items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7 transition-all duration-200 ease-in-out"
      [style.left.px]="isMobile() ? 0 : (collapsed() ? 64 : 220)"
    >
      <button
        type="button"
        class="md:hidden grid h-9 w-9 place-items-center rounded-lg text-[#231F23] hover:bg-[#F3F1F3]"
        aria-label="Abrir menu"
        (click)="openMobileMenu()"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-[18px] w-[18px] stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
      </button>

      <nav class="min-w-0 flex items-center gap-2 text-[12px] sm:text-[13px] text-[#7D797F] max-w-[36vw] sm:max-w-[260px]">
        @for (crumb of breadcrumbs(); track crumb; let last = $last) {
          @if (!last) {
            <span class="hidden sm:inline truncate max-w-[120px]">{{ crumb }}</span>
            <span class="hidden sm:inline text-[#C9C5CA]">/</span>
          } @else {
            <span class="text-[#231F23] font-semibold truncate max-w-[82px] sm:max-w-[220px]">{{ crumb }}</span>
          }
        }
      </nav>

      <div class="relative ml-auto flex min-w-0 flex-1 justify-end md:justify-center">
        <button
          type="button"
          class="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#7D797F] hover:bg-[#F3F1F3] hover:text-[#231F23] transition-all duration-150"
          aria-label="Abrir busqueda"
          (click)="toggleSearchPanel()"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[17px] h-[17px] stroke-[1.8]">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </button>

        <label
          class="hidden md:flex w-full max-w-[620px] min-w-[220px] items-center gap-[9px] bg-[#F3F1F3]/80 backdrop-blur-sm border border-[#E5E1E6] rounded-lg px-3 py-2 transition-all duration-200 focus-within:border-[#C61D26] focus-within:bg-[#FBFAFB] focus-within:shadow-[0_0_0_3px_rgba(176,24,31,0.1)] cursor-text"
          for="topbar-search-input"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[14px] h-[14px] text-[#A4A0A5] shrink-0 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            id="topbar-search-input"
            type="text"
            placeholder="Buscar cliente, VIN, pedimento, modulo..."
            class="bg-transparent border-none outline-none font-[Onest] text-[13px] w-full text-[#231F23] placeholder:text-[#A4A0A5]"
            [value]="searchTerm()"
            (input)="setSearchTerm($event)"
            (focus)="openSearch()"
            autocomplete="off"
          />
          <kbd class="font-mono-data text-[10px] text-[#7D797F] bg-[#FBFAFB] px-1.5 py-0.5 rounded-[4px] border border-[#E5E1E6] shadow-sm leading-none">Ctrl K</kbd>
        </label>

        @if (searchOpen()) {
          <section class="fixed inset-x-3 top-[64px] max-h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-[#E5E1E6] bg-[#FBFAFB] shadow-[0_18px_50px_rgba(31,35,43,0.16)] md:absolute md:inset-x-auto md:right-0 md:top-[44px] md:w-[620px]">
            <div class="md:hidden p-3 border-b border-[#EEEAF0]">
              <label class="flex items-center gap-2 rounded-lg border border-[#E5E1E6] bg-white px-3 py-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] text-[#A4A0A5] stroke-2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  id="topbar-search-mobile-input"
                  type="text"
                  placeholder="Buscar en R&R"
                  class="w-full bg-transparent text-[14px] outline-none"
                  [value]="searchTerm()"
                  (input)="setSearchTerm($event)"
                  autocomplete="off"
                />
              </label>
            </div>

            <div class="p-2">
              @for (action of filteredActions(); track action.route) {
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F3F1F3] transition-colors"
                  (click)="go(action.route)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-[13px] font-semibold text-[#231F23]">{{ action.label }}</span>
                    <span class="block truncate text-[12px] text-[#7D797F]">{{ action.detail }}</span>
                  </span>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-[#A4A0A5] stroke-2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              } @empty {
                <div class="px-3 py-5 text-center">
                  @if (searchLoading()) {
                    <p class="text-[13px] font-semibold text-[#231F23]">Buscando...</p>
                    <p class="mt-1 text-[12px] text-[#7D797F]">Revisando clientes, tramites, cotizaciones y pagos.</p>
                  } @else {
                    <p class="text-[13px] font-semibold text-[#231F23]">Sin coincidencias</p>
                    <p class="mt-1 text-[12px] text-[#7D797F]">Prueba con cliente, tramite, pago o configuracion.</p>
                  }
                </div>
              }
            </div>
          </section>
        }
      </div>

      <div class="flex shrink-0 items-center gap-0.5 sm:gap-2">
        @if (auth.isAdmin()) {
          <button
            type="button"
            (click)="rodriState.toggle()"
            class="hidden sm:flex items-center gap-1.5 px-3 py-[7px] rounded-lg bg-[#C61D26] text-white text-[12px] font-semibold hover:bg-[#A01520] transition-all duration-150"
            aria-label="Abrir Rodri IA"
          >
            <svg fill="currentColor" viewBox="0 0 24 24" class="w-[13px] h-[13px] shrink-0">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
            </svg>
            Rodri
          </button>
        }

        <div class="relative">
          <button
            type="button"
            class="w-9 h-9 rounded-lg flex items-center justify-center text-[#7D797F] hover:bg-[#F3F1F3] hover:text-[#231F23] transition-all duration-150 relative"
            aria-label="Notificaciones"
            id="topbar-notifications"
            (click)="toggleNotifications()"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[17px] h-[17px] stroke-[1.8]">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            @if (visibleNotifications().length > 0) {
              <span class="absolute top-[7px] right-[7px] min-w-[15px] h-[15px] rounded-full bg-[#C61D26] px-1 text-[9px] font-bold leading-[15px] text-white ring-2 ring-[#FBFAFB]">{{ visibleNotifications().length }}</span>
            }
          </button>

          @if (notificationsOpen()) {
            <section class="fixed inset-x-3 top-[64px] max-h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-[#E5E1E6] bg-[#FBFAFB] shadow-[0_18px_50px_rgba(31,35,43,0.16)] md:absolute md:inset-x-auto md:right-0 md:top-[44px] md:w-[360px]">
              <div class="border-b border-[#EEEAF0] px-4 py-3">
                <p class="text-[13px] font-semibold text-[#231F23]">Notificaciones</p>
                <p class="mt-0.5 text-[12px] text-[#7D797F]">Pendientes operativos del MVP</p>
              </div>
              <div class="max-h-[340px] overflow-y-auto p-2">
                @for (item of visibleNotifications(); track item.title) {
                  <button type="button" class="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F3F1F3] transition-colors" (click)="go(item.route)">
                    <span class="mt-1 h-2 w-2 shrink-0 rounded-full" [class.bg-[#F59E0B]]="item.severity === 'warning'" [class.bg-[#2563EB]]="item.severity === 'info'" [class.bg-[#16A34A]]="item.severity === 'success'"></span>
                    <span class="min-w-0">
                      <span class="block text-[13px] font-semibold text-[#231F23]">{{ item.title }}</span>
                      <span class="mt-0.5 block text-[12px] leading-5 text-[#6B717F]">{{ item.detail }}</span>
                    </span>
                  </button>
                } @empty {
                  <div class="px-4 py-6 text-center">
                    <p class="text-[13px] font-semibold text-[#231F23]">Sin alertas visibles</p>
                    <p class="mt-1 text-[12px] text-[#7D797F]">Tu rol no tiene pendientes disponibles aqui.</p>
                  </div>
                }
              </div>
            </section>
          }
        </div>

        <div class="relative">
          <button
            type="button"
            class="w-9 h-9 rounded-lg flex items-center justify-center text-[#7D797F] hover:bg-[#F3F1F3] hover:text-[#231F23] transition-all duration-150"
            aria-label="Configuracion"
            id="topbar-settings"
            (click)="toggleSettings()"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[17px] h-[17px] stroke-[1.8]">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>

          @if (settingsOpen()) {
            <section class="fixed inset-x-3 top-[64px] max-h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-[#E5E1E6] bg-[#FBFAFB] shadow-[0_18px_50px_rgba(31,35,43,0.16)] md:absolute md:inset-x-auto md:right-0 md:top-[44px] md:w-[340px]">
              <div class="border-b border-[#EEEAF0] px-4 py-3">
                <p class="text-[13px] font-semibold text-[#231F23]">Configuracion</p>
                <p class="mt-0.5 text-[12px] text-[#7D797F]">{{ settingsSubtitle() }}</p>
              </div>
              @if (auth.isAdmin()) {
                <div class="p-2">
                  @for (item of adminSettings; track item.route) {
                    <button type="button" class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F3F1F3] transition-colors" (click)="go(item.route)">
                      <span>
                        <span class="block text-[13px] font-semibold text-[#231F23]">{{ item.label }}</span>
                        <span class="mt-0.5 block text-[12px] text-[#7D797F]">{{ item.detail }}</span>
                      </span>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-[#A4A0A5] stroke-2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  }
                </div>
              } @else {
                <div class="px-4 py-5">
                  <p class="text-[13px] font-semibold text-[#231F23]">Solo lectura</p>
                  <p class="mt-1 text-[12px] leading-5 text-[#6B717F]">Tu usuario no tiene permisos para cambiar configuracion, permisos ni contrasenas.</p>
                </div>
              }
            </section>
          }
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent implements OnInit {
  collapsed = signal(false);
  isMobile = signal(window.innerWidth < 768);
  breadcrumbs = signal<string[]>(['Inicio']);
  searchOpen = signal(false);
  searchTerm = signal('');
  searchLoading = signal(false);
  searchResults = signal<QuickAction[]>([]);
  notificationsOpen = signal(false);
  settingsOpen = signal(false);

  rodriState = inject(RodriStateService);
  auth = inject(AuthService);
  private host = inject(ElementRef<HTMLElement>);
  private clienteService = inject(ClienteService);
  private tramiteService = inject(TramiteService);
  private cotizacionService = inject(CotizacionService);
  private pagoService = inject(PagoService);
  menuClick = output<void>();
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly adminSettings: QuickAction[] = [
    { label: 'Usuarios y roles', detail: 'Cuentas, permisos y accesos', route: '/usuarios' },
    { label: 'Parametros fiscales', detail: 'IVA, IGI, DTA e historicos', route: '/admin/parametros-fiscales' },
    { label: 'Plantillas', detail: 'Mensajes de email y WhatsApp', route: '/admin/plantillas' },
    { label: 'Auditoria', detail: 'Cambios importantes del sistema', route: '/auditoria' },
  ];

  private readonly quickActions: QuickAction[] = [
    { label: 'Clientes', detail: 'Buscar expedientes por cliente', route: '/clientes', permiso: 'CLIENTES_VER' },
    { label: 'Vehiculos', detail: 'VIN, marca, modelo e inventario', route: '/vehiculos', permiso: 'TRAMITES_VER' },
    { label: 'Tramites', detail: 'Operacion activa y seguimiento', route: '/tramites', permiso: 'TRAMITES_VER' },
    { label: 'Campo', detail: 'Fotos, reportes y tareas de yarda', route: '/campo', permiso: 'EVENTOS_CREAR' },
    { label: 'Nueva cotizacion', detail: 'Crear una propuesta para cliente', route: '/cotizaciones/nueva', permiso: 'COTIZACIONES_CREAR' },
    { label: 'Cotizaciones', detail: 'Historico, conversion y vencimientos', route: '/cotizaciones', permiso: 'COTIZACIONES_VER' },
    { label: 'Pagos', detail: 'Cobros por verificar y comprobantes', route: '/pagos', permiso: 'PAGOS_VER' },
    { label: 'Bancos', detail: 'Cuentas bancarias para registrar pagos', route: '/bancos', permiso: 'CATALOGOS_VER' },
    { label: 'Reporte de cotizaciones', detail: 'Conversion y rendimiento comercial', route: '/reportes/cotizaciones', permiso: 'REPORTES_FINANCIEROS' },
    { label: 'Usuarios', detail: 'Cuentas del sistema y personal de campo', route: '/usuarios', permiso: 'USUARIOS_VER' },
    { label: 'Parametros fiscales', detail: 'Configuracion fiscal vigente', route: '/admin/parametros-fiscales', permiso: 'ADMIN_ONLY' },
    { label: 'Plantillas', detail: 'Editor guiado de email y WhatsApp', route: '/admin/plantillas', permiso: 'ADMIN_ONLY' },
    { label: 'Auditoria', detail: 'Registro de cambios del sistema', route: '/auditoria', permiso: 'ADMIN_ONLY' },
  ];

  private readonly notifications: AppNotification[] = [
    { title: 'Pagos por verificar', detail: 'Revisa comprobantes nuevos antes de conciliarlos.', route: '/pagos', severity: 'warning', permiso: 'PAGOS_VER' },
    { title: 'Cotizaciones por vencer', detail: 'Da seguimiento antes de que el cliente pierda vigencia.', route: '/cotizaciones', severity: 'warning', permiso: 'COTIZACIONES_VER' },
    { title: 'Tareas de campo abiertas', detail: 'Hay capturas pendientes de fotos o revision en yarda.', route: '/campo', severity: 'info', permiso: 'EVENTOS_CREAR' },
    { title: 'Plantillas listas para revisar', detail: 'Valida mensajes de correo y WhatsApp antes de usarlos.', route: '/admin/plantillas', severity: 'success', permiso: 'ADMIN_ONLY' },
  ];

  filteredActions = computed(() => {
    const term = this.normalize(this.searchTerm());
    const visible = this.quickActions.filter(action => this.canSee(action.permiso));
    if (!term) return visible.slice(0, 6);
    const moduleMatches = visible
      .filter(action => this.normalize(`${action.label} ${action.detail}`).includes(term))
      .slice(0, 4);
    const dynamic = this.searchResults();
    return [...dynamic, ...moduleMatches].slice(0, 10);
  });

  visibleNotifications = computed(() => this.notifications.filter(item => this.canSee(item.permiso)));
  settingsSubtitle = computed(() => this.auth.isAdmin() ? 'Ajustes administrativos del sistema' : 'Sin permisos de modificacion');

  constructor(private router: Router) {
    this.updateBreadcrumbs();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
        this.closePanels();
      });
  }

  ngOnInit(): void {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      this.collapsed.set(true);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.openSearch();
      window.setTimeout(() => document.getElementById('topbar-search-input')?.focus());
    }

    if (e.key === 'Escape') {
      this.closePanels();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  openMobileMenu(): void {
    this.closePanels();
    this.menuClick.emit();
  }

  setSearchTerm(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.openSearch();
    this.scheduleSearch();
  }

  openSearch(): void {
    this.searchOpen.set(true);
    this.notificationsOpen.set(false);
    this.settingsOpen.set(false);
  }

  toggleSearchPanel(): void {
    const next = !this.searchOpen();
    this.searchOpen.set(next);
    this.notificationsOpen.set(false);
    this.settingsOpen.set(false);
    if (next) {
      window.setTimeout(() => document.getElementById('topbar-search-mobile-input')?.focus());
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.searchOpen() && !this.notificationsOpen() && !this.settingsOpen()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.closePanels();
  }

  toggleNotifications(): void {
    this.notificationsOpen.update(value => !value);
    this.searchOpen.set(false);
    this.settingsOpen.set(false);
  }

  toggleSettings(): void {
    this.settingsOpen.update(value => !value);
    this.searchOpen.set(false);
    this.notificationsOpen.set(false);
  }

  go(route: string): void {
    this.closePanels();
    this.searchTerm.set('');
    this.router.navigate([route]);
  }

  private closePanels(): void {
    this.searchOpen.set(false);
    this.notificationsOpen.set(false);
    this.settingsOpen.set(false);
  }

  private scheduleSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    const term = this.searchTerm().trim();
    if (term.length < 2) {
      this.searchLoading.set(false);
      this.searchResults.set([]);
      return;
    }
    this.searchLoading.set(true);
    this.searchTimeout = setTimeout(() => this.runGlobalSearch(term), 220);
  }

  private runGlobalSearch(term: string): void {
    forkJoin({
      clientes: this.canSee('CLIENTES_VER')
        ? this.clienteService.getList({ search: term, page: 1, pageSize: 4 }).pipe(catchError(() => of({ items: [] })))
        : of({ items: [] }),
      tramites: this.canSee('TRAMITES_VER')
        ? this.tramiteService.getList({ search: term, page: 1, pageSize: 4 }).pipe(catchError(() => of({ items: [] })))
        : of({ items: [] }),
      cotizaciones: this.canSee('COTIZACIONES_VER')
        ? this.cotizacionService.getList({ search: term, page: 1, pageSize: 3 }).pipe(catchError(() => of({ items: [] })))
        : of({ items: [] }),
      pagos: this.canSee('PAGOS_VER')
        ? this.pagoService.getList({ search: term, page: 1, pageSize: 3 }).pipe(catchError(() => of({ items: [] })))
        : of({ items: [] }),
    }).pipe(
      map(({ clientes, tramites, cotizaciones, pagos }) => [
        ...clientes.items.map(c => ({
          label: c.apodo || c.nombreCompleto || 'Cliente',
          detail: `Cliente${c.nombreCompleto ? ` · ${c.nombreCompleto}` : ''}${c.telefono ? ` · ${c.telefono}` : ''}`,
          route: `/clientes/${c.id}`,
        })),
        ...tramites.items.map(t => ({
          label: t.numeroConsecutivo,
          detail: `Tramite · ${t.clienteApodo || t.clienteNombre || 'Sin cliente'} · ${t.vehiculoMarcaModelo || t.vehiculoVinCorto || t.estatus}`,
          route: `/tramites/${t.id}`,
        })),
        ...cotizaciones.items.map(c => ({
          label: c.folio || 'Cotizacion',
          detail: `Cotizacion · ${c.clienteNombre || 'Sin cliente'} · ${c.vehiculo || c.vin || c.estado}`,
          route: `/cotizaciones/${c.id}`,
        })),
        ...pagos.items.map(p => ({
          label: `${this.formatMoney(p.monto, p.moneda)} · ${p.numeroConsecutivo}`,
          detail: `Pago · ${p.clienteNombre || p.pagadoPor || 'Sin cliente'} · ${p.metodo}${p.referencia ? ` · ${p.referencia}` : ''}`,
          route: `/tramites/${p.tramiteId}`,
        })),
      ] satisfies QuickAction[])
    ).subscribe({
      next: (items) => {
        if (this.searchTerm().trim() === term) this.searchResults.set(items);
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.searchLoading.set(false);
      },
    });
  }

  private updateBreadcrumbs(): void {
    const labels: Record<string, string> = {
      admin: 'Admin',
      'parametros-fiscales': 'Parametros fiscales',
      'gastos-hormiga': 'Gastos hormiga',
      reportes: 'Reportes',
      cotizaciones: 'Cotizaciones',
    };
    const path = this.router.url.split('?')[0].split('/').filter(Boolean);
    this.breadcrumbs.set(path.length === 0 ? ['Inicio'] : path.map(s => labels[s] ?? this.capitalize(s)));
  }

  private canSee(permission?: string | 'ADMIN_ONLY'): boolean {
    if (!permission) return true;
    if (permission === 'ADMIN_ONLY') return this.auth.isAdmin();
    return this.auth.can(permission);
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private formatMoney(value: number, currency: string): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN', maximumFractionDigits: 0 }).format(value);
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
  }
}
