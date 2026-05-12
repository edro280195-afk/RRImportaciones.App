import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="glass-sidebar w-[232px] h-screen flex flex-col fixed left-0 top-0 overflow-y-auto z-20">
      <!-- Brand -->
      <div class="px-[22px] pt-[22px] pb-4">
        <h1 class="font-display text-[26px] tracking-[-1px] leading-none text-[#121012] flex items-baseline gap-px">
          <span class="text-[#B0181F] font-normal">R</span>
          <span class="italic text-[#121012] mx-0.5">&amp;</span>
          <span class="text-[#B0181F] font-normal">R</span>
        </h1>
        <p class="text-[10px] tracking-[2.5px] font-semibold text-[#7D797F] uppercase">Importaciones</p>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 pb-6 overflow-y-auto">
        @for (group of menuGroups; track group.label; let gi = $index) {
          <div class="mt-3.5 first:mt-0 stagger-item" [style.animationDelay.px]="gi * 30">
            <p class="text-[10px] tracking-[1.5px] font-bold text-[#A4A0A5] uppercase px-2.5 pb-1 pt-2">{{ group.label }}</p>
            @for (item of group.items; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="nav-active"
                [routerLinkActiveOptions]="{exact: item.route === '/inicio'}"
                class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium text-[#585459] transition-all duration-150 mb-px hover:bg-white/60 hover:text-[#231F23] nav-link"
              >
                <span class="w-[17px] h-[17px] shrink-0 opacity-60 nav-icon" [innerHTML]="item.icon"></span>
                <span>{{ item.label }}</span>
                @if (item.badge) {
                  <span class="ml-auto font-mono-data text-[10px] font-semibold text-[#7D797F] bg-[#EBE8EB] px-1.5 py-0.5 rounded-[4px] nav-badge">{{ item.badge }}</span>
                }
              </a>
            }
          </div>
        }
      </nav>

      <!-- User block -->
      <div class="mx-3 mb-3 p-3.5 rounded-xl glass card-elevated flex items-center gap-2.5 cursor-pointer hover:shadow-md transition-all duration-200">
        <div class="w-[34px] h-[34px] rounded-full bg-[#B0181F] flex items-center justify-center text-white font-semibold text-[11px] tracking-[0.5px] shadow-glow-red">
          {{ initials() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-[#231F23] truncate">{{ displayName() }}</p>
          <p class="text-[11px] text-[#7D797F]">{{ userRole() }}</p>
        </div>
        <button (click)="auth.logout()" class="text-[#A4A0A5] hover:text-[#B0181F] transition-all duration-150 hover:scale-110" title="Cerrar sesión">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[14px] h-[14px] stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}

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

  icons = {
    home: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    clients: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
    vehicles: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
    tramites: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    pedimentos: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`,
    inventario: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
    nuevaCoti: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4"/></svg>`,
    historico: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    pagos: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    gastos: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
    marcas: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`,
    aduanas: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
    tramitadores: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
    personal: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>`,
    partners: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>`,
    usuarios: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    roles: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
    auditoria: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`,
  };

  menuGroups: MenuGroup[] = [
    {
      label: 'Operación',
      items: [
        { label: 'Inicio', icon: this.icons.home, route: '/inicio' },
        { label: 'Clientes', icon: this.icons.clients, route: '/clientes', badge: '254' },
        { label: 'Vehículos', icon: this.icons.vehicles, route: '/vehiculos' },
        { label: 'Trámites', icon: this.icons.tramites, route: '/tramites', badge: '23' },
        { label: 'Pedimentos', icon: this.icons.pedimentos, route: '/pedimentos' },
        { label: 'Inventario', icon: this.icons.inventario, route: '/inventario' },
      ],
    },
    {
      label: 'Cotizaciones',
      items: [
        { label: 'Nueva cotización', icon: this.icons.nuevaCoti, route: '/cotizaciones/nueva' },
        { label: 'Histórico', icon: this.icons.historico, route: '/cotizaciones' },
      ],
    },
    {
      label: 'Finanzas',
      items: [
        { label: 'Pagos', icon: this.icons.pagos, route: '/pagos', badge: '7' },
        { label: 'Gastos hormiga', icon: this.icons.gastos, route: '/gastos-hormiga' },
      ],
    },
    {
      label: 'Catálogos',
      items: [
        { label: 'Marcas', icon: this.icons.marcas, route: '/marcas' },
        { label: 'Aduanas', icon: this.icons.aduanas, route: '/aduanas' },
        { label: 'Tramitadores', icon: this.icons.tramitadores, route: '/tramitadores' },
        { label: 'Personal', icon: this.icons.personal, route: '/personal' },
        { label: 'Partners', icon: this.icons.partners, route: '/partners' },
      ],
    },
    {
      label: 'Administración',
      items: [
        { label: 'Usuarios', icon: this.icons.usuarios, route: '/usuarios' },
        { label: 'Roles', icon: this.icons.roles, route: '/roles' },
        { label: 'Auditoría', icon: this.icons.auditoria, route: '/auditoria' },
      ],
    },
  ];
}
