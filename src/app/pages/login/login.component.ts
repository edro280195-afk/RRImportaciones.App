import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex" style="font-family: var(--font-body);">

      <!-- ── Left panel — brand dark ── -->
      <div class="hidden lg:flex flex-col w-[420px] shrink-0 relative overflow-hidden"
           style="background: #0D1017;">

        <!-- Ambient blobs -->
        <div class="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full float-anim-1"
             style="background: radial-gradient(circle, rgba(198,29,38,0.12) 0%, transparent 65%); pointer-events:none;"></div>
        <div class="absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full float-anim-2"
             style="background: radial-gradient(circle, rgba(198,29,38,0.07) 0%, transparent 65%); pointer-events:none;"></div>

        <!-- Grid overlay -->
        <div class="absolute inset-0 opacity-[0.03]"
             style="background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 40px 40px; pointer-events:none;"></div>

        <!-- Content -->
        <div class="relative z-10 flex flex-col h-full p-10">
          <!-- Logo -->
          <div class="flex items-center gap-3 mb-auto">
            <div class="w-8 h-8 rounded-[8px] bg-[#C61D26] flex items-center justify-center shadow-[0_4px_16px_rgba(198,29,38,0.45)]">
              <span class="text-white font-bold text-[12px]" style="font-family: var(--font-body);">RR</span>
            </div>
            <div>
              <p class="text-white font-semibold text-[14px] leading-none tracking-[-0.3px]">RR Importaciones</p>
              <p class="text-white/30 text-[10px] mt-0.5 font-medium tracking-widest uppercase">Sistema</p>
            </div>
          </div>

          <!-- Hero text -->
          <div class="mb-auto">
            <h1 class="text-white font-semibold text-[32px] leading-[1.15] tracking-[-0.8px] mb-4">
              Gestión de<br>
              importaciones<br>
            </h1>
            <p class="text-white/40 text-[14px] leading-relaxed max-w-[280px]">
              Trámites, cobros, clientes y finanzas — todo en un solo lugar.
            </p>
          </div>

          <!-- Stat chips -->
          <!-- <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);">
              <div class="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" style="box-shadow: 0 0 6px rgba(74,222,128,0.7);"></div>
            </div>
          </div> -->
        </div>
      </div>

      <!-- ── Right panel — form ── -->
      <div class="flex-1 flex items-center justify-center p-8" style="background: #FFFFFF;">
        <div class="w-full max-w-[360px]">

          <!-- Mobile logo (hidden on lg) -->
          <div class="lg:hidden flex items-center gap-2.5 mb-8">
            <div class="w-7 h-7 rounded-[7px] bg-[#C61D26] flex items-center justify-center">
              <span class="text-white font-bold text-[11px]">RR</span>
            </div>
            <p class="font-semibold text-[14px] text-[#0D1017]">RR Importaciones</p>
          </div>

          <div class="stagger-item">
            <h2 class="font-semibold text-[22px] text-[#0D1017] tracking-[-0.4px] leading-tight mb-1">
              Bienvenido de vuelta
            </h2>
            <p class="text-[13.5px] text-[#6B717F] mb-7">Ingresa tus credenciales para continuar.</p>
          </div>

          <!-- Card -->
          <div class="rounded-2xl p-6 stagger-item"
               style="background: #FFFFFF; border: 1px solid #E4E7EC; box-shadow: 0 1px 3px rgba(13,16,23,0.06), 0 8px 32px rgba(13,16,23,0.04); animation-delay: 60ms;">

            @if (error()) {
              <div class="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[13px] mb-5"
                   style="background: #FFF1F1; border: 1px solid #FFC5C5; color: #7F1D1D;">
                <svg class="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ error() }}
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- Usuario -->
              <div>
                <label for="username" class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  [(ngModel)]="username"
                  name="username"
                  required
                  placeholder="Tu usuario"
                  autocomplete="username"
                  class="w-full px-3.5 py-2.5 text-[13.5px] text-[#0D1017] rounded-xl outline-none transition-all duration-150 placeholder:text-[#9EA3AE]"
                  style="background: #F5F6F8; border: 1px solid #E4E7EC;"
                  (focus)="onFocus($event)"
                  (blur)="onBlur($event)"
                />
              </div>

              <!-- Contraseña -->
              <div>
                <label for="password" class="block text-[11px] font-semibold text-[#4B5162] uppercase tracking-[0.6px] mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="w-full px-3.5 py-2.5 text-[13.5px] text-[#0D1017] rounded-xl outline-none transition-all duration-150 placeholder:text-[#9EA3AE]"
                  style="background: #F5F6F8; border: 1px solid #E4E7EC;"
                  (focus)="onFocus($event)"
                  (blur)="onBlur($event)"
                />
              </div>

              <!-- Submit -->
              <button
                type="submit"
                id="login-submit"
                [disabled]="loading()"
                class="btn-primary w-full py-2.5 rounded-xl text-[13.5px] font-medium mt-1"
                style="letter-spacing: -0.1px;"
              >
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Entrando…
                  </span>
                } @else {
                  Entrar al sistema
                }
              </button>
            </form>
          </div>

          <p class="text-center text-[11.5px] text-[#9EA3AE] mt-6 font-mono-data">
            © {{ currentYear }} RR Importaciones
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  currentYear = new Date().getFullYear();

  constructor(
    private auth: AuthService,
    private router: Router,
  ) { }

  onFocus(e: FocusEvent): void {
    const el = e.target as HTMLInputElement;
    el.style.background = '#FFFFFF';
    el.style.borderColor = '#C61D26';
    el.style.boxShadow = '0 0 0 3px rgba(198,29,38,0.10)';
  }

  onBlur(e: FocusEvent): void {
    const el = e.target as HTMLInputElement;
    el.style.background = '#F5F6F8';
    el.style.borderColor = '#E4E7EC';
    el.style.boxShadow = 'none';
  }

  async onSubmit(): Promise<void> {
    if (!this.username || !this.password) {
      this.error.set('Completa todos los campos');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => this.router.navigate(['/inicio']),
      error: (err) => { this.error.set(err.message); this.loading.set(false); },
    });
  }
}
