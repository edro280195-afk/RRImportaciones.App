import { Component, HostListener, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { RodriPanelComponent } from '../rodri-panel/rodri-panel.component';

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
  `,
})
export class AppLayoutComponent implements OnInit {
  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  isMobile = signal(window.innerWidth < 768);

  ngOnInit(): void {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      this.sidebarCollapsed.set(true);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (!mobile) this.mobileMenuOpen.set(false);
  }
}
