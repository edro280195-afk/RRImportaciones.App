import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tramite-nuevo',
  standalone: true,
  template: `
    <div style="font-family: var(--font-body);">
      <button
        (click)="router.navigate(['/tramites'])"
        class="flex items-center gap-1.5 text-[12.5px] text-[var(--n-400)] hover:text-[var(--n-900)] transition-colors mb-6"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
        </svg>
        Volver a trámites
      </button>

      <div class="max-w-[480px] mx-auto mt-12 text-center">
        <!-- Icono de flujo -->
        <div class="flex items-center justify-center gap-3 mb-8">
          <div
            class="w-12 h-12 rounded-2xl flex items-center justify-center"
            style="background: var(--blue-soft); color: var(--blue-text);"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
          </div>
          <svg
            class="w-5 h-5 text-[var(--n-300)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          <div
            class="w-12 h-12 rounded-2xl flex items-center justify-center"
            style="background: var(--green-soft); color: var(--green-text);"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
              />
            </svg>
          </div>
        </div>

        <h1 class="font-semibold text-[22px] text-[var(--n-900)] tracking-[-0.4px] mb-3">
          Los trámites nacen de una cotización
        </h1>
        <p class="text-[13.5px] text-[var(--n-500)] leading-relaxed mb-8 max-w-[360px] mx-auto">
          Crea primero la cotización con los precios exactos del SAT. Cuando el cliente la acepte,
          se convierte en trámite con un solo clic.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            (click)="router.navigate(['/cotizaciones/nueva'])"
            class="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px]"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva cotización
          </button>
          <button
            (click)="router.navigate(['/cotizaciones'])"
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-medium border transition-colors duration-150"
            style="border-color: var(--border); color: var(--n-600); background: var(--n-50);"
          >
            Ver cotizaciones activas
          </button>
        </div>
      </div>
    </div>
  `,
})
export class TramiteNuevoComponent {
  router = inject(Router);
}
