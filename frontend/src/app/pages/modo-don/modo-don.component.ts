import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnInit,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { RodriService, RodriMessage, RodriProviderInfo } from '../../services/rodri.service';

interface ChatMessage {
  role: 'user' | 'model';
  texto: string;
  timestamp: Date;
  error?: boolean;
  isWelcome?: boolean;
  toolCalls?: string[];
}

interface QuickCard {
  icon: string;
  label: string;
  question: string;
}

@Component({
  selector: 'app-modo-don',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col h-[calc(100vh-56px)]">

      <!-- ══ TARJETAS RÁPIDAS (visibles solo antes del primer mensaje) ══ -->
      @if (showCards()) {
        <div class="px-4 sm:px-8 pt-6 sm:pt-10 pb-4 animate-fade-in">

          <!-- Saludo -->
          <div class="text-center mb-6 sm:mb-8">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C61D26] mb-4 shadow-lg">
              <svg fill="currentColor" viewBox="0 0 24 24" class="w-7 h-7 text-white">
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
              </svg>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-[#0D1017]">
              {{ greeting() }}, Don {{ nombre() }}
            </h1>
            <p class="mt-2 text-[#6B7280] text-[15px]">¿En qué le puedo ayudar hoy?</p>
          </div>

          <!-- Grid de tarjetas -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
            @for (card of quickCards; track card.question) {
              <button
                (click)="sendCard(card.question)"
                class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#C61D26] hover:shadow-md transition-all duration-200 text-center cursor-pointer"
              >
                <span class="text-3xl sm:text-4xl">{{ card.icon }}</span>
                <span class="text-[13px] sm:text-[14px] font-semibold text-[#374151] group-hover:text-[#C61D26] leading-tight transition-colors">{{ card.label }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- ══ ÁREA DE MENSAJES ══ -->
      <div
        #chatContainer
        class="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4"
        [class.pt-0]="!showCards()"
      >
        @for (msg of messages(); track $index) {
          @if (!msg.isWelcome) {
            @if (msg.role === 'user') {
              <div class="flex justify-end">
                <div class="max-w-[85%] sm:max-w-[70%] px-4 py-3 bg-[#C61D26] text-white text-[14px] sm:text-[15px] rounded-2xl rounded-br-sm leading-relaxed shadow-sm">
                  {{ msg.texto }}
                </div>
              </div>
            } @else {
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <svg fill="currentColor" viewBox="0 0 24 24" class="w-[14px] h-[14px] text-white">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
                  </svg>
                </div>
                <div class="max-w-[85%] sm:max-w-[70%]">
                  <div
                    class="px-4 py-3 text-[14px] sm:text-[15px] rounded-2xl rounded-bl-sm leading-relaxed shadow-sm"
                    [class]="msg.error
                      ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                      : 'bg-white border border-[#E5E7EB] text-[#0D1017]'"
                  >
                    <span [innerHTML]="format(msg.texto)"></span>
                  </div>

                  @if (msg.toolCalls && msg.toolCalls.length > 0 && !msg.error) {
                    <div class="mt-1.5 flex flex-wrap gap-1">
                      @for (tc of msg.toolCalls; track tc) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0F2F5] text-[11px] text-[#6B7280] font-medium">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3 h-3 stroke-[1.8]">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
                          </svg>
                          {{ toolLabel(tc) }}
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          }
        }

        <!-- Indicador de carga -->
        @if (loading()) {
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 shadow-sm">
              <svg fill="currentColor" viewBox="0 0 24 24" class="w-[14px] h-[14px] text-white">
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
              </svg>
            </div>
            <div class="px-4 py-3 bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm shadow-sm">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-[#C61D26] rounded-full animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-2.5 h-2.5 bg-[#C61D26] rounded-full animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-2.5 h-2.5 bg-[#C61D26] rounded-full animate-bounce" style="animation-delay:300ms"></span>
                <span class="ml-1 text-[12px] text-[#8B93A1]">Consultando el sistema...</span>
              </div>
            </div>
          </div>
        }

        <div #chatEnd></div>
      </div>

      <!-- ══ BARRA DE INPUT ══ -->
      <div class="shrink-0 bg-white border-t border-[#E5E7EB] px-4 sm:px-8 py-3 sm:py-4">

        <!-- Provider toggle + Limpiar (solo visible cuando hay mensajes) -->
        @if (!showCards()) {
          <div class="flex items-center gap-2 mb-2.5">
            @if (providers().length > 1) {
              <div class="flex items-center gap-1 bg-[#F5F6F8] rounded-lg p-0.5">
                @for (p of providers(); track p.id) {
                  <button
                    (click)="provider.set(p.id)"
                    [disabled]="!p.isAvailable"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap"
                    [class]="provider() === p.id
                      ? 'bg-white text-[#0D1017] shadow-sm'
                      : p.isAvailable
                        ? 'text-[#8B93A1] hover:text-[#0D1017]'
                        : 'text-[#D0D4DC] cursor-not-allowed'"
                  >{{ p.label }}</button>
                }
              </div>
            }
            <button
              (click)="clearChat()"
              class="ml-auto flex items-center gap-1.5 text-[12px] text-[#8B93A1] hover:text-[#374151] transition-colors"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-[1.8]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
              </svg>
              Nueva consulta
            </button>
          </div>
        }

        <!-- Input -->
        <div class="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            [(ngModel)]="inputText"
            (keydown)="handleKeydown($event)"
            rows="1"
            placeholder="Escríbale a Rodri..."
            [disabled]="loading()"
            class="flex-1 resize-none bg-[#F5F6F8] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[14px] sm:text-[15px] text-[#0D1017] outline-none focus:border-[#C61D26] focus:ring-2 focus:ring-[#C61D26]/10 disabled:opacity-50 placeholder:text-[#9CA3AF] transition-colors leading-relaxed"
          ></textarea>
          <button
            (click)="send()"
            [disabled]="loading() || !inputText.trim()"
            class="w-11 h-11 sm:w-12 sm:h-12 bg-[#C61D26] text-white rounded-xl flex items-center justify-center hover:bg-[#A01520] disabled:opacity-40 transition-colors shrink-0 shadow-sm"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"/>
            </svg>
          </button>
        </div>

        <p class="mt-2 text-[11px] text-center text-[#C0C6D0]">
          Rodri puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }
  `],
})
export class ModoDonComponent implements OnInit {
  private auth = inject(AuthService);
  private rodriService = inject(RodriService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('chatEnd') chatEnd!: ElementRef;
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  providers = signal<RodriProviderInfo[]>([]);
  provider = signal('openai');
  loading = signal(false);
  inputText = '';

  messages = signal<ChatMessage[]>([{
    role: 'model',
    texto: '',
    timestamp: new Date(),
    isWelcome: true,
  }]);

  showCards = computed(() => this.messages().length === 1);

  readonly quickCards: QuickCard[] = [
    { icon: '💰', label: '¿Quién me debe?',            question: '¿Quién me debe dinero? Muéstrame los clientes con saldo pendiente.' },
    { icon: '🚗', label: '¿Dónde están los vehículos?', question: '¿Dónde están los vehículos? Muéstrame el estado de todos los trámites activos.' },
    { icon: '📋', label: '¿Qué falta?',                question: '¿Qué está pendiente? ¿Dónde estamos atascados o qué documentos faltan?' },
    { icon: '✅', label: '¿Quién ya pagó?',            question: '¿Quién ha pagado recientemente? Muéstrame los últimos pagos recibidos.' },
    { icon: '📊', label: '¿Cómo vamos hoy?',           question: '¿Cómo vamos hoy? Dame un resumen del negocio: trámites, cobros y alertas.' },
    { icon: '🔔', label: '¿Qué alertas hay?',          question: '¿Hay algo urgente o que me deba preocupar? Muéstrame las alertas del sistema.' },
  ];

  constructor() {
    effect(() => {
      if (this.messages().length > 1) {
        this.scrollToBottom();
      }
    });
  }

  ngOnInit(): void {
    this.rodriService.getProviders().subscribe({
      next: (res) => {
        const available = res.providers.filter(p => p.isAvailable);
        this.providers.set(available);
        const def = res.providers.find(p => p.id === res.default);
        if (def?.isAvailable) this.provider.set(def.id);
        else if (available.length > 0) this.provider.set(available[0].id);
      },
    });
  }

  nombre(): string {
    return this.auth.user()?.nombre ?? this.auth.user()?.username ?? 'Ricardo';
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '¡Buenos días';
    if (h >= 12 && h < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  }

  sendCard(question: string): void {
    if (this.loading()) return;
    this.sendMessage(question);
  }

  send(): void {
    const texto = this.inputText.trim();
    if (!texto || this.loading()) return;
    this.inputText = '';
    this.sendMessage(texto);
  }

  handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  clearChat(): void {
    this.messages.set([{ role: 'model', texto: '', timestamp: new Date(), isWelcome: true }]);
    this.inputText = '';
  }

  toolLabel(name: string): string {
    const labels: Record<string, string> = {
      listar_cotizaciones:          'Cotizaciones consultadas',
      obtener_cotizacion:           'Cotización consultada',
      calcular_cotizacion:          'Cálculo fiscal ejecutado',
      listar_tramites:              'Trámites consultados',
      listar_clientes:              'Clientes consultados',
      obtener_alertas:              'Alertas consultadas',
      consultar_deudores:           'Deudores consultados',
      consultar_pagos_recientes:    'Pagos consultados',
      consultar_ubicacion_vehiculos:'Vehículos consultados',
      consultar_documentos_pendientes: 'Pendientes consultados',
    };
    return labels[name] ?? name;
  }

  format(texto: string): SafeHtml {
    const html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#F0F2F5] px-1 rounded text-[13px] font-mono">$1</code>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private sendMessage(texto: string): void {
    this.messages.update(msgs => [...msgs, { role: 'user', texto, timestamp: new Date() }]);
    this.loading.set(true);

    const historial: RodriMessage[] = this.messages()
      .slice(0, -1)
      .filter(m => !m.isWelcome)
      .slice(-10)
      .map(m => ({ role: m.role, texto: m.texto }));

    this.rodriService.chat(texto, historial, this.provider()).subscribe({
      next: (res) => {
        this.loading.set(false);
        const toolCalls = res.toolCallsEjecutados?.length ? res.toolCallsEjecutados : undefined;
        this.messages.update(msgs => [...msgs, {
          role: 'model',
          texto: res.respuesta,
          timestamp: new Date(),
          error: res.error,
          toolCalls,
        }]);
        this.scrollToBottom();
      },
      error: () => {
        this.loading.set(false);
        this.messages.update(msgs => [...msgs, {
          role: 'model',
          texto: 'No pude conectarme. Intenta de nuevo.',
          timestamp: new Date(),
          error: true,
        }]);
        this.scrollToBottom();
      },
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }
}
