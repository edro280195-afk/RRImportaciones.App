import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-modo-don-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="flex flex-col min-h-screen bg-[#F8FAFC]">

      <!-- Header minimalista -->
      <header class="fixed top-0 inset-x-0 h-14 z-20 bg-white border-b border-[#E5E7EB] flex items-center px-5 gap-3 shadow-sm">

        <!-- Logo + nombre sistema -->
        <div class="flex items-center gap-2.5 shrink-0">
          <img src="assets/imagenes/rr_logo.png" class="h-7 w-auto" alt="R&R" />
          <span class="text-[14px] font-bold text-[#0D1017] hidden sm:inline">R&amp;R Importaciones</span>
        </div>

        <div class="h-5 w-px bg-[#E5E7EB] hidden sm:block"></div>

        <span class="text-[13px] font-semibold text-[#C61D26] hidden sm:inline">Asistente Personal</span>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Nombre del usuario -->
        <span class="text-[13px] text-[#6B7280] hidden sm:inline">
          Bienvenido, <strong class="text-[#0D1017]">{{ nombre() }}</strong>
        </span>

        <div class="h-5 w-px bg-[#E5E7EB]"></div>

        <!-- Botón: Ver sistema completo -->
        <a
          routerLink="/inicio"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] font-semibold text-[#374151] hover:bg-[#F5F6F8] transition-colors whitespace-nowrap"
          title="Ir al sistema completo"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/>
          </svg>
          <span class="hidden sm:inline">Ver sistema completo</span>
          <span class="sm:hidden">Sistema</span>
        </a>

        <!-- Botón: Salir -->
        <button
          (click)="logout()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#6B7280] hover:bg-[#F5F6F8] hover:text-[#374151] transition-colors"
          title="Cerrar sesión"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/>
          </svg>
          <span class="hidden sm:inline">Salir</span>
        </button>
      </header>

      <!-- Contenido de la página -->
      <main class="pt-14 flex-1 flex flex-col">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ModoDonLayoutComponent {
  private auth = inject(AuthService);

  nombre() {
    const u = this.auth.user();
    return u?.nombre ?? u?.username ?? 'Don';
  }

  logout(): void {
    this.auth.logout();
  }
}
