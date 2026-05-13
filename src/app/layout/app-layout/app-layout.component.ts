import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <app-sidebar (collapsedChange)="sidebarCollapsed.set($event)" />
    <app-topbar />
    <main
      class="pt-[56px] min-h-screen transition-all duration-200 ease-in-out"
      [class.ml-[64px]]="sidebarCollapsed()"
      [class.ml-[220px]]="!sidebarCollapsed()"
      style="background: #F5F6F8;"
    >
      <div class="p-7 max-w-[1560px]">
        <router-outlet />
      </div>
    </main>
  `,
})
export class AppLayoutComponent implements OnInit {
  sidebarCollapsed = signal(false);

  ngOnInit(): void {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      this.sidebarCollapsed.set(true);
    }
  }
}

