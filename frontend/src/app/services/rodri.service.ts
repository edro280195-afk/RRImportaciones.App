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

import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class RodriService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/rodri';

  chat(mensaje: string, historial: RodriMessage[], provider?: string): Observable<RodriChatResponse> {
    const body: any = { mensaje, historial };
    if (provider) body.provider = provider;
    return this.http.post<RodriChatResponse>(`${this.base}/chat`, body);
  }

  getProviders(): Observable<RodriProvidersResponse> {
    return this.http.get<RodriProvidersResponse>(`${this.base}/providers`);
  }
}
