import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-[#F6F5F7] flex relative overflow-hidden">
      <!-- Animated ambient background -->
      <div class="absolute inset-0 pointer-events-none">
        <!-- Gradient base -->
        <div class="absolute inset-0 bg-gradient-to-br from-[#F6F5F7] via-white to-[#FAF8F9]"></div>
        <!-- Floating orbs -->
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
          style="background: radial-gradient(circle, rgba(176,24,31,0.06) 0%, transparent 70%); animation: float 8s ease-in-out infinite;"></div>
        <div class="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style="background: radial-gradient(circle, rgba(176,24,31,0.04) 0%, transparent 70%); animation: float 10s ease-in-out infinite reverse;"></div>
        <div class="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full"
          style="background: radial-gradient(circle, rgba(176,24,31,0.03) 0%, transparent 70%); animation: float 12s ease-in-out infinite 2s;"></div>
        <!-- Subtle grid overlay -->
        <div class="absolute inset-0 opacity-[0.015]"
          style="background-image: linear-gradient(rgba(18,16,18,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(18,16,18,0.1) 1px, transparent 1px); background-size: 60px 60px;"></div>
      </div>

      <div class="flex-1 flex items-center justify-center p-6 relative z-10">
        <div class="w-full max-w-[420px]">
          <!-- Brand -->
          <div class="text-center mb-10 stagger-item">
            <h1 class="font-display text-5xl tracking-[-2px] text-[#121012] leading-none">
              <span class="text-[#B0181F]">R</span>
              <span class="italic text-[#121012]">&amp;</span>
              <span class="text-[#B0181F]">R</span>
            </h1>
            <p class="text-[10px] tracking-[2.5px] font-semibold text-[#7D797F] uppercase mt-2">Importaciones</p>
          </div>

          <!-- Glass card -->
          <div class="glass rounded-2xl p-8 stagger-item" style="animation-delay: 100ms;">
            <h2 class="font-display text-3xl text-[#121012] leading-tight mb-1">Bienvenido</h2>
            <p class="text-sm text-[#7D797F] mb-7">Ingresa tus credenciales para continuar</p>

            @if (error()) {
              <div class="bg-[#FDF2F2] border border-[#F8B4B4] text-[#991B1B] px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2.5">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ error() }}
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="space-y-4.5">
              <div>
                <label for="username" class="block text-xs font-semibold tracking-[0.5px] uppercase text-[#7D797F] mb-1.5">Usuario</label>
                <input
                  id="username"
                  type="text"
                  [(ngModel)]="username"
                  name="username"
                  required
                  class="w-full px-3.5 py-2.5 bg-white/70 backdrop-blur-sm border border-[#E5E1E6] rounded-xl text-sm outline-none transition-all duration-200 placeholder:text-[#A4A0A5] focus:bg-white focus:border-[#B0181F] focus:shadow-[0_0_0_3px_rgba(176,24,31,0.1)]"
                  placeholder="Tu usuario"
                  autocomplete="username"
                />
              </div>

              <div>
                <label for="password" class="block text-xs font-semibold tracking-[0.5px] uppercase text-[#7D797F] mb-1.5">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  class="w-full px-3.5 py-2.5 bg-white/70 backdrop-blur-sm border border-[#E5E1E6] rounded-xl text-sm outline-none transition-all duration-200 placeholder:text-[#A4A0A5] focus:bg-white focus:border-[#B0181F] focus:shadow-[0_0_0_3px_rgba(176,24,31,0.1)]"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="btn-primary w-full py-2.5 rounded-xl text-sm tracking-[0.3px] active:translate-y-[0.5px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Entrando...
                  </span>
                } @else {
                  Entrar
                }
              </button>
            </form>
          </div>

          <p class="text-center text-xs text-[#A4A0A5] mt-8 font-mono-data">R&R Importaciones &copy; {{ currentYear }}</p>
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
  ) {}

  async onSubmit(): Promise<void> {
    if (!this.username || !this.password) {
      this.error.set('Todos los campos son requeridos');
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
