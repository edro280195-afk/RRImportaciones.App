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
import { RodriService, RodriMessage, RodriStreamChunk } from '../../services/rodri.service';
import { RealtimeService } from '../../services/realtime.service';
import { driver } from 'driver.js';

interface ChatMessage {
  role: 'user' | 'model';
  texto: string;
  timestamp: Date;
  error?: boolean;
  toolCalls?: string[];
  imagenPreview?: string;
  isProactiveAlert?: boolean;
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
    <div class="flex flex-col h-[calc(100vh-56px)] relative overflow-hidden" style="background:#E5DDD5;">
      <!-- ══ HEADER TIPO WHATSAPP ══ -->
      <div class="bg-[#C61D26] text-white flex items-center gap-3 px-4 py-3 shadow-md shrink-0 z-30">
        <div
          id="btn-historial"
          class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30 cursor-pointer hover:bg-white/30 transition-colors"
          (click)="showConversacionesDrawer.set(true)"
          title="Ver conversaciones anteriores"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-white">
            <path
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0 3.09 3.09Z"
            />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-semibold text-[16px] leading-tight flex items-center gap-1.5">
            <span>Nexus Pro</span>
            @if (currentConversacionId()) {
              <span class="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-normal">Persistido</span>
            }
          </p>
          <p class="text-[12px] text-white/80 leading-tight">
            @if (isRecording()) {
              🎤 escuchando...
            } @else if (isSpeaking()) {
              🔊 hablando...
            } @else if (loading()) {
              procesando...
            } @else {
              R&amp;R · {{ provider() === 'openai' ? 'GPT-4o' : 'Gemini 2.5' }}
            }
          </p>
        </div>

        <!-- Botón Historial lateral -->
        <button
          id="btn-historial-v2"
          (click)="showConversacionesDrawer.set(true)"
          title="Ver historial de chats"
          class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </button>

        <!-- Toggle Alertas Proactivas -->
        <button
          id="btn-alertas"
          (click)="toggleProactiveAlerts()"
          [title]="proactiveAlertsEnabled() ? 'Silenciar alertas proactivas' : 'Activar alertas proactivas'"
          class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          @if (proactiveAlertsEnabled()) {
            <svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" class="w-4 h-4 text-green-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a9.04 9.04 0 0 1-5.714 0M3.14 9.486M12 18.75A9.75 9.75 0 0 1 2.25 9c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75a9.75 9.75 0 0 1-9.75 9.75Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a9.04 9.04 0 0 1-5.714 0M3.14 9.486a4.5 4.5 0 0 0-4.494 4.494v3.743a1.5 1.5 0 0 0 .586 1.185c.5.383 1.118.6 1.761.6H17.25c.643 0 1.261-.217 1.761-.6a1.5 1.5 0 0 0 .586-1.185v-3.743A4.5 4.5 0 0 0 14.857 9.486Z" />
            </svg>
          } @else {
            <svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" class="w-4 h-4 text-white/40">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 3.844.148m-3.844-.148a2.238 2.238 0 0 1-2.25-2.24v-3.009m3.844 5.249c-2.942-.1-5.314-2.519-5.314-5.517V12a9.75 9.75 0 0 1-9.75-9.75M3.987 3.987A9.75 9.75 0 0 0 12 18.75m0 0a9.75 9.75 0 0 0 8.013-14.763" />
              <path stroke-linecap="round" stroke-linejoin="round" d="m3 3 18 18" />
            </svg>
          }
        </button>

        <!-- Toggle proveedor de IA -->
        <button
          id="btn-proveedor"
          (click)="toggleProvider()"
          [title]="
            provider() === 'openai'
              ? 'Usando GPT-4o — clic para cambiar a Gemini'
              : 'Usando Gemini 2.5 — clic para cambiar a GPT-4o'
          "
          class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 hover:bg-white/25 active:scale-95 transition-all select-none shrink-0"
        >
          @if (provider() === 'openai') {
            <span class="text-white font-bold text-[10px]">GPT-4o</span>
          } @else {
            <span class="text-white font-bold text-[10px]">Gemini</span>
          }
        </button>

        <!-- Toggle voz -->
        @if (speechAvailable()) {
          <button
            id="btn-voz"
            (click)="toggleVoice()"
            [title]="voiceEnabled() ? 'Silenciar a Nexus' : 'Activar voz de Nexus'"
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            @if (voiceEnabled()) {
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-4 h-4 stroke-2 text-white"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                />
              </svg>
            } @else {
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-4 h-4 stroke-2 text-white/40"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                />
              </svg>
            }
          </button>
        }

        <!-- Toggle manos libres -->
        @if (speechAvailable()) {
          <button
            id="btn-manos-libres"
            (click)="toggleHandsFree()"
            [title]="handsFreeMode() ? 'Desactivar manos libres' : 'Activar manos libres'"
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            [class]="handsFreeMode() ? 'bg-green-500/30 ring-1 ring-green-400' : 'hover:bg-white/10'"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 stroke-2" [class]="handsFreeMode() ? 'text-green-400' : 'text-white/60'">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>
        }

        <!-- Nueva Conversación -->
        <button
          id="btn-nueva-conversacion"
          (click)="iniciarNuevaConversacion()"
          title="Nueva conversación persistida"
          class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        <!-- Botón Ayuda Guía Visual -->
        <button
          id="btn-ayuda-nexus"
          (click)="iniciarGuiaVisual()"
          title="Ver guía de ayuda paso a paso"
          class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </button>
      </div>

