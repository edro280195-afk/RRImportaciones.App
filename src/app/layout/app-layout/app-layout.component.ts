import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <app-sidebar />
    <app-topbar />
    <main class="ml-[232px] pt-[60px] min-h-screen bg-[#F6F5F7]">
      <div class="p-8 max-w-[1600px]">
        <router-outlet />
      </div>
    </main>
  `,
})
export class AppLayoutComponent {}
