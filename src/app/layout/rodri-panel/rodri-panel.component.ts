import { Component, inject, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RodriStateService } from '../../services/rodri-state.service';
import { RodriService, RodriMessage } from '../../services/rodri.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  role: 'user' | 'model';
  texto: string;
  timestamp: Date;
  error?: boolean;
  isWelcome?: boolean;
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
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
          </svg>
        </div>
        <div>
          <p class="text-[14px] font-semibold text-[#0D1017] leading-tight">Rodri</p>
          <p class="text-[11px] text-[#8B93A1]">Asistente IA · R&amp;R Importaciones</p>
        </div>
        <button
          (click)="clearChat()"
          title="Limpiar conversación"
          class="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-[#8B93A1] hover:bg-[#F5F6F8] hover:text-[#6B717F] transition-colors mr-1"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-[15px] h-[15px] stroke-[1.8]">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
        </button>
        <button
          (click)="state.close()"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B93A1] hover:bg-[#F5F6F8] hover:text-[#0D1017] transition-colors"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        @for (msg of messages(); track $index) {
          @if (msg.role === 'user') {
            <div class="flex justify-end">
              <div class="max-w-[85%] px-4 py-2.5 bg-[#C61D26] text-white text-[13px] rounded-2xl rounded-br-sm leading-relaxed">
                {{ msg.texto }}
              </div>
            </div>
          } @else {
            <div class="flex items-start gap-2.5">
              <div class="w-6 h-6 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 24 24" class="w-[11px] h-[11px] text-white">
                  <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
                </svg>
              </div>
              <div
                class="max-w-[85%] px-4 py-2.5 text-[13px] rounded-2xl rounded-bl-sm leading-relaxed shadow-sm"
                [class]="msg.error
                  ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                  : 'bg-white border border-[#F0F2F5] text-[#0D1017]'"
              >
                <span [innerHTML]="format(msg.texto)"></span>
              </div>
            </div>
          }
        }

        <!-- Loading indicator -->
        @if (loading()) {
          <div class="flex items-start gap-2.5">
            <div class="w-6 h-6 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0">
              <svg fill="currentColor" viewBox="0 0 24 24" class="w-[11px] h-[11px] text-white">
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
              </svg>
            </div>
            <div class="px-4 py-3 bg-white border border-[#F0F2F5] rounded-2xl rounded-bl-sm shadow-sm">
              <div class="flex gap-1.5 items-center">
                <span class="w-2 h-2 bg-[#C61D26] rounded-full animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-2 h-2 bg-[#C61D26] rounded-full animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-2 h-2 bg-[#C61D26] rounded-full animate-bounce" style="animation-delay:300ms"></span>
              </div>
            </div>
          </div>
        }

        <div #chatEnd></div>
      </div>

      <!-- Suggested questions (only at start) -->
      @if (messages().length === 1 && !loading()) {
        <div class="px-4 pb-3 bg-[#F8FAFC] space-y-1.5 shrink-0">
          <p class="text-[11px] text-[#8B93A1] font-semibold uppercase tracking-[0.8px] mb-2">Sugerencias</p>
          @for (q of suggestions; track q) {
            <button
              (click)="sendSuggestion(q)"
              class="w-full text-left px-3 py-2 rounded-xl bg-white border border-[#F0F2F5] text-[12px] text-[#374151] hover:border-[#C61D26] hover:text-[#C61D26] transition-colors shadow-sm"
            >{{ q }}</button>
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
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"/>
            </svg>
          </button>
        </div>
        <p class="mt-2 text-[10px] text-center text-[#B0B8C4]">Rodri puede cometer errores. Verifica información importante.</p>
      </div>
    </div>
    } <!-- /if isAdmin -->
  `,
})
export class RodriPanelComponent {
  state = inject(RodriStateService);
  auth = inject(AuthService);
  private rodriService = inject(RodriService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('chatEnd') chatEnd!: ElementRef;

  readonly suggestions = [
    '¿Cuántos trámites tenemos activos?',
    '¿Cuál es el resumen de pagos de este mes?',
    '¿Hay cotizaciones pendientes de respuesta?',
    '¿Qué trámites están en retención?',
  ];

  messages = signal<ChatMessage[]>([{
    role: 'model',
    texto: '¡Hola! Soy **Rodri** 👋, el asistente inteligente de R&R Importaciones.\n\nPuedo ayudarte a consultar el estado de los trámites, revisar pagos del mes, analizar cotizaciones y más. ¿En qué te puedo ayudar?',
    timestamp: new Date(),
    isWelcome: true,
  }]);
  loading = signal(false);
  inputText = '';

  constructor() {
    effect(() => {
      if (this.state.isOpen()) {
        this.scrollToBottom();
      }
    });
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
    this.messages.set([{
      role: 'model',
      texto: 'Conversación reiniciada. ¿En qué te puedo ayudar?',
      timestamp: new Date(),
      isWelcome: true,
    }]);
  }

  format(texto: string): SafeHtml {
    const html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#F0F2F5] px-1 rounded text-[12px] font-mono">$1</code>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private sendMessage(texto: string): void {
    this.messages.update(msgs => [...msgs, { role: 'user', texto, timestamp: new Date() }]);
    this.loading.set(true);
    this.scrollToBottom();

    const historial: RodriMessage[] = this.messages()
      .slice(0, -1)
      .filter(m => !m.isWelcome)
      .slice(-10)
      .map(m => ({ role: m.role, texto: m.texto }));

    this.rodriService.chat(texto, historial).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.messages.update(msgs => [...msgs, {
          role: 'model',
          texto: res.respuesta,
          timestamp: new Date(),
          error: res.error,
        }]);
        this.scrollToBottom();
      },
      error: () => {
        this.loading.set(false);
        this.messages.update(msgs => [...msgs, {
          role: 'model',
          texto: 'Lo siento, ocurrió un error al conectarme. Intenta de nuevo.',
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
