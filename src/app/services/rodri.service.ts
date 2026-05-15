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
}

@Injectable({ providedIn: 'root' })
export class RodriService {
  private http = inject(HttpClient);
  private readonly base = 'http://localhost:5198/api/rodri';

  chat(mensaje: string, historial: RodriMessage[]): Observable<RodriChatResponse> {
    return this.http.post<RodriChatResponse>(`${this.base}/chat`, { mensaje, historial });
  }
}
