import { Component, inject, signal, ViewChild, ElementRef, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RodriStateService } from '../../services/rodri-state.service';
import { RodriService, RodriMessage, RodriProviderInfo } from '../../services/rodri.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  role: 'user' | 'model';
  texto: string;
  timestamp: Date;
  error?: boolean;
  isWelcome?: boolean;
  toolCalls?: string[];
  feedback?: 'up' | 'down' | null;
  provider?: string;
  providerLabel?: string;
}

interface SuggestionGroup {
  label: string;
  questions: string[];
}

@Component({
  selector: 'app-rodri-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (auth.isAdmin()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40 bg-black/25 transition-opacity duration-300"
        [style.opacity]="state.isOpen() ? '1' : '0'"
        [style.pointer-events]="state.isOpen() ? 'auto' : 'none'"
        (click)="state.close()"
      ></div>

      <!-- Panel -->
      <div
        class="fixed top-0 right-0 h-screen w-[420px] z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out"
        [style.transform]="state.isOpen() ? 'translateX(0)' : 'translateX(100%)'"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 px-5 py-4 bg-white border-b border-[#F0F2F5] shrink-0">
          <div class="w-8 h-8 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0">
            <svg fill="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] text-white">
              <path
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-[14px] font-semibold text-[#0D1017] leading-tight">Rodri</p>
            <p class="text-[11px] text-[#8B93A1] truncate">
              Asistente IA &middot; R&amp;R Importaciones
            </p>
          </div>

          <!-- Provider toggle -->
          @if (providers().length > 0) {
            <div class="flex items-center gap-1 bg-[#F5F6F8] rounded-lg p-0.5">
              @for (p of providers(); track p.id) {
                <button
                  (click)="selectProvider(p.id)"
                  [disabled]="!p.isAvailable"
                  class="px-2 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap"
                  [class]="
                    provider() === p.id
                      ? 'bg-white text-[#0D1017] shadow-sm'
                      : p.isAvailable
                        ? 'text-[#8B93A1] hover:text-[#0D1017]'
                        : 'text-[#D0D4DC] cursor-not-allowed'
                  "
                  [title]="
                    p.hasTools ? 'Con herramientas (cotizaciones, consultas)' : 'Solo chat simple'
                  "
                >
                  {{ p.label }}
                </button>
              }
            </div>
          }

          <button
            (click)="clearChat()"
            title="Limpiar conversación"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-[#8B93A1] hover:bg-[#F5F6F8] hover:text-[#6B717F] transition-colors"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              class="w-[14px] h-[14px] stroke-[1.8]"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
          <button
            (click)="state.close()"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-[#8B93A1] hover:bg-[#F5F6F8] hover:text-[#0D1017] transition-colors"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          @for (msg of messages(); track $index) {
            @if (msg.role === 'user') {
              <div class="flex justify-end">
                <div
                  class="max-w-[85%] px-4 py-2.5 bg-[#C61D26] text-white text-[13px] rounded-2xl rounded-br-sm leading-relaxed"
                >
                  {{ msg.texto }}
                </div>
              </div>
            } @else {
              <div class="flex items-start gap-2.5">
                <div
                  class="w-6 h-6 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mt-0.5"
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" class="w-[11px] h-[11px] text-white">
                    <path
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                    />
                  </svg>
                </div>
                <div class="max-w-[85%]">
                  <div
                    class="px-4 py-2.5 text-[13px] rounded-2xl rounded-bl-sm leading-relaxed shadow-sm"
                    [class]="
                      msg.error
                        ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                        : 'bg-white border border-[#F0F2F5] text-[#0D1017]'
                    "
                  >
                    <span [innerHTML]="format(msg.texto)"></span>
                  </div>

                  <!-- Tool calls executed indicator -->
                  @if (msg.toolCalls && msg.toolCalls.length > 0 && !msg.error) {
                    <div class="mt-1 flex flex-wrap gap-1">
                      @for (tc of msg.toolCalls; track tc) {
                        <span
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0F2F5] text-[10px] text-[#6B7280] font-medium"
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            class="w-3 h-3 stroke-[1.8]"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                          {{ toolLabel(tc) }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Provider badge -->
                  @if (msg.provider && !msg.isWelcome && !msg.error) {
                    <div class="mt-1 ml-0.5">
                      <span
                        class="text-[10px] font-medium"
                        [class]="msg.provider === 'gemini' ? 'text-[#34A853]' : 'text-[#0D1017]'"
                        >{{ msg.providerLabel || msg.provider }}</span
                      >
                    </div>
                  }

                  <!-- Feedback buttons -->
                  @if (!msg.error && !msg.isWelcome) {
                    <div class="mt-1 flex items-center gap-1 ml-1">
                      <button
                        (click)="feedback(msg, 'up')"
                        class="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        [class]="
                          msg.feedback === 'up'
                            ? 'text-[#C61D26] bg-[#FEF2F2]'
                            : 'text-[#B0B8C4] hover:text-[#6B7280] hover:bg-[#F0F2F5]'
                        "
                        title="Respuesta útil"
                      >
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          class="w-3.5 h-3.5 stroke-[1.8]"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z"
                          />
                        </svg>
                      </button>
                      <button
                        (click)="feedback(msg, 'down')"
                        class="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        [class]="
                          msg.feedback === 'down'
                            ? 'text-[#C61D26] bg-[#FEF2F2]'
                            : 'text-[#B0B8C4] hover:text-[#6B7280] hover:bg-[#F0F2F5]'
                        "
                        title="Respuesta incorrecta"
                      >
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          class="w-3.5 h-3.5 stroke-[1.8]"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 0h5.764M17.25 15.25h1.5a1.5 1.5 0 0 0 1.5-1.5V7.5a1.5 1.5 0 0 0-1.5-1.5h-1.5a1.5 1.5 0 0 0-1.5 1.5v6.25a1.5 1.5 0 0 0 1.5 1.5Z"
                          />
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          }

          <!-- Loading indicator -->
          @if (loading()) {
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" class="w-[11px] h-[11px] text-white">
                  <path
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                </svg>
              </div>
              <div
                class="px-4 py-3 bg-white border border-[#F0F2F5] rounded-2xl rounded-bl-sm shadow-sm"
              >
                <div class="flex items-center gap-2">
                  <div class="flex gap-1.5 items-center">
                    <span
                      class="w-2 h-2 bg-[#C61D26] rounded-full animate-bounce"
                      style="animation-delay:0ms"
                    ></span>
                    <span
                      class="w-2 h-2 bg-[#C61D26] rounded-full animate-bounce"
                      style="animation-delay:150ms"
                    ></span>
                    <span
                      class="w-2 h-2 bg-[#C61D26] rounded-full animate-bounce"
                      style="animation-delay:300ms"
                    ></span>
                  </div>
                  @if (toolRunningLabel()) {
                    <span class="text-[11px] text-[#8B93A1]">{{ toolRunningLabel() }}</span>
                  }
                </div>
              </div>
            </div>
          }

          <div #chatEnd></div>
        </div>

        <!-- Contextual suggestions (only at start) -->
        @if (messages().length === 1 && !loading()) {
          <div class="px-4 pb-3 bg-[#F8FAFC] space-y-3 shrink-0">
            @for (group of contextualSuggestions; track group.label) {
              <div>
                <p
                  class="text-[11px] text-[#8B93A1] font-semibold uppercase tracking-[0.8px] mb-1.5"
                >
                  {{ group.label }}
                </p>
                <div class="space-y-1">
                  @for (q of group.questions; track q) {
                    <button
                      (click)="sendSuggestion(q)"
                      class="w-full text-left px-3 py-2 rounded-xl bg-white border border-[#F0F2F5] text-[12px] text-[#374151] hover:border-[#C61D26] hover:text-[#C61D26] transition-colors shadow-sm"
                    >
                      {{ q }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Input area -->
        <div class="shrink-0 px-4 pt-3 pb-4 bg-white border-t border-[#F0F2F5]">
          <div class="flex items-end gap-2">
            <textarea
              [(ngModel)]="inputText"
              (keydown)="handleKeydown($event)"
              rows="1"
              placeholder="Escribe tu pregunta…"
              [disabled]="loading()"
              class="flex-1 resize-none bg-[#F5F6F8] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] text-[#0D1017] outline-none focus:border-[#C61D26] focus:ring-2 focus:ring-[#C61D26]/10 disabled:opacity-50 placeholder:text-[#8B93A1] transition-colors"
            ></textarea>
            <button
              (click)="send()"
              [disabled]="loading() || !inputText.trim()"
              class="w-10 h-10 bg-[#C61D26] text-white rounded-xl flex items-center justify-center hover:bg-[#A01520] disabled:opacity-40 transition-colors shrink-0"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
          <p class="mt-2 text-[10px] text-center text-[#B0B8C4]">
            Rodri puede cometer errores. Verifica información importante.
          </p>
        </div>
      </div>
    }
  `,
})
export class RodriPanelComponent implements OnInit {
  state = inject(RodriStateService);
  auth = inject(AuthService);
  router = inject(Router);
  private rodriService = inject(RodriService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('chatEnd') chatEnd!: ElementRef;

  providers = signal<RodriProviderInfo[]>([]);
  provider = signal('openai');

  messages = signal<ChatMessage[]>([
    {
      role: 'model',
      texto:
        '¡Hola! Soy **Rodri**, el asistente inteligente de R&R Importaciones.\n\nPuedo ayudarte a consultar trámites, cotizaciones, clientes, pagos y más. También puedo **calcular cotizaciones** al instante.\n\nUsa **GPT‑4** para tareas complejas (cotizaciones, cálculos, consultas con herramientas).\nUsa **Gemini** para preguntas rápidas y simples.',
      timestamp: new Date(),
      isWelcome: true,
    },
  ]);
  loading = signal(false);
  toolRunningLabel = signal('');
  inputText = '';

  constructor() {
    effect(() => {
      if (this.state.isOpen()) {
        this.scrollToBottom();
      }
    });
  }

  ngOnInit(): void {
    this.rodriService.getProviders().subscribe({
      next: res => {
        const available = res.providers.filter(p => p.isAvailable);
        this.providers.set(available);
        const defaultP = res.providers.find(p => p.id === res.default);
        if (defaultP?.isAvailable) {
          this.provider.set(defaultP.id);
        } else if (available.length > 0) {
          this.provider.set(available[0].id);
        }
      },
    });
  }

  selectProvider(id: string): void {
    this.provider.set(id);
  }

  get contextualSuggestions(): SuggestionGroup[] {
    const url = this.router.url;
    const groups: SuggestionGroup[] = [];

    groups.push({
      label: 'General',
      questions: [
        '¿Cuántos trámites tenemos activos?',
        '¿Cuál es el resumen de pagos de este mes?',
        '¿Hay cotizaciones pendientes de respuesta?',
        '¿Qué alertas hay en el sistema?',
      ],
    });

    if (url.includes('/cotizaciones')) {
      groups.unshift({
        label: 'Cotizaciones',
        questions: [
          'Calcula una cotización para un Honda Civic 2020',
          '¿Cuántas cotizaciones están pendientes?',
          '¿Qué cotizaciones están por vencer?',
        ],
      });
    } else if (url.includes('/tramites')) {
      groups.unshift({
        label: 'Trámites',
        questions: [
          '¿Qué trámites están en retención?',
          '¿Cuántos trámites tiene cada cliente?',
          '¿Qué trámites no tienen movimiento?',
        ],
      });
    } else if (url.includes('/clientes')) {
      groups.unshift({
        label: 'Clientes',
        questions: [
          '¿Cuántos clientes tenemos registrados?',
          '¿Qué clientes tienen más trámites activos?',
        ],
      });
    }

    return groups;
  }

  toolLabel(name: string): string {
    const labels: Record<string, string> = {
      listar_cotizaciones: 'Cotizaciones consultadas',
      obtener_cotizacion: 'Cotización consultada',
      calcular_cotizacion: 'Cálculo fiscal ejecutado',
      listar_tramites: 'Trámites consultados',
      listar_clientes: 'Clientes consultados',
      obtener_alertas: 'Alertas consultadas',
    };
    return labels[name] || name;
  }

  feedback(msg: ChatMessage, type: 'up' | 'down'): void {
    msg.feedback = msg.feedback === type ? null : type;
    this.messages.update(msgs => [...msgs]);
  }

  send(): void {
    const texto = this.inputText.trim();
    if (!texto || this.loading()) return;
    this.inputText = '';
    this.sendMessage(texto);
  }

  sendSuggestion(q: string): void {
    if (this.loading()) return;
    this.sendMessage(q);
  }

  handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  clearChat(): void {
    this.messages.set([
      {
        role: 'model',
        texto: 'Conversación reiniciada. ¿En qué te puedo ayudar?',
        timestamp: new Date(),
        isWelcome: true,
      },
    ]);
  }

  format(texto: string): SafeHtml {
    const html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-[#F0F2F5] px-1 rounded text-[12px] font-mono">$1</code>'
      )
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private sendMessage(texto: string): void {
    this.messages.update(msgs => [...msgs, { role: 'user', texto, timestamp: new Date() }]);
    this.loading.set(true);
    this.toolRunningLabel.set('');
    this.scrollToBottom();

    const historial: RodriMessage[] = this.messages()
      .slice(0, -1)
      .filter(m => !m.isWelcome)
      .slice(-10)
      .map(m => ({ role: m.role, texto: m.texto }));

    this.rodriService.chat(texto, historial, this.provider()).subscribe({
      next: res => {
        this.loading.set(false);
        this.toolRunningLabel.set('');

        const toolCalls = res.toolCallsEjecutados?.length ? res.toolCallsEjecutados : undefined;

        this.messages.update(msgs => [
          ...msgs,
          {
            role: 'model',
            texto: res.respuesta,
            timestamp: new Date(),
            error: res.error,
            toolCalls,
            provider: res.provider,
            providerLabel: res.providerLabel,
          },
        ]);
        this.scrollToBottom();
      },
      error: () => {
        this.loading.set(false);
        this.toolRunningLabel.set('');
        this.messages.update(msgs => [
          ...msgs,
          {
            role: 'model',
            texto: 'Lo siento, ocurrió un error al conectarme. Intenta de nuevo.',
            timestamp: new Date(),
            error: true,
          },
        ]);
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
