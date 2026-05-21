import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
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
        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30">
          <svg fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-white">
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-semibold text-[16px] leading-tight">Rodri</p>
          <p class="text-[12px] text-white/80 leading-tight">
            @if (isRecording()) { 🎤 escuchando... }
            @else if (isSpeaking()) { 🔊 hablando... }
            @else if (loading()) { escribiendo... }
            @else { Asistente de R&amp;R · en línea }
          </p>
        </div>

        <!-- Toggle voz -->
        @if (speechAvailable()) {
          <button
            (click)="toggleVoice()"
            [title]="voiceEnabled() ? 'Silenciar a Rodri' : 'Activar voz de Rodri'"
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            @if (voiceEnabled()) {
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-white">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
              </svg>
            } @else {
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2 text-white/40">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
              </svg>
            }
          </button>
        }

        <!-- Provider toggle -->
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

      <!-- ══ ÁREA DE CHAT ══ -->
      <div
        #chatContainer
        class="chat-area flex-1 overflow-y-auto px-3 py-4 space-y-2"
      >

        <!-- Saludo de Rodri -->
        <div class="flex items-end gap-2 max-w-[82%]">
          <div class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mb-0.5">
            <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
            </svg>
          </div>
          <div class="wa-bubble-received">
            <p class="text-[15px] leading-relaxed text-[#111827]">
              {{ greeting() }}, <strong>Don {{ nombre() }}</strong> 👋<br>
              Soy Rodri. Pregúnteme lo que quiera del negocio.
              @if (speechAvailable()) {
                <br><span class="text-[13px] text-[#888]">🎤 También puede hablarme — mantenga el botón rojo presionado.</span>
              }
            </p>
            <span class="wa-time">{{ horaActual() }}</span>
          </div>
        </div>

        <!-- Tarjetas rápidas -->
        @if (showCards()) {
          <div class="flex items-end gap-2 max-w-[82%]">
            <div class="w-7 h-7 shrink-0"></div>
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

        <!-- Mensajes -->
        @for (msg of visibleMessages(); track $index) {
          @if (msg.role === 'user') {
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

                  <div class="flex items-center justify-end gap-2 mt-1">
                    @if (!msg.error) {
                      <button
                        (click)="speakMessage(msg.texto)"
                        [title]="isSpeaking() ? 'Detener' : 'Escuchar'"
                        class="text-[#8696A0] hover:text-[#C61D26] transition-colors"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 stroke-2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/>
                        </svg>
                      </button>
                    }
                    <span class="wa-time">{{ hora(msg.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        }

        <!-- Typing indicator -->
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

      <!-- ══ BARRA DE INPUT ══ -->
      <div class="bg-[#F0F0F0] px-2 pb-2 pt-1 shrink-0">

        <!-- Chips de respuesta rápida contextual -->
        @if (suggestedReplies().length > 0 && !loading()) {
          <div class="flex gap-2 overflow-x-auto pb-2 pt-1 px-0.5 scrollbar-hide">
            @for (reply of suggestedReplies(); track reply) {
              <button
                (click)="sendCard(reply)"
                class="shrink-0 px-3 py-1.5 bg-white rounded-full border border-[#C61D26]/40 text-[13px] text-[#C61D26] font-medium whitespace-nowrap shadow-sm hover:bg-[#FFF5F5] active:scale-95 transition-all"
              >
                {{ reply }}
              </button>
            }
          </div>
        }

        <!-- Fila de input + botón -->
        <div class="flex items-end gap-2">

          <!-- Campo de texto -->
          <div class="flex-1 bg-white rounded-[24px] flex items-end px-4 py-2.5 shadow-sm min-h-[46px]">
            <textarea
              #inputRef
              [(ngModel)]="inputText"
              (keydown)="handleKeydown($event)"
              (input)="autoResize($event)"
              rows="1"
              [placeholder]="isRecording() ? '🎤 Escuchando...' : 'Escriba su mensaje...'"
              [readOnly]="isRecording()"
              [disabled]="loading()"
              class="flex-1 bg-transparent border-none outline-none text-[15px] text-[#111] placeholder:text-[#9E9E9E] resize-none leading-[1.4] disabled:opacity-50 max-h-32 overflow-y-auto w-full"
              style="min-height: 22px;"
            ></textarea>
          </div>

          <!-- Botón enviar (cuando hay texto) -->
          @if (inputText.trim() && !isRecording()) {
            <button
              (click)="send()"
              [disabled]="loading()"
              class="w-[46px] h-[46px] bg-[#C61D26] rounded-full flex items-center justify-center shrink-0 shadow-md hover:bg-[#A01520] active:scale-95 transition-all disabled:opacity-40"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-white translate-x-0.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"/>
              </svg>
            </button>
          } @else if (speechAvailable()) {
            <!-- Botón micrófono PTT -->
            <button
              (mousedown)="startRecording($event)"
              (mouseup)="stopRecording($event)"
              (mouseleave)="stopRecordingIfActive()"
              (touchstart)="startRecording($event)"
              (touchend)="stopRecording($event)"
              [disabled]="loading()"
              [title]="isRecording() ? 'Suelte para enviar' : 'Mantenga presionado para hablar'"
              class="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 shadow-md transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed"
              [class]="isRecording()
                ? 'bg-red-700 scale-110 shadow-red-500/60 shadow-lg'
                : 'bg-[#C61D26] hover:bg-[#A01520] active:scale-95'"
            >
              @if (isRecording()) {
                <span class="w-4 h-4 rounded-sm bg-white block"></span>
              } @else {
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-white">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"/>
                </svg>
              }
            </button>
          } @else {
            <!-- Fallback: sin voz disponible, botón enviar siempre -->
            <button
              (click)="send()"
              [disabled]="loading() || !inputText.trim()"
              class="w-[46px] h-[46px] bg-[#C61D26] rounded-full flex items-center justify-center shrink-0 shadow-md hover:bg-[#A01520] active:scale-95 transition-all disabled:opacity-40"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-2 text-white translate-x-0.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"/>
              </svg>
            </button>
          }
        </div>

        <!-- Indicador de grabación -->
        @if (isRecording()) {
          <div class="flex items-center justify-center gap-2 pt-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 recording-pulse"></span>
            <span class="text-[12px] text-red-700 font-medium">Grabando — suelte para enviar</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .wa-bubble-received {
      background: #FFFFFF;
      border-radius: 0px 12px 12px 12px;
      padding: 8px 12px 6px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.12);
      position: relative;
      max-width: 100%;
    }
    .wa-bubble-sent {
      background: #D9FDD3;
      border-radius: 12px 0px 12px 12px;
      padding: 8px 12px 6px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.12);
      max-width: 82%;
    }
    .wa-time {
      font-size: 11px;
      color: #8696A0;
      white-space: nowrap;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar { display: none; }

    @keyframes wa-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .animate-bounce { animation: wa-bounce 1s ease infinite; }

    @keyframes rec-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.4); }
    }
    .recording-pulse { animation: rec-pulse 1s ease infinite; }

    /* Fondo tipo WhatsApp — definido en CSS para evitar que el parser del template
       interprete el </svg> de la data URL como un tag HTML. */
    .chat-area {
      background-color: #E5DDD5;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23E5DDD5'/%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23D4C8BF' opacity='0.6'/%3E%3C/svg%3E");
    }
  `],
})
export class ModoDonComponent implements OnInit, OnDestroy, AfterViewChecked {
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
  visibleMessages = computed(() => this.allMessages());

  // ── VOZ ──
  private recognition: any = null;
  private synth = window.speechSynthesis;
  private voiceList: SpeechSynthesisVoice[] = [];
  private finalTranscript = '';

  isRecording = signal(false);
  isSpeaking = signal(false);
  voiceEnabled = signal(true);
  interimText = signal('');
  speechAvailable = signal(false);

  // ── CHIPS CONTEXTUALES ──
  suggestedReplies = signal<string[]>([]);

  readonly quickCards: QuickCard[] = [
    { icon: '💰', label: '¿Quién me debe?',          question: '¿Quién me debe dinero? Dime los clientes con saldo pendiente.' },
    { icon: '🚗', label: '¿Dónde están los carros?', question: '¿Dónde están los carros? Dime el estado de los trámites activos.' },
    { icon: '📋', label: '¿Qué falta?',              question: '¿Qué está pendiente o atascado? ¿Qué documentos faltan?' },
    { icon: '✅', label: '¿Quién ya pagó?',          question: '¿Quién ha pagado esta semana? Muéstrame los últimos pagos.' },
    { icon: '📊', label: '¿Cómo vamos hoy?',         question: '¿Cómo vamos hoy? Dame un resumen de todo el negocio.' },
    { icon: '🔔', label: '¿Hay algo urgente?',       question: '¿Hay algo urgente que deba saber? Alertas, retrasos, cobros vencidos.' },
  ];

  // ─────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────
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
    this.initSpeech();
  }

  ngOnDestroy(): void {
    this.recognition?.abort();
    this.synth.cancel();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScrollToBottom = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // INIT VOZ
  // ─────────────────────────────────────────────────────────────────────
  private initSpeech(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.speechAvailable.set(true);
      this.setupRecognition(SR);
    }
    const loadVoices = () => { this.voiceList = this.synth.getVoices(); };
    loadVoices();
    if ('onvoiceschanged' in this.synth) {
      (this.synth as any).onvoiceschanged = loadVoices;
    }
  }

  private setupRecognition(SR: any): void {
    this.recognition = new SR();
    this.recognition.lang = 'es-MX';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          this.finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      // Mostrar transcripción en vivo en el textarea
      this.inputText = this.finalTranscript + interim;
      this.interimText.set(interim);
    };

    this.recognition.onend = () => {
      this.isRecording.set(false);
      this.interimText.set('');
      const text = this.finalTranscript.trim();
      this.finalTranscript = '';
      this.inputText = '';
      if (text) {
        this.sendMessage(text);
      }
    };

    this.recognition.onerror = (e: any) => {
      this.isRecording.set(false);
      this.interimText.set('');
      this.finalTranscript = '';
      this.inputText = '';
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        console.warn('Speech recognition error:', e.error);
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // PTT — GRABAR
  // ─────────────────────────────────────────────────────────────────────
  startRecording(event: Event): void {
    event.preventDefault();
    if (!this.recognition || this.loading() || this.isRecording()) return;
    this.stopSpeaking();
    this.suggestedReplies.set([]);
    this.finalTranscript = '';
    this.inputText = '';
    this.isRecording.set(true);
    try { this.recognition.start(); } catch (_) { this.isRecording.set(false); }
  }

  stopRecording(event: Event): void {
    event.preventDefault();
    if (!this.recognition || !this.isRecording()) return;
    this.recognition.stop();
  }

  stopRecordingIfActive(): void {
    if (this.isRecording()) this.recognition?.stop();
  }

  // ─────────────────────────────────────────────────────────────────────
  // TTS — HABLAR
  // ─────────────────────────────────────────────────────────────────────
  speak(text: string): void {
    if (!this.voiceEnabled() || !text) return;
    this.synth.cancel();

    const clean = text
      .replace(/\*\*(.+?)\*\*/gs, '$1')
      .replace(/`[^`]+`/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[*_#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-MX';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const esVoice = this.voiceList.find(v => v.lang === 'es-MX')
      || this.voiceList.find(v => v.lang.startsWith('es-'))
      || this.voiceList.find(v => v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend   = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    this.synth.speak(utterance);
  }

  speakMessage(text: string): void {
    if (this.isSpeaking()) { this.stopSpeaking(); } else { this.speak(text); }
  }

  stopSpeaking(): void {
    this.synth.cancel();
    this.isSpeaking.set(false);
  }

  toggleVoice(): void {
    this.voiceEnabled.update(v => !v);
    if (!this.voiceEnabled()) this.stopSpeaking();
  }

  // ─────────────────────────────────────────────────────────────────────
  // CHIPS CONTEXTUALES
  // ─────────────────────────────────────────────────────────────────────
  private generateSuggestions(response: string): string[] {
    const t = response.toLowerCase();
    if (t.includes('debe') || t.includes('deudor') || t.includes('saldo') || t.includes('cobrar'))
      return ['¿Cuánto suman todas las deudas?', '¿Quién lleva más días sin pagar?', '¿Cuál es la más urgente?'];
    if (t.includes('trámite') || t.includes('carro') || t.includes('vehículo') || t.includes('cruce') || t.includes('aduana'))
      return ['¿Cuál va más atrasado?', '¿Qué documentos faltan?', '¿Quién los está tramitando?'];
    if (t.includes('pagó') || t.includes('pago') || t.includes('cobro') || t.includes('recibí'))
      return ['¿Cuánto llevamos este mes?', '¿Quién sigue sin pagar?', '¿Cuánto falta por cobrar?'];
    if (t.includes('document') || t.includes('falta') || t.includes('pendiente') || t.includes('requisito'))
      return ['¿Cuál es el más urgente?', '¿Cuánto llevan así?', '¿A quién le llamo?'];
    if (t.includes('urgente') || t.includes('alerta') || t.includes('retención') || t.includes('atascado'))
      return ['¿Qué hago primero?', 'Dame todos los detalles', '¿Desde cuándo está así?'];
    if (t.includes('cotización') || t.includes('cotizó'))
      return ['¿Ya aceptaron?', '¿Cuándo vence?', '¿Cuánto sale en total?'];
    return ['¿Algo urgente hoy?', '¿Quién me debe dinero?', '¿Cómo vamos este mes?'];
  }

  // ─────────────────────────────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────────────────────────────
  nombre(): string { return this.auth.user()?.nombre ?? 'Ricardo'; }

  greeting(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '¡Buenos días';
    if (h >= 12 && h < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  }

  horaActual(): string { return this.hora(new Date()); }

  hora(date: Date): string {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  sendCard(question: string): void {
    if (this.loading()) return;
    this.suggestedReplies.set([]);
    this.sendMessage(question);
  }

  send(): void {
    const texto = this.inputText.trim();
    if (!texto || this.loading()) return;
    this.inputText = '';
    if (this.inputRef?.nativeElement) this.inputRef.nativeElement.style.height = 'auto';
    this.suggestedReplies.set([]);
    this.sendMessage(texto);
  }

  handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
  }

  clearChat(): void {
    this.allMessages.set([]);
    this.suggestedReplies.set([]);
    this.stopSpeaking();
    this.inputText = '';
  }

  toolLabel(name: string): string {
    const labels: Record<string, string> = {
      listar_cotizaciones:             'Cotizaciones revisadas',
      obtener_cotizacion:              'Cotización consultada',
      calcular_cotizacion:             'Cálculo realizado',
      listar_tramites:                 'Trámites revisados',
      listar_clientes:                 'Clientes consultados',
      obtener_alertas:                 'Alertas revisadas',
      consultar_deudores:              'Deudores consultados',
      consultar_pagos_recientes:       'Pagos revisados',
      consultar_ubicacion_vehiculos:   'Ubicación de carros revisada',
      consultar_documentos_pendientes: 'Pendientes revisados',
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

  // ─────────────────────────────────────────────────────────────────────
  // ENVIAR MENSAJE
  // ─────────────────────────────────────────────────────────────────────
  private sendMessage(texto: string): void {
    this.allMessages.update(msgs => [...msgs, { role: 'user', texto, timestamp: new Date() }]);
    this.loading.set(true);
    this.shouldScrollToBottom = true;

    const historial: RodriMessage[] = this.allMessages()
      .slice(0, -1).slice(-10)
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

        if (!res.error) {
          this.speak(res.respuesta);
          this.suggestedReplies.set(this.generateSuggestions(res.respuesta));
        }
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