      <!-- ══ SIDEBAR DE CHATS PERSISTIDOS ══ -->
      @if (showConversacionesDrawer()) {
        <div class="fixed inset-y-0 left-0 w-80 bg-white/95 backdrop-blur-md border-r border-[#E0D8D0] shadow-2xl z-50 flex flex-col transition-all duration-300">
          <div class="bg-[#C61D26] text-white p-4 flex items-center justify-between shadow-sm shrink-0">
            <span class="font-semibold text-md tracking-wide">Conversaciones de Nexus</span>
            <button (click)="showConversacionesDrawer.set(false)" class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors text-white font-bold">✕</button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <button (click)="iniciarNuevaConversacion()" class="w-full py-2.5 px-4 mb-2 bg-[#C61D26] text-white hover:bg-[#A01520] font-semibold rounded-xl text-xs shadow transition-all text-center block active:scale-98">
              + Nueva Conversación
            </button>
            
            @if (conversaciones().length === 0) {
              <p class="text-xs text-gray-400 text-center py-12">No hay conversaciones previas en el servidor.</p>
            } @else {
              @for (c of conversaciones(); track c.id) {
                <div 
                  [class]="c.id === currentConversacionId() ? 'bg-[#FFF5F5] border-[#C61D26] shadow-sm' : 'hover:bg-gray-100 border-gray-100'"
                  class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group"
                  (click)="seleccionarConversacion(c.id)"
                >
                  <div class="flex-1 min-w-0 pr-2">
                    <p class="text-[13px] font-semibold text-gray-800 truncate">{{ c.titulo || 'Conversación sin título' }}</p>
                    <p class="text-[11px] text-gray-500 truncate">{{ c.resumen || 'Sin resumen aún...' }}</p>
                    <p class="text-[9px] text-gray-400 mt-1 font-medium">{{ formatFecha(c.fechaUltimaActividad) }}</p>
                  </div>
                  <button (click)="eliminarConversacion($event, c.id)" class="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-gray-100">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9 9m1.228-9 .168 1.11H18.75m-5.418 0H18.75m-.001 0a2.25 2.25 0 0 1 2.244 2.077L20.354 18a2.25 2.25 0 0 1-2.244 2.077H5.89A2.25 2.25 0 0 1 3.646 18.003L3.104 5.187A2.25 2.25 0 0 1 5.348 3H18.75Z" />
                    </svg>
                  </button>
                </div>
              }
            }
          </div>
        </div>
        <!-- Overlay oscuro -->
        <div class="fixed inset-0 bg-black/35 backdrop-blur-sm z-40" (click)="showConversacionesDrawer.set(false)"></div>
      }

      <!-- ══ PANEL FLOTANTE DE VAD MANOS LIBRES (WAVEFORMS REACTIVAS) ══ -->
      @if (isRecording() && handsFreeMode()) {
        <div class="fixed inset-x-4 bottom-24 bg-white/90 backdrop-blur-md border border-[#E0D8D0] rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 z-40 scale-100 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-[#C61D26] rounded-full text-[10px] font-bold tracking-wider uppercase animate-pulse">
            <span class="w-1.5 h-1.5 rounded-full bg-[#C61D26]"></span>
            <span>Modo Manos Libres Activo</span>
          </div>
          
          <!-- Visualizador Waveform Reactivo -->
          <div class="flex items-center justify-center h-16 w-full max-w-[240px]">
            <svg viewBox="0 0 100 40" class="w-full h-full text-[#C61D26]">
              <path [attr.d]="getWavePath(0, 1.0)" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"></path>
              <path [attr.d]="getWavePath(2, 0.6)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.5"></path>
              <path [attr.d]="getWavePath(4, 0.3)" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.25"></path>
            </svg>
          </div>
          
          <p class="text-[13px] text-gray-600 font-semibold text-center select-none">
            @if (isUserSpeaking()) {
              🎤 Don Ricardo, le estoy escuchando...
            } @else {
              Hable cuando guste, detectaré cuando guarde silencio...
            }
          </p>
        </div>
      }

      <!-- ══ ÁREA DE CHAT ══ -->
      <div #chatContainer class="chat-area flex-1 overflow-y-auto px-3 py-4 space-y-2">
        <!-- Saludo de Rodri -->
        <div class="flex items-end gap-2 max-w-[82%]">
          <div
            class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mb-0.5"
          >
            <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
              <path
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
          </div>
          <div class="wa-bubble-received">
            <p class="text-[15px] leading-relaxed text-[#111827]">
              {{ greeting() }}, <strong>Don {{ nombre() }}</strong> 👋<br />
              Soy <strong>Nexus Pro</strong>. Persisto sus conversaciones y le alertaré de cualquier atraso automáticamente.
              @if (speechAvailable()) {
                <br /><span class="text-[12px] text-[#777] font-medium"
                  >🎧 Pruebe a activar el icono de micrófono superior para manos libres.</span
                >
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
              <div id="tarjetas-rapidas" class="grid grid-cols-2 gap-2">
                @for (card of quickCards; track card.question) {
                  <button
                    (click)="sendCard(card.question)"
                    class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#E0D8D0] hover:border-[#C61D26] hover:bg-[#FFF5F5] active:bg-[#FFE8E8] transition-all text-left"
                  >
                    <span class="text-xl shrink-0">{{ card.icon }}</span>
                    <span class="text-[13px] font-medium text-[#333] leading-tight">{{
                      card.label
                    }}</span>
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
                @if (msg.imagenPreview) {
                  <img [src]="msg.imagenPreview" class="w-full max-w-[200px] rounded-lg mb-1.5" />
                }
                <p class="text-[15px] leading-relaxed">{{ msg.texto }}</p>
                <div class="flex items-center justify-end gap-1 mt-1">
                  <span class="wa-time text-[#7FB5A0]">{{ hora(msg.timestamp) }}</span>
                  <svg viewBox="0 0 18 11" class="w-4 h-3 fill-[#7FB5A0]">
                    <path
                      d="M17.394.066a.55.55 0 0 0-.577.14L7.25 10.29 1.183 4.62a.55.55 0 0 0-.77.784l6.6 6.2a.55.55 0 0 0 .77-.004l10-10.2a.55.55 0 0 0-.39-.934z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          } @else {
            <div class="flex items-end gap-2 max-w-[82%]">
              <div
                class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0 mb-0.5"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
                  <path
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                </svg>
              </div>
              <div>
                <div
                  class="wa-bubble-received border transition-all"
                  [class.border-red-200]="msg.error"
                  [class.bg-red-50]="msg.error"
                  [style.border]="msg.isProactiveAlert ? '1.5px solid rgba(198, 29, 38, 0.4)' : null"
                  [style.background]="msg.isProactiveAlert ? '#FFFDF0' : null"
                >
                  @if (msg.isProactiveAlert) {
                    <div class="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-amber-700">
                      <span class="animate-bounce">🔔</span>
                      <span>ALERTA DE NEGOCIO</span>
                    </div>
                  }
                  
                  <span
                    class="text-[15px] leading-relaxed block"
                    [class.text-red-800]="msg.error"
                    [innerHTML]="format(msg.texto)"
                  ></span>

                  @if (msg.toolCalls?.length && !msg.error) {
                    <div class="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
                      @for (tc of msg.toolCalls!; track tc) {
                        <span
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500"
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            class="w-3 h-3 stroke-2"
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

                  <div class="flex items-center justify-end gap-2 mt-1.5">
                    @if (!msg.error) {
                      <button
                        (click)="speakMessage(msg.texto)"
                        [title]="isSpeaking() ? 'Detener' : 'Escuchar'"
                        class="text-[#8696A0] hover:text-[#C61D26] transition-colors"
                      >
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          class="w-3.5 h-3.5 stroke-2"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                          />
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
        @if (loading() && isTyping()) {
          <div class="flex items-end gap-2">
            <div
              class="w-7 h-7 rounded-full bg-[#C61D26] flex items-center justify-center shrink-0"
            >
              <svg fill="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white">
                <path
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
            </div>
            <div class="wa-bubble-received px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span
                  class="w-2 h-2 rounded-full bg-[#999] animate-bounce"
                  style="animation-delay:0ms"
                ></span>
                <span
                  class="w-2 h-2 rounded-full bg-[#999] animate-bounce"
                  style="animation-delay:200ms"
                ></span>
                <span
                  class="w-2 h-2 rounded-full bg-[#999] animate-bounce"
                  style="animation-delay:400ms"
                ></span>
              </div>
            </div>
          </div>
        }

        <div #chatEnd></div>
      </div>

      <!-- ══ BARRA DE INPUT ══ -->
      <div class="bg-[#F0F0F0] px-2 pb-2 pt-1 shrink-0 z-10">
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

        <!-- Preview de imagen adjunta -->
        @if (pendingImage()) {
          <div class="flex items-center gap-2 px-1 pb-1.5">
            <div class="relative">
              <img [src]="pendingImage()!.preview" class="w-14 h-14 rounded-lg object-cover border border-gray-200 shadow-sm" />
              <button (click)="clearImage()" class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C61D26] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-700 transition-colors">✕</button>
            </div>
            <span class="text-[12px] text-gray-500">📷 Foto adjunta</span>
          </div>
        }

        <!-- Fila de input + botón -->
        <div class="flex items-end gap-2">
          <!-- Campo de texto -->
          <div
            class="flex-1 bg-white rounded-[24px] flex items-end px-4 py-2.5 shadow-sm min-h-[46px]"
          >
            <textarea
              id="input-mensaje"
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

          <!-- Cámara con Menú de Dos Opciones -->
          <input #cameraInput type="file" accept="image/*" capture="environment" class="hidden" (change)="onImageSelected($event)" />
          <input #galleryInput type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" />
          
          <div class="relative shrink-0">
            <button
              id="btn-camara"
              (click)="showCameraMenu.set(!showCameraMenu())"
              [disabled]="loading() || isRecording()"
              title="Cámara y Fotos"
              class="w-[42px] h-[46px] flex items-center justify-center transition-all text-[#8696A0] hover:text-[#C61D26] active:scale-95 disabled:opacity-40"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 stroke-[1.8]">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </button>

            <!-- Menú Flotante de Selección -->
            @if (showCameraMenu()) {
              <div class="absolute bottom-14 right-0 w-44 bg-white/95 backdrop-blur-md border border-[#E0D8D0] rounded-2xl p-1.5 shadow-2xl flex flex-col gap-0.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  (click)="abrirCamaraDirecta(cameraInput)"
                  class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 text-left transition-all w-full"
                >
                  <span class="text-base">📸</span>
                  <span class="text-[12.5px] font-semibold text-gray-800">Tomar Foto</span>
                </button>
                <div class="h-px bg-gray-100 my-0.5"></div>
                <button
                  (click)="abrirGaleriaDirecta(galleryInput)"
                  class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 text-left transition-all w-full"
                >
                  <span class="text-base">🖼️</span>
                  <span class="text-[12.5px] font-semibold text-gray-800">Elegir de Galería</span>
                </button>
              </div>
              <!-- Overlay invisible para cerrar -->
              <div class="fixed inset-0 z-40" (click)="showCameraMenu.set(false)"></div>
            }
          </div>

          <!-- Botón enviar -->
          @if ((inputText.trim() || pendingImage()) && !isRecording()) {
            <button
              id="btn-enviar-PTT"
              (click)="send()"
              [disabled]="loading()"
              class="w-[46px] h-[46px] bg-[#C61D26] rounded-full flex items-center justify-center shrink-0 shadow-md hover:bg-[#A01520] active:scale-95 transition-all disabled:opacity-40"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-5 h-5 stroke-2 text-white translate-x-0.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          } @else if (speechAvailable()) {
            <!-- Botón micrófono PTT -->
            <button
              id="btn-enviar-PTT"
              (mousedown)="startRecording($event)"
              (mouseup)="stopRecording($event)"
              (mouseleave)="stopRecordingIfActive()"
              (touchstart)="startRecording($event)"
              (touchend)="stopRecording($event)"
              [disabled]="loading()"
              [title]="isRecording() ? 'Suelte para enviar' : 'Mantenga presionado para hablar'"
              class="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 shadow-md transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed"
              [class]="
                isRecording()
                  ? 'bg-red-700 scale-110 shadow-red-500/60 shadow-lg'
                  : 'bg-[#C61D26] hover:bg-[#A01520] active:scale-95'
              "
            >
              @if (isRecording()) {
                <span class="w-4 h-4 rounded-sm bg-white block"></span>
              } @else {
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="w-5 h-5 stroke-2 text-white"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                  />
                </svg>
              }
            </button>
          } @else {
            <button
              id="btn-enviar-PTT"
              (click)="send()"
              [disabled]="loading() || !inputText.trim()"
              class="w-[46px] h-[46px] bg-[#C61D26] rounded-full flex items-center justify-center shrink-0 shadow-md hover:bg-[#A01520] active:scale-95 transition-all disabled:opacity-40"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="w-5 h-5 stroke-2 text-white translate-x-0.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          }
        </div>

        <!-- Indicador de grabación manual -->
        @if (isRecording() && !handsFreeMode()) {
          <div class="flex items-center justify-center gap-2 pt-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 recording-pulse"></span>
            <span class="text-[12px] text-red-700 font-medium select-none">Grabando — suelte para enviar</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .wa-bubble-received {
        background: #ffffff;
        border-radius: 0px 12px 12px 12px;
        padding: 8px 12px 6px 12px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        position: relative;
        max-width: 100%;
      }
      .wa-bubble-sent {
        background: #d9fdd3;
        border-radius: 12px 0px 12px 12px;
        padding: 8px 12px 6px 12px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        max-width: 82%;
      }
      .wa-time {
        font-size: 11px;
        color: #8696a0;
        white-space: nowrap;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }

      @keyframes wa-bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }
      .animate-bounce {
        animation: wa-bounce 1s ease infinite;
      }

      @keyframes rec-pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.4;
          transform: scale(1.4);
        }
      }
      .recording-pulse {
        animation: rec-pulse 1s ease infinite;
      }

      .chat-area {
        background-color: #e5ddd5;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23E5DDD5'/%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23D4C8BF' opacity='0.6'/%3E%3C/svg%3E");
      }
    `,
  ],
})
export class ModoDonComponent implements OnInit, OnDestroy, AfterViewChecked {
  private auth = inject(AuthService);
  private rodriService = inject(RodriService);
  private sanitizer = inject(DomSanitizer);
  private realtimeService = inject(RealtimeService);

  @ViewChild('chatEnd') chatEnd!: ElementRef;
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('inputRef') inputRef!: ElementRef<HTMLTextAreaElement>;

  provider = signal<'openai' | 'gemini'>('openai');
  loading = signal(false);
  isTyping = signal(false);
  inputText = '';
  pendingImage = signal<{base64: string; mime: string; preview: string} | null>(null);
  showCameraMenu = signal(false);
  handsFreeMode = signal(false);
  private silenceTimer: any = null;
  private readonly SILENCE_TIMEOUT = 1800; // ms

  private allMessages = signal<ChatMessage[]>([]);
  private shouldScrollToBottom = false;

  showCards = computed(() => this.allMessages().length === 0);
  visibleMessages = computed(() => this.allMessages());

  // ── HISTORIAL PERSISTIDO EN DB ──
  conversaciones = signal<any[]>([]);
  currentConversacionId = signal<string | null>(null);
  showConversacionesDrawer = signal(false);
  proactiveAlertsEnabled = signal(localStorage.getItem('nexus_proactive_alerts') !== 'false');

  // ── VAD WEB AUDIO ──
  isUserSpeaking = signal(false);
  vadVolumeLevel = signal(0);
  private wavePhase = 0;
  private vadStream: MediaStream | null = null;
  private vadInterval: any = null;
  private audioCtx: AudioContext | null = null;

  // ── VOZ ──
  private recognition: any = null;
  private synth = window.speechSynthesis;
  private voiceList: SpeechSynthesisVoice[] = [];
  private finalTranscript = '';
  private elevenLabsAudio: HTMLAudioElement | null = null;

  isRecording = signal(false);
  isSpeaking = signal(false);
  voiceEnabled = signal(localStorage.getItem('nexus_voice_enabled') !== 'false');
  interimText = signal('');
  speechAvailable = signal(false);
  useWhisper = signal(true);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // ── CHIPS CONTEXTUALES ──
  suggestedReplies = signal<string[]>([]);

  readonly quickCards: QuickCard[] = [
    {
      icon: '💰',
      label: '¿Quién me debe?',
      question: '¿Quién me debe dinero? Dime los clientes con saldo pendiente.',
    },
    {
      icon: '🚗',
      label: '¿Dónde están los carros?',
      question: '¿Dónde están los carros? Dime el estado de los trámites activos.',
    },
    {
      icon: '📋',
      label: '¿Qué falta?',
      question: '¿Qué está pendiente o atascado? ¿Qué documentos faltan?',
    },
    {
      icon: '✅',
      label: '¿Quién ya pagó?',
      question: '¿Quién ha pagado esta semana? Muéstrame los últimos pagos.',
    },
    {
      icon: '📊',
      label: '¿Cómo vamos hoy?',
      question: '¿Cómo vamos hoy? Dame un resumen de todo el negocio.',
    },
    {
      icon: '🔔',
      label: '¿Hay algo urgente?',
      question: '¿Hay algo urgente que deba saber? Alertas, retrasos, cobros vencidos.',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    this.initSpeech();
    await this.loadEncryptedHistory();
    this.cargarConversaciones();

    // Conectar SignalR y escuchar alertas proactivas
    this.realtimeService.start();
    this.realtimeService.nexusAlerta$.subscribe(alerta => {
      if (this.proactiveAlertsEnabled()) {
        this.handleProactiveAlert(alerta);
      }
    });

    // Lanzar el onboarding visual automáticamente la primera vez para Don Ricardo
    const tourShown = localStorage.getItem('nexus_tour_shown');
    if (!tourShown) {
      setTimeout(() => {
        this.iniciarGuiaVisual();
      }, 1200);
    }
  }

  ngOnDestroy(): void {
    this.recognition?.abort();
    this.stopSpeaking();
    this.saveEncryptedHistory();
    this.stopVad();
    if (this.vadStream) {
      this.vadStream.getTracks().forEach(t => t.stop());
    }
  }

  // ── HISTORIAL CIFRADO ──
  private get historyKey(): string {
    const user = this.auth.user();
    return `nexus_hist_${user?.id ?? 'anon'}`;
  }

  private async deriveKey(): Promise<CryptoKey> {
    const user = this.auth.user();
    const secret = `nexus-${user?.id ?? 'default'}-${user?.username ?? ''}`;
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('NexusRR2024'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async saveEncryptedHistory(): Promise<void> {
    try {
      const msgs = this.allMessages();
      if (msgs.length === 0) {
        localStorage.removeItem(this.historyKey);
        return;
      }
      // Solo guardar los últimos 50 mensajes para no saturar localStorage
      const toSave = msgs.slice(-50).map(m => ({
        role: m.role,
        texto: m.texto,
        timestamp: m.timestamp
      }));
      const key = await this.deriveKey();
      const enc = new TextEncoder();
      const data = enc.encode(JSON.stringify(toSave));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
      // Guardar IV + ciphertext como base64
      const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      localStorage.setItem(this.historyKey, btoa(String.fromCharCode(...combined)));
    } catch {
      // Si falla el cifrado, silenciosamente no guardar
    }
  }

  private async loadEncryptedHistory(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.historyKey);
      if (!stored) return;
      const key = await this.deriveKey();
      const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      const json = new TextDecoder().decode(decrypted);
      const msgs: any[] = JSON.parse(json);
      this.allMessages.set(msgs.map((m: any) => ({
        role: m.role,
        texto: m.texto,
        timestamp: new Date(m.timestamp)
      })));
    } catch {
      // Si falla la desencriptación (clave cambió, datos corruptos), empezar limpio
      localStorage.removeItem(this.historyKey);
    }
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
    const loadVoices = () => {
      this.voiceList = this.synth.getVoices();
    };
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

      // Manos libres: resetear timer de silencio con cada resultado (fallback)
      if (this.handsFreeMode() && !this.vadInterval) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          this.recognition?.stop();
        }, this.SILENCE_TIMEOUT);
      }
    };

    this.recognition.onend = () => {
      this.isRecording.set(false);
      this.interimText.set('');
      clearTimeout(this.silenceTimer);
      this.stopVad();
      if (this.vadStream) {
        this.vadStream.getTracks().forEach(t => t.stop());
        this.vadStream = null;
      }

      // Detener MediaRecorder si estaba grabando (Whisper)
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        // Whisper maneja el envío en onstop
        this.finalTranscript = '';
        this.inputText = '';
        return;
      }

      const text = this.finalTranscript.trim();
      this.finalTranscript = '';
      this.inputText = '';
      if (text) {
        this.sendMessage(text);
      } else if (this.handsFreeMode() && !this.loading()) {
        // Sin texto detectado — re-escuchar silenciosamente
        setTimeout(() => this.startListening(), 400);
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

    if (this.useWhisper()) {
      this.startMediaRecorder();
    }

    try {
      this.recognition.start();
    } catch (_) {
      this.isRecording.set(false);
    }
  }

  stopRecording(event: Event): void {
    event.preventDefault();
    if (!this.recognition || !this.isRecording()) return;
    this.recognition.stop();
  }

  stopRecordingIfActive(): void {
    if (this.isRecording()) this.recognition?.stop();
  }

  // ── MANOS LIBRES ──
  toggleHandsFree(): void {
    const next = !this.handsFreeMode();
    this.handsFreeMode.set(next);
    if (next) {
      // Activar: empezar a escuchar y activar voz
      this.voiceEnabled.set(true);
      this.startListening();
    } else {
      // Desactivar: dejar de grabar
      clearTimeout(this.silenceTimer);
      this.stopRecordingIfActive();
    }
  }

  private startListening(): void {
    if (!this.recognition || this.isRecording() || this.loading() || this.isSpeaking()) return;
    this.stopSpeaking();
    this.finalTranscript = '';
    this.inputText = '';
    this.isRecording.set(true);

    if (this.useWhisper()) {
      this.startMediaRecorder();
    } else {
      // Activar VAD local para browser STT si manos libres está encendido
      if (this.handsFreeMode()) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          this.vadStream = stream;
          this.startVad(stream);
        }).catch(() => {});
      }
    }

    try {
      this.recognition.start();
    } catch (_) {
      this.isRecording.set(false);
    }
  }

  private startMediaRecorder(): void {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.vadStream = stream;
      this.startVad(stream);
      this.audioChunks = [];
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      }
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        this.stopVad();
        if (this.vadStream) {
          this.vadStream.getTracks().forEach(t => t.stop());
          this.vadStream = null;
        }
        if (this.audioChunks.length > 0) {
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.transcribeWithWhisper(blob);
        }
      };
      this.mediaRecorder.start();
    }).catch(() => {
      // Si no hay permiso de micro, caer en browser STT
      this.useWhisper.set(false);
    });
  }

  private transcribeWithWhisper(blob: Blob): void {
    this.interimText.set('Transcribiendo...');
    this.rodriService.stt(blob).subscribe({
      next: (res) => {
        this.interimText.set('');
        const text = res.text?.trim();
        if (text) {
          this.sendMessage(text);
        } else if (this.handsFreeMode()) {
          setTimeout(() => this.startListening(), 400);
        }
      },
      error: () => {
        this.interimText.set('');
        // Fallback: usar transcripción del browser
        const text = this.finalTranscript.trim();
        if (text) this.sendMessage(text);
      }
    });
  }

  // ── VAD WEB AUDIO METHODS ──
  private startVad(stream: MediaStream): void {
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(stream);
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000; // rango de voz
      filter.Q.value = 0.5;

      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;

      source.connect(filter);
      filter.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = 0;
      let speechStart = 0;
      this.isUserSpeaking.set(false);

      this.vadInterval = setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);

        // Actualizar volumen para ondas SVG (0 a 1)
        const vol = Math.min(1, rms * 10);
        this.vadVolumeLevel.set(vol);
        this.wavePhase += 0.15; // scroll de ondas

        const speechThreshold = 0.02;
        const now = Date.now();

        if (rms > speechThreshold) {
          if (!this.isUserSpeaking()) {
            if (speechStart === 0) speechStart = now;
            if (now - speechStart > 150) { // confirmación de voz 150ms
              this.isUserSpeaking.set(true);
              silenceStart = 0;
            }
          } else {
            silenceStart = 0;
          }
        } else {
          speechStart = 0;
          if (this.isUserSpeaking()) {
            if (silenceStart === 0) silenceStart = now;
            if (now - silenceStart > 1800) { // 1.8s de silencio -> Detener
              clearInterval(this.vadInterval);
              this.stopRecordingIfActive();
            }
          }
        }
      }, 50);
    } catch (e) {
      console.warn('Error al iniciar VAD adaptativo', e);
    }
  }

  private stopVad(): void {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
    this.vadVolumeLevel.set(0);
    this.isUserSpeaking.set(false);
  }

  getWavePath(offset: number, scaleMultiplier: number): string {
    const vol = this.vadVolumeLevel();
    const amp = Math.max(2, vol * 18) * scaleMultiplier;
    const freq = 0.15;
    const width = 100;
    const height = 40;
    const midY = height / 2;
    
    let path = `M 0 ${midY}`;
    for (let x = 0; x <= width; x += 2) {
      const y = midY + Math.sin(x * freq + this.wavePhase + offset) * amp;
      path += ` L ${x} ${y}`;
    }
    return path;
  }

  // ─────────────────────────────────────────────────────────────────────
  // TTS — HABLAR (ElevenLabs primero, browser como fallback)
  // ─────────────────────────────────────────────────────────────────────
  speak(text: string): void {
    if (!this.voiceEnabled() || !text) return;
    this.stopSpeaking();

    const clean = this.cleanForTts(text);
    if (!clean) return;

    this.isSpeaking.set(true);

    // Intentar ElevenLabs
    this.rodriService.tts(clean).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        this.elevenLabsAudio = new Audio(url);
        this.elevenLabsAudio.onended = () => {
          this.isSpeaking.set(false);
          URL.revokeObjectURL(url);
          this.elevenLabsAudio = null;
          // Auto-escuchar después de hablar (Turn Detection)
          if (this.handsFreeMode() && !this.loading()) {
            setTimeout(() => this.startListening(), 350);
          }
        };
        this.elevenLabsAudio.onerror = () => {
          this.isSpeaking.set(false);
          URL.revokeObjectURL(url);
          this.elevenLabsAudio = null;
        };
        this.elevenLabsAudio.play().catch(() => this.isSpeaking.set(false));
      },
      error: () => {
        // Fallback: voz del navegador si ElevenLabs falla
        this.speakBrowser(clean);
      },
    });
  }

  private speakBrowser(clean: string): void {
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-MX';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const esVoice =
      this.voiceList.find(v => v.lang === 'es-MX') ||
      this.voiceList.find(v => v.lang.startsWith('es-')) ||
      this.voiceList.find(v => v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;
    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => {
      this.isSpeaking.set(false);
      // Auto-escuchar después de hablar (Turn Detection)
      if (this.handsFreeMode() && !this.loading()) {
        setTimeout(() => this.startListening(), 350);
      }
    };
    utterance.onerror = () => this.isSpeaking.set(false);
    this.synth.speak(utterance);
  }

  private cleanForTts(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/gs, '$1')
      .replace(/\*(.+?)\*/gs, '$1')
      .replace(/`[^`]+`/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[_#]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000); // no gastar más de 2000 chars por llamada
  }

  speakMessage(text: string): void {
    if (this.isSpeaking()) {
      this.stopSpeaking();
    } else {
      this.speak(text);
    }
  }

  stopSpeaking(): void {
    // Detener ElevenLabs
    if (this.elevenLabsAudio) {
      this.elevenLabsAudio.pause();
      this.elevenLabsAudio.src = '';
      this.elevenLabsAudio = null;
    }
    // Detener browser TTS
    this.synth.cancel();
    this.isSpeaking.set(false);
  }

  toggleVoice(): void {
    this.voiceEnabled.update(v => {
      const next = !v;
      localStorage.setItem('nexus_voice_enabled', String(next));
      if (!next) this.stopSpeaking();
      return next;
    });
  }

  toggleProvider(): void {
    this.provider.update(p => (p === 'openai' ? 'gemini' : 'openai'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // CHIPS CONTEXTUALES
  // ─────────────────────────────────────────────────────────────────────
  private generateSuggestions(response: string): string[] {
    const t = response.toLowerCase();
    if (t.includes('debe') || t.includes('deudor') || t.includes('saldo') || t.includes('cobrar'))
      return [
        '¿Cuánto suman todas las deudas?',
        '¿Quién lleva más días sin pagar?',
        '¿Cuál es la más urgente?',
      ];
    if (
      t.includes('trámite') ||
      t.includes('carro') ||
      t.includes('vehículo') ||
      t.includes('cruce') ||
      t.includes('aduana')
    )
      return ['¿Cuál va más atrasado?', '¿Qué documentos faltan?', '¿Quién los está tramitando?'];
    if (t.includes('pagó') || t.includes('pago') || t.includes('cobro') || t.includes('recibí'))
      return ['¿Cuánto llevamos este mes?', '¿Quién sigue sin pagar?', '¿Cuánto falta por cobrar?'];
    if (
      t.includes('document') ||
      t.includes('falta') ||
      t.includes('pendiente') ||
      t.includes('requisito')
    )
      return ['¿Cuál es el más urgente?', '¿Cuánto llevan así?', '¿A quién le llamo?'];
    if (
      t.includes('urgente') ||
      t.includes('alerta') ||
      t.includes('retención') ||
      t.includes('atascado')
    )
      return ['¿Qué hago primero?', 'Dame todos los detalles', '¿Desde cuándo está así?'];
    if (t.includes('cotización') || t.includes('cotizó'))
      return ['¿Ya aceptaron?', '¿Cuándo vence?', '¿Cuánto sale en total?'];
    return ['¿Algo urgente hoy?', '¿Quién me debe dinero?', '¿Cómo vamos este mes?'];
  }

  // ─────────────────────────────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────────────────────────────
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
    this.suggestedReplies.set([]);
    this.sendMessage(question);
  }

  send(): void {
    const texto = this.inputText.trim();
    if ((!texto && !this.pendingImage()) || this.loading()) return;
    this.inputText = '';
    if (this.inputRef?.nativeElement) this.inputRef.nativeElement.style.height = 'auto';
    this.suggestedReplies.set([]);
    this.sendMessage(texto || '¿Qué ves en esta imagen?');
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

  // ── CÁMARA / IMAGEN ──
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.compressAndStore(file);
    input.value = '';
  }

  abrirCamaraDirecta(input: HTMLInputElement): void {
    this.showCameraMenu.set(false);
    input.click();
  }

  abrirGaleriaDirecta(input: HTMLInputElement): void {
    this.showCameraMenu.set(false);
    input.click();
  }

  private compressAndStore(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1024;
        let w = image.width, h = image.height;
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(image, 0, 0, w, h);
        const mime = file.type || 'image/jpeg';
        const base64 = canvas.toDataURL(mime, 0.8).split(',')[1];
        const preview = canvas.toDataURL(mime, 0.3);
        this.pendingImage.set({ base64, mime, preview });
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.pendingImage.set(null);
  }

  clearChat(): void {
    this.allMessages.set([]);
    this.suggestedReplies.set([]);
    this.stopSpeaking();
    this.inputText = '';
    this.pendingImage.set(null);
    localStorage.removeItem(this.historyKey);
  }

  toolLabel(name: string): string {
    const labels: Record<string, string> = {
      listar_cotizaciones: 'Cotizaciones revisadas',
      obtener_cotizacion: 'Cotización consultada',
      calcular_cotizacion: 'Cálculo realizado',
      listar_tramites: 'Trámites revisados',
      listar_clientes: 'Clientes consultados',
      obtener_alertas: 'Alertas revisadas',
      consultar_deudores: 'Deudores consultados',
      consultar_pagos_recientes: 'Pagos revisados',
      consultar_ubicacion_vehiculos: 'Ubicación de carros revisada',
      consultar_documentos_pendientes: 'Pendientes revisados',
      registrar_pago_tramite: 'Pago registrado ✅',
      actualizar_estado_tramite: 'Estado actualizado ✅',
    };
    return labels[name] ?? name;
  }

  format(texto: string): SafeHtml {
    const html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-gray-100 px-1 rounded text-[13px] font-mono">$1</code>'
      )
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ─────────────────────────────────────────────────────────────────────
  // ENVIAR MENSAJE — con streaming
  // ─────────────────────────────────────────────────────────────────────
  private async sendMessage(texto: string): Promise<void> {
    const img = this.pendingImage();
    this.pendingImage.set(null);
    this.allMessages.update(msgs => [...msgs, { role: 'user', texto, timestamp: new Date(), imagenPreview: img?.preview }]);
    this.loading.set(true);
    this.isTyping.set(true);
    this.shouldScrollToBottom = true;

    // Placeholder para la respuesta (se irá llenando con streaming)
    this.allMessages.update(msgs => [
      ...msgs,
      { role: 'model', texto: '', timestamp: new Date(), toolCalls: [] },
    ]);

    const historial: RodriMessage[] = this.allMessages()
      .slice(0, -2) // quitar el user que acabamos de agregar y el placeholder
      .slice(-6)
      .map(m => ({ role: m.role, texto: m.texto }));

    try {
      await this.rodriService.chatStream(
        texto,
        historial,
        (chunk) => {
          if (chunk.type === 'token' || chunk.type === 'tool_call') {
            this.isTyping.set(false);
          }
          if (chunk.type === 'token') {
            this.allMessages.update(msgs => {
              const copy = [...msgs];
              const last = { ...copy[copy.length - 1] };
              last.texto += chunk.content;
              copy[copy.length - 1] = last;
              return copy;
            });
            this.shouldScrollToBottom = true;
          } else if (chunk.type === 'tool_call') {
            this.allMessages.update(msgs => {
              const copy = [...msgs];
              const last = { ...copy[copy.length - 1] };
              last.toolCalls = [...(last.toolCalls || []), chunk.toolName!];
              copy[copy.length - 1] = last;
              return copy;
            });
            this.shouldScrollToBottom = true;
          } else if (chunk.type === 'error') {
            this.isTyping.set(false);
            this.allMessages.update(msgs => {
              const copy = [...msgs];
              const last = { ...copy[copy.length - 1] };
              last.texto = chunk.content || 'Ocurrió un error.';
              last.error = true;
              copy[copy.length - 1] = last;
              return copy;
            });
          } else if (chunk.type === 'done') {
            this.loading.set(false);
            const msgs = this.allMessages();
            const last = msgs[msgs.length - 1];
            if (!last.error && last.texto) this.speak(last.texto);
            this.suggestedReplies.set(this.generateSuggestions(last.texto));
            
            if (chunk.conversacionId) {
              const isNew = this.currentConversacionId() !== chunk.conversacionId;
              this.currentConversacionId.set(chunk.conversacionId);
              if (isNew) {
                this.cargarConversaciones();
              }
            }
            this.saveEncryptedHistory();
          }
        },
        this.provider(),
        img?.base64,
        img?.mime,
        this.currentConversacionId()
      );
    } catch {
      // Fallback a non-streaming si el streaming falla
      this.isTyping.set(false);
      this.rodriService.chat(texto, historial, this.provider(), img?.base64, img?.mime, this.currentConversacionId()).subscribe({
        next: res => {
          this.loading.set(false);
          this.allMessages.update(msgs => {
            const copy = [...msgs];
            copy[copy.length - 1] = {
              role: 'model',
              texto: res.respuesta,
              timestamp: new Date(),
              error: res.error,
              toolCalls: res.toolCallsEjecutados?.length ? res.toolCallsEjecutados : undefined,
            };
            return copy;
          });
          this.shouldScrollToBottom = true;
          if (!res.error) {
            this.speak(res.respuesta);
            this.suggestedReplies.set(this.generateSuggestions(res.respuesta));
          }
          if (res.conversacionId) {
            const isNew = this.currentConversacionId() !== res.conversacionId;
            this.currentConversacionId.set(res.conversacionId);
            if (isNew) {
              this.cargarConversaciones();
            }
          }
          this.saveEncryptedHistory();
        },
        error: () => {
          this.loading.set(false);
          this.allMessages.update(msgs => {
            const copy = [...msgs];
            copy[copy.length - 1] = {
              role: 'model',
              texto: 'Don Ricardo, no pude conectarme ahorita. ¿Le puedo ayudar en algo más?',
              timestamp: new Date(),
              error: true,
            };
            return copy;
          });
          this.shouldScrollToBottom = true;
        },
      });
    }
  }

  cargarConversaciones(): void {
    this.rodriService.getConversaciones().subscribe({
      next: (data) => {
        this.conversaciones.set(data);
      },
      error: (err) => console.error('Error al cargar conversaciones', err)
    });
  }

  iniciarNuevaConversacion(): void {
    this.currentConversacionId.set(null);
    this.allMessages.set([]);
    this.suggestedReplies.set([]);
    this.stopSpeaking();
    this.inputText = '';
    this.pendingImage.set(null);
    this.showConversacionesDrawer.set(false);
  }

  iniciarGuiaVisual(): void {
    // Detener reproducción de voz antes de iniciar la guía
    this.stopSpeaking();

    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente 👉',
      prevBtnText: '👈 Atrás',
      doneBtnText: '¡Entendido! 👍',
      progressText: 'Paso {{current}} de {{total}}',
      steps: [
        {
          popover: {
            title: '¡Bienvenido a Nexus Pro, Don Ricardo! 👋',
            description: 'Diseñé esta guía especialmente para usted. Le mostraré paso a paso para qué sirve cada botón en la pantalla para que controle su negocio sin complicaciones. ¡Vamos a ver cómo funciona!'
          }
        },
        {
          element: '#btn-historial',
          popover: {
            title: '📂 Historial de Chats',
            description: 'Al presionar esta estrella blanca, se abrirá una barra lateral con sus conversaciones anteriores. Así podrá retomar cualquier chat previo con Nexus.'
          }
        },
        {
          element: '#btn-alertas',
          popover: {
            title: '🔔 Alertas del Negocio',
            description: 'Este botón activa o desactiva las alertas automáticas. Cuando tiene la campana verde activa, Nexus le avisará de inmediato si hay cobros vencidos o trámites detenidos en aduanas.'
          }
        },
        {
          element: '#btn-proveedor',
          popover: {
            title: '🧠 Selector de Inteligencia',
            description: 'Aquí puede cambiar entre los motores GPT-4o y Gemini. Si siente que uno le responde mejor o analiza mejor sus fotos, cámbielo aquí con un toque.'
          }
        },
        {
          element: '#btn-voz',
          popover: {
            title: '🔊 Voz de Nexus',
            description: 'Enciende o apaga la voz de Nexus. Cuando está activo (con la bocina blanca), Nexus le leerá sus respuestas en voz alta de manera clara.'
          }
        },
        {
          element: '#btn-manos-libres',
          popover: {
            title: '🎤 Modo Manos Libres',
            description: '¡Este botón es maravilloso! Si lo enciende, podrá hablar con Nexus de corrido sin presionar nada. Termine su frase, guarde silencio por un instante, y Nexus le responderá.'
          }
        },
        {
          element: '#btn-nueva-conversacion',
          popover: {
            title: '➕ Nueva Conversación',
            description: 'Use este botón de más si desea limpiar la pantalla y comenzar una nueva plática limpia sobre otro tema diferente.'
          }
        },
        {
          element: '#tarjetas-rapidas',
          popover: {
            title: '⚡ Preguntas Rápidas',
            description: 'Estas tarjetas le permiten consultar las deudas de sus clientes, el estado de sus carros o lo pendiente en aduana con un solo toque, sin necesidad de escribir nada.'
          }
        },
        {
          element: '#input-mensaje',
          popover: {
            title: '✏️ Cuadro de Texto',
            description: 'Aquí puede escribir sus mensajes directamente con el teclado cuando prefiera no hablar en voz alta.'
          }
        },
        {
          element: '#btn-camara',
          popover: {
            title: '📷 Cámara e Imágenes',
            description: 'Presione esta camarita para tomar una foto con su celular o elegir un archivo. Puede enviarle fotos de VINs de carros, facturas o pedimentos para que Nexus los lea y procese por usted.'
          }
        },
        {
          element: '#btn-enviar-PTT',
          popover: {
            title: '🎤 Botón de Hablar y Enviar',
            description: 'Si el manos libres está apagado, mantenga presionado este botón mientras habla y suéltelo al terminar para mandar su voz. Si ya escribió texto, este botón servirá para enviar su escrito.'
          }
        },
        {
          element: '#btn-ayuda-nexus',
          popover: {
            title: '❓ ¿Necesita Ayuda?',
            description: 'Si alguna vez olvida para qué sirve algo, toque este signo de interrogación. Volverá a iniciar esta guía interactiva paso a paso inmediatamente.'
          }
        }
      ]
    });

    localStorage.setItem('nexus_tour_shown', 'true');
    driverObj.drive();
  }

  seleccionarConversacion(id: string): void {
    this.rodriService.getConversacion(id).subscribe({
      next: (msgs: any[]) => {
        const mapped: ChatMessage[] = msgs.map(m => ({
          role: m.role as 'user' | 'model',
          texto: m.texto,
          timestamp: new Date(m.fecha),
          toolCalls: m.toolCalls || []
        }));
        this.allMessages.set(mapped);
        this.currentConversacionId.set(id);
        this.showConversacionesDrawer.set(false);
        this.shouldScrollToBottom = true;
      },
      error: (err) => console.error('Error al cargar la conversación', err)
    });
  }

  eliminarConversacion(event: Event, id: string): void {
    event.stopPropagation(); // Evitar seleccionar la conversación al borrarla
    if (confirm('¿Está seguro de eliminar esta conversación?')) {
      this.rodriService.deleteConversacion(id).subscribe({
        next: () => {
          this.cargarConversaciones();
          if (this.currentConversacionId() === id) {
            this.iniciarNuevaConversacion();
          }
        },
        error: (err) => console.error('Error al eliminar conversación', err)
      });
    }
  }

  toggleProactiveAlerts(): void {
    this.proactiveAlertsEnabled.update(enabled => {
      const next = !enabled;
      localStorage.setItem('nexus_proactive_alerts', String(next));
      return next;
    });
  }

  handleProactiveAlert(alerta: { tipo: string; mensaje: string; fecha: string }): void {
    // Add proactive alert to messages list
    const alertMsg: ChatMessage = {
      role: 'model',
      texto: alerta.mensaje,
      timestamp: new Date(alerta.fecha),
      isProactiveAlert: true
    };
    this.allMessages.update(msgs => [...msgs, alertMsg]);
    this.shouldScrollToBottom = true;
    
    // Announce verbally if voice is enabled and assistant is active
    if (this.voiceEnabled()) {
      this.speak(alerta.mensaje);
    }
  }

  formatFecha(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}
