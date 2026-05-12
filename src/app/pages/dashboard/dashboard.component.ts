import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div>
      <!-- Page head -->
      <div class="flex items-end justify-between mb-7 gap-6 stagger-item">
        <div>
          <h1 class="font-display text-[46px] leading-none tracking-[-1.5px] text-[#121012] mb-1">
            Bienvenido <em class="italic text-[#B0181F] not-italic">de vuelta</em>
          </h1>
          <p class="text-[13.5px] text-[#7D797F]">
            <strong class="font-semibold text-[#585459] font-mono-data">{{ today }}</strong> · Sin trámites activos
          </p>
        </div>
        <button class="btn-primary inline-flex items-center gap-[7px] px-[18px] py-2.5 rounded-xl text-[13.5px] active:translate-y-[0.5px]">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nuevo trámite
        </button>
      </div>

      <!-- Metric cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <!-- Featured card — solid brand, no gradient -->
        <div class="rounded-2xl p-5 bg-gradient-to-br from-[#B0181F] to-[#931218] text-white relative overflow-hidden stagger-item" style="box-shadow: var(--shadow-glow-red-lg);">
          <!-- Subtle ambient pattern -->
          <div class="absolute inset-0 opacity-[0.04]"
            style="background-image: radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 50%, white 0%, transparent 50%);">
          </div>
          <div class="flex justify-between items-start mb-3.5 relative">
            <span class="text-[11px] font-semibold tracking-[1px] uppercase text-white/70">Activos</span>
            <svg viewBox="0 0 56 56" class="w-14 h-14">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="5"/>
              <circle cx="28" cy="28" r="22" fill="none" stroke="white" stroke-width="5"
                stroke-dasharray="138.23" stroke-dashoffset="51.84"
                transform="rotate(-90 28 28)" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="font-display text-[44px] leading-none tracking-[-2px] mb-1.5 relative">
            0 <span class="font-[Onest] text-[13px] font-semibold text-white/60 align-baseline">trámites</span>
          </p>
          <div class="flex items-center justify-between text-[12px] text-white/70 relative">
            <span>0 en proceso · 0 pendientes</span>
          </div>
        </div>

        <!-- Cobrado -->
        <div class="card-elevated rounded-2xl p-5 hover:-translate-y-px stagger-item" style="animation-delay: 60ms;">
          <div class="flex justify-between items-start mb-3.5">
            <span class="text-[11px] font-semibold tracking-[1px] uppercase text-[#7D797F]">Cobrado este mes</span>
            <div class="w-8 h-8 rounded-lg bg-[#FDF2F2] text-[#B0181F] flex items-center justify-center">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
          </div>
          <p class="font-display text-[44px] leading-none tracking-[-2px] text-[#231F23] mb-1.5">
            <span class="text-[22px] text-[#A4A0A5] font-normal">$</span>0
          </p>
          <div class="flex items-center justify-between text-[12px] text-[#7D797F]">
            <span>De $0 facturados</span>
          </div>
        </div>

        <!-- Por cobrar -->
        <div class="card-elevated rounded-2xl p-5 hover:-translate-y-px stagger-item" style="animation-delay: 120ms;">
          <div class="flex justify-between items-start mb-3.5">
            <span class="text-[11px] font-semibold tracking-[1px] uppercase text-[#7D797F]">Por cobrar</span>
            <div class="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#92400E] flex items-center justify-center">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <p class="font-display text-[44px] leading-none tracking-[-2px] text-[#231F23] mb-1.5">
            <span class="text-[22px] text-[#A4A0A5] font-normal">$</span>0
          </p>
          <div class="flex items-center justify-between text-[12px] text-[#7D797F]">
            <span>0 clientes con saldo</span>
          </div>
        </div>

        <!-- Vehículos en patio -->
        <div class="card-elevated rounded-2xl p-5 hover:-translate-y-px stagger-item" style="animation-delay: 180ms;">
          <div class="flex justify-between items-start mb-3.5">
            <span class="text-[11px] font-semibold tracking-[1px] uppercase text-[#7D797F]">Vehículos en patio</span>
            <div class="w-8 h-8 rounded-lg bg-[#F3F1F3] text-[#585459] flex items-center justify-center">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
          </div>
          <p class="font-display text-[44px] leading-none tracking-[-2px] text-[#231F23] mb-1.5">
            0 <span class="font-[Onest] text-[13px] font-semibold text-[#A4A0A5] align-baseline">unidades</span>
          </p>
          <div class="flex items-center justify-between text-[12px] text-[#7D797F]">
            <span>Tiempo prom. — días</span>
          </div>
        </div>
      </div>

      <!-- Requires attention — glass card -->
      <div class="glass-card rounded-2xl p-6 stagger-item" style="animation-delay: 240ms;">
        <h3 class="text-[13px] font-semibold text-[#585459] flex items-center gap-2 mb-1">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 text-[#F59E0B] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
          Requiere atención
        </h3>
        <div class="text-center py-16 text-[#A4A0A5]">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-10 h-10 mx-auto mb-3 text-[#D1FAE5] stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="text-sm">No hay asuntos pendientes</p>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
