import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RodriMessage {
  role: 'user' | 'model';
  texto: string;
}

export interface RodriChatResponse {
  respuesta: string;
  error: boolean;
  toolCallsEjecutados?: string[];
  provider?: string;
  providerLabel?: string;
  conversacionId?: string;
}

export interface RodriProviderInfo {
  id: string;
  label: string;
  hasTools: boolean;
  isAvailable: boolean;
}

export interface RodriProvidersResponse {
  providers: RodriProviderInfo[];
  default: string;
}

export interface RodriStreamChunk {
  type: 'token' | 'tool_call' | 'done' | 'error' | 'provider';
  content?: string;
  toolName?: string;
  provider?: string;
  providerLabel?: string;
  conversacionId?: string;
}

import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class RodriService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/rodri';

  chat(
    mensaje: string,
    historial: RodriMessage[],
    provider?: string,
    imagenBase64?: string,
    imagenMime?: string,
    conversacionId?: string | null
  ): Observable<RodriChatResponse> {
    const body: any = { mensaje, historial };
    if (provider) body.provider = provider;
    if (imagenBase64) body.imagenBase64 = imagenBase64;
    if (imagenMime) body.imagenMime = imagenMime;
    if (conversacionId) body.conversacionId = conversacionId;
    return this.http.post<RodriChatResponse>(`${this.base}/chat`, body);
  }

  getProviders(): Observable<RodriProvidersResponse> {
    return this.http.get<RodriProvidersResponse>(`${this.base}/providers`);
  }

  /** Sintetiza texto con ElevenLabs. Devuelve un Blob de audio/mpeg. */
  tts(texto: string): Observable<Blob> {
    return this.http.post(`${this.base}/tts`, { texto }, { responseType: 'blob' });
  }

  /** Chat con streaming vía SSE. Retorna un ReadableStream de chunks. */
  async chatStream(
    mensaje: string,
    historial: RodriMessage[],
    onChunk: (chunk: RodriStreamChunk) => void,
    provider?: string,
    imagenBase64?: string,
    imagenMime?: string,
    conversacionId?: string | null
  ): Promise<void> {
    const body: any = { mensaje, historial };
    if (provider) body.provider = provider;
    if (imagenBase64) body.imagenBase64 = imagenBase64;
    if (imagenMime) body.imagenMime = imagenMime;
    if (conversacionId) body.conversacionId = conversacionId;

    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.base}/chat-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      onChunk({ type: 'error', content: `Error de conexión (${response.status})` });
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        try {
          const chunk: RodriStreamChunk = JSON.parse(trimmed.slice(6));
          onChunk(chunk);
        } catch { /* saltar chunks malformados */ }
      }
    }
  }

  // ── STT — Whisper Speech-to-Text ──
  stt(audioBlob: Blob): Observable<{text: string}> {
    const form = new FormData();
    form.append('audio', audioBlob, 'audio.webm');
    return this.http.post<{text: string}>(`${this.base}/stt`, form);
  }

  // ── HISTORIAL DE CHATS ──
  getConversaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/conversaciones`);
  }

  getConversacion(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/conversaciones/${id}`);
  }

  deleteConversacion(id: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.base}/conversaciones/${id}`);
  }
}
