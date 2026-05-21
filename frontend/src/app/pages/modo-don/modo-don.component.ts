import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnInit,
  AfterViewChecked,
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
    <div class="flex flex-col h-[calc(100vh-56px)]" style="background:#E5DDD5;">

      <!-- ══ HEADER TIPO WHATSAPP ══ -->
      <div class="bg-[#C61D26] text-white flex items-center gap-3 px-4 py-3 shadow-md shrink-0">
        <!-- Avatar de Rodri -->
        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30">
          <svg fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-white">
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
          </svg>
        </div>

        <!-- Nombre y estado -->
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-[16px] leading-tight">Rodri</p>
          <p class="text-[12px] text-white/80 leading-tight">
            {{ loading() ? 'escribiendo...' : 'Asistente de R&R · en línea' }}
          </p>
        </div>

        <!-- Provider toggle (discreto) -->
        @if (providers().length > 1) {
          <div class="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            @for (p of providers(); track p.id) {
              <button
                (click)="provider.set(p.id)"
                [disabled]="!p.isAvailable"
                class="px-2 py-1 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap"
                [class]="provider() === p.id
                  ? 'bg-white text-[#C61D26]'
                  : p.isAvailable ? 'text-white/70 hover:text-white' : 'text-white/30 cursor-not-allowed'"
              >{{ p.label }}</button>
            }
          </div>
        }

        <!-- Limpiar conversación -->
        @if (!showCards()) {
          <button
            (click)="clearChat()"
            title="Nueva conversación"
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
          </button>
        }
      </div>

      <!-- ══ ÁREA DE CHAT (fondo tipo WhatsApp) ══ -->
      <div
        #chatContainer
        class="flex-1 overflow-y-auto px-3 py-4 space-y-2"
        style="background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\"><rect width=\"60\" height=\"60\" fill=\"%23E5DDD5\"/><circle cx=\"30\" cy=\"30\" r=\"1.5\" fill=\"%23D4C8BF\" opacity=\"0.6\"/></svg>');"
      >

        <!-- ── Saludo de Rodri (siempre visible) ── -->
        <div class="flex items-end gap-2 max-w-[82%]">
          <div class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mb-0.5">
            <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
            </svg>
          </div>
          <div class="wa-bubble-received">
            <p class="text-[15px] leading-relaxed text-[#111827]">
              {{ greeting() }}, <strong>Don {{ nombre() }}</strong> 👋<br>
              Soy Rodri. Pregúnteme lo que quiera del negocio — trámites, cobros, carros, lo que sea.
            </p>
            <span class="wa-time">{{ horaActual() }}</span>
          </div>
        </div>

        <!-- ── Tarjetas rápidas (solo antes del primer mensaje) ── -->
        @if (showCards()) {
          <div class="flex items-end gap-2 max-w-[82%]">
            <div class="w-7 h-7 shrink-0"></div><!-- spacer para alinear con avatar -->
            <div class="wa-bubble-received">
              <p class="text-[14px] text-[#555] mb-3">¿Por dónde empezamos?</p>
              <div class="grid grid-cols-2 gap-2">
                @for (card of quickCards; track card.question) {
                  <button
                    (click)="sendCard(card.question)"
                    class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#E0D8D0] hover:border-[#C61D26] hover:bg-[#FFF5F5] active:bg-[#FFE8E8] transition-all text-left"
                  >
                    <span class="text-xl shrink-0">{{ card.icon }}</span>
                    <span class="text-[13px] font-medium text-[#333] leading-tight">{{ card.label }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- ── Mensajes del chat ── -->
        @for (msg of visibleMessages(); track $index) {
          @if (msg.role === 'user') {
            <!-- Mensaje enviado (derecha) -->
            <div class="flex justify-end">
              <div class="wa-bubble-sent">
                <p class="text-[15px] leading-relaxed">{{ msg.texto }}</p>
                <div class="flex items-center justify-end gap-1 mt-1">
                  <span class="wa-time text-[#7FB5A0]">{{ hora(msg.timestamp) }}</span>
                  <svg viewBox="0 0 18 11" class="w-4 h-3 fill-[#7FB5A0]">
                    <path d="M17.394.066a.55.55 0 0 0-.577.14L7.25 10.29 1.183 4.62a.55.55 0 0 0-.77.784l6.6 6.2a.55.55 0 0 0 .77-.004l10-10.2a.55.55 0 0 0-.39-.934z"/>
                  </svg>
                </div>
              </div>
            </div>
          } @else {
            <!-- Mensaje recibido (izquierda) -->
            <div class="flex items-end gap-2 max-w-[82%]">
              <div class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mb-0.5">
                <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
                  <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
                </svg>
              </div>
              <div>
                <div
                  class="wa-bubble-received"
                  [class.border-red-200]="msg.error"
                  [class.bg-red-50]="msg.error"
                >
                  <span
                    class="text-[15px] leading-relaxed block"
                    [class.text-red-800]="msg.error"
                    [innerHTML]="format(msg.texto)"
                  ></span>

                  <!-- Tools ejecutadas -->
                  @if (msg.toolCalls?.length && !msg.error) {
                    <div class="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
                      @for (tc of msg.toolCalls!; track tc) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3 h-3 stroke-2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
                          </svg>
                          {{ toolLabel(tc) }}
                        </span>
                      }
                    </div>
                  }

                  <span class="wa-time block text-right mt-1">{{ hora(msg.timestamp) }}</span>
                </div>
              </div>
            </div>
          }
        }

        <!-- ── "Rodri está escribiendo..." ── -->
        @if (loading()) {
          <div class="flex items-end gap-2">
            <div class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0">
              <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
              </svg>
            </div>
            <div class="wa-bubble-received px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#999] animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-2 h-2 rounded-full bg-[#999] animate-bounce" style="animation-delay:200ms"></span>
                <span class="w-2 h-2 rounded-full bg-[#999] animate-bounce" style="animation-delay:400ms"></span>
              </div>
            </div>
          </div>
        }

        <div #chatEnd></div>
      </div>

      <!-- ══ BARRA DE INPUT TIPO WHATSAPP ══ -->
      <div class="bg-[#F0F0F0] px-2 py-2 flex items-end gap-2 shrink-0">

        <!-- Campo de texto estilo WhatsApp -->
        <div class="flex-1 bg-white rounded-[24px] flex items-end px-4 py-2.5 shadow-sm min-h-[46px]">
          <textarea
            #inputRef
            [(ngModel)]="inputText"
            (keydown)="handleKeydown($event)"
            (input)="autoResize($event)"
            rows="1"
            placeholder="Escriba su mensaje..."
            [disabled]="loading()"
            class="flex-1 bg-transparent border-none outline-none text-[15px] text-[#111] placeholder:text-[#9E9E9E] resize-none leading-[1.4] disabled:opacity-50 max-h-32 overflow-y-auto"
            style="min-height: 22px;"
          ></textarea>
        </div>

        <!-- Botón enviar (círculo rojo como WhatsApp pero con color R&R) -->
        <button
          (click)="send()"
          [disabled]="loading() || !inputText.trim()"
          class="w-[46px] h-[46px] bg-[#C61D26] rounded-full flex items-center justify-center shrink-0 shadow-md hover:bg-[#A01520] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-white translate-x-0.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── Burbuja recibida (blanca, lado izquierdo) ── */
    .wa-bubble-received {
      background: #FFFFFF;
      border-radius: 0px 12px 12px 12px;
      padding: 8px 12px 6px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.12);
      position: relative;
      max-width: 100%;
    }

    /* ── Burbuja enviada (verde claro tipo WA, lado derecho) ── */
    .wa-bubble-sent {
      background: #D9FDD3;
      border-radius: 12px 0px 12px 12px;
      padding: 8px 12px 6px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.12);
      max-width: 82%;
    }

    /* ── Hora del mensaje ── */
    .wa-time {
      font-size: 11px;
      color: #8696A0;
      white-space: nowrap;
    }

    /* ── Animación de bounce para los puntos ── */
    @keyframes wa-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .animate-bounce {
      animation: wa-bounce 1s ease infinite;
    }
  `],
})
export class ModoDonComponent implements OnInit, AfterViewChecked {
  private auth = inject(AuthService);
  private rodriService = inject(RodriService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('chatEnd') chatEnd!: ElementRef;
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('inputRef') inputRef!: ElementRef<HTMLTextAreaElement>;

  providers = signal<RodriProviderInfo[]>([]);
  provider = signal('openai');
  loading = signal(false);
  inputText = '';

  private allMessages = signal<ChatMessage[]>([]);
  private shouldScrollToBottom = false;

  showCards = computed(() => this.allMessages().length === 0);

  // Solo mensajes no-bienvenida para el chat
  visibleMessages = computed(() => this.allMessages());

  readonly quickCards: QuickCard[] = [
    { icon: '💰', label: '¿Quién me debe?',            question: '¿Quién me debe dinero? Dime los clientes con saldo pendiente.' },
    { icon: '🚗', label: '¿Dónde están los carros?',   question: '¿Dónde están los carros? Dime el estado de los trámites activos.' },
    { icon: '📋', label: '¿Qué falta?',                question: '¿Qué está pendiente o atascado? ¿Qué documentos faltan?' },
    { icon: '✅', label: '¿Quién ya pagó?',            question: '¿Quién ha pagado esta semana? Muéstrame los últimos pagos.' },
    { icon: '📊', label: '¿Cómo vamos hoy?',           question: '¿Cómo vamos hoy? Dame un resumen de todo el negocio.' },
    { icon: '🔔', label: '¿Hay algo urgente?',         question: '¿Hay algo urgente que deba saber? Alertas, retrasos, cobros vencidos.' },
  ];

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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScrollToBottom = false;
    }
  }

  nombre(): string {
    return this.auth.user()?.nombre ?? 'Ricardo';
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '¡Buenos días';
    if (h >= 12 && h < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  }

  horaActual(): string {
    return this.hora(new Date());
  }

  hora(date: Date): string {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  sendCard(question: string): void {
    if (this.loading()) return;
    this.sendMessage(question);
  }

  send(): void {
    const texto = this.inputText.trim();
    if (!texto || this.loading()) return;
    this.inputText = '';
    // Reset textarea height
    if (this.inputRef?.nativeElement) {
      this.inputRef.nativeElement.style.height = 'auto';
    }
    this.sendMessage(texto);
  }

  handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
  }

  clearChat(): void {
    this.allMessages.set([]);
    this.inputText = '';
  }

  toolLabel(name: string): string {
    const labels: Record<string, string> = {
      listar_cotizaciones:              'Cotizaciones revisadas',
      obtener_cotizacion:               'Cotización consultada',
      calcular_cotizacion:              'Cálculo realizado',
      listar_tramites:                  'Trámites revisados',
      listar_clientes:                  'Clientes consultados',
      obtener_alertas:                  'Alertas revisadas',
      consultar_deudores:               'Deudores consultados',
      consultar_pagos_recientes:        'Pagos revisados',
      consultar_ubicacion_vehiculos:    'Ubicación de carros revisada',
      consultar_documentos_pendientes:  'Pendientes revisados',
    };
    return labels[name] ?? name;
  }

  format(texto: string): SafeHtml {
    const html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-[13px] font-mono">$1</code>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private sendMessage(texto: string): void {
    this.allMessages.update(msgs => [...msgs, {
      role: 'user',
      texto,
      timestamp: new Date(),
    }]);
    this.loading.set(true);
    this.shouldScrollToBottom = true;

    const historial: RodriMessage[] = this.allMessages()
      .slice(0, -1)
      .slice(-10)
      .map(m => ({ role: m.role, texto: m.texto }));

    this.rodriService.chat(texto, historial, this.provider()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.allMessages.update(msgs => [...msgs, {
          role: 'model',
          texto: res.respuesta,
          timestamp: new Date(),
          error: res.error,
          toolCalls: res.toolCallsEjecutados?.length ? res.toolCallsEjecutados : undefined,
        }]);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.loading.set(false);
        this.allMessages.update(msgs => [...msgs, {
          role: 'model',
          texto: 'Oiga Don Ricardo, no pude conectarme ahorita. ¿Le puedo ayudar en algo más?',
          timestamp: new Date(),
          error: true,
        }]);
        this.shouldScrollToBottom = true;
      },
    });
  }
}
