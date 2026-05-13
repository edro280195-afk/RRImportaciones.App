import { Component, signal, OnInit, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header
      class="topbar-glass h-[56px] flex items-center gap-5 px-7 fixed top-0 right-0 z-10 transition-all duration-200 ease-in-out"
      [class.left-[64px]]="collapsed()"
      [class.left-[220px]]="!collapsed()"
    >
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-[13px] text-[#7D797F]">
        @for (crumb of breadcrumbs(); track crumb; let last = $last) {
          @if (!last) {
            <span>{{ crumb }}</span>
            <span class="text-[#C9C5CA]">/</span>
          } @else {
            <span class="text-[#231F23] font-semibold">{{ crumb }}</span>
          }
        }
      </nav>

      <!-- Search -->
      <label class="ml-auto flex items-center gap-[9px] bg-[#F3F1F3]/70 backdrop-blur-sm border border-[#E5E1E6] rounded-lg px-3 py-2 w-[320px] transition-all duration-200 focus-within:border-[#C61D26] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(176,24,31,0.1)] cursor-text" for="topbar-search-input">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[14px] h-[14px] text-[#A4A0A5] shrink-0 stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          id="topbar-search-input"
          type="text"
          placeholder="Buscar cliente, VIN, pedimento, número…"
          class="bg-transparent border-none outline-none font-[Onest] text-[13px] w-full text-[#231F23] placeholder:text-[#A4A0A5]"
          (focus)="searchFocused.set(true)"
          (blur)="searchFocused.set(false)"
        />
        <kbd class="font-mono-data text-[10px] text-[#7D797F] bg-white px-1.5 py-0.5 rounded-[4px] border border-[#E5E1E6] shadow-sm leading-none">⌘K</kbd>
      </label>

      <!-- Notifications -->
      <button
        class="w-9 h-9 rounded-lg flex items-center justify-center text-[#7D797F] hover:bg-[#F3F1F3] hover:text-[#231F23] transition-all duration-150 relative"
        aria-label="Notificaciones"
        id="topbar-notifications"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[17px] h-[17px] stroke-[1.8]">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <span class="absolute top-[9px] right-[9px] w-[7px] h-[7px] bg-[#F59E0B] rounded-full border-2 border-white"></span>
      </button>

      <!-- Settings -->
      <button
        class="w-9 h-9 rounded-lg flex items-center justify-center text-[#7D797F] hover:bg-[#F3F1F3] hover:text-[#231F23] transition-all duration-150"
        aria-label="Configuración"
        id="topbar-settings"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[17px] h-[17px] stroke-[1.8]">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </button>
    </header>
  `,
})
export class TopbarComponent implements OnInit {
  collapsed = signal(false);
  searchFocused = signal(false);
  breadcrumbs = signal<string[]>(['Inicio']);

  constructor(private router: Router) {
    this.updateBreadcrumbs();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.updateBreadcrumbs());
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
      document.getElementById('topbar-search-input')?.focus();
    }
  }

  private updateBreadcrumbs(): void {
    const path = this.router.url.split('/').filter(Boolean);
    if (path.length === 0) {
      this.breadcrumbs.set(['Inicio']);
    } else {
      this.breadcrumbs.set(path.map(s => s.charAt(0).toUpperCase() + s.slice(1)));
    }
  }
}
