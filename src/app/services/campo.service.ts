import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface TareaCampoDto {
  id: string;
  tramiteId: string;
  numeroConsecutivo: string;
  clienteNombre: string | null;
  vehiculoResumen: string;
  vin: string | null;
  vinCorto: string | null;
  tipo: string;
  estatus: string;
  personalCampoId: string | null;
  personalCampoNombre: string | null;
  usuarioCampoId: string | null;
  usuarioCampoNombre: string | null;
  ubicacion: string | null;
  vinConfirmado: string | null;
  fotosUrls: string[];
  incidencia: string | null;
  fechaCreacion: string;
  fechaTomada: string | null;
  fechaCompletada: string | null;
}

@Injectable({ providedIn: 'root' })
export class CampoService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/campo';

  getTareas(estatus?: string): Observable<TareaCampoDto[]> {
    const url = estatus ? `${this.baseUrl}/tareas?estatus=${encodeURIComponent(estatus)}` : `${this.baseUrl}/tareas`;
    return this.http.get<TareaCampoDto[]>(url);
  }

  getById(id: string): Observable<TareaCampoDto> {
    return this.http.get<TareaCampoDto>(`${this.baseUrl}/tareas/${id}`);
  }

  crear(request: { tramiteId: string; personalCampoId?: string | null; tipo: string; ubicacion?: string | null }): Observable<TareaCampoDto> {
    return this.http.post<TareaCampoDto>(`${this.baseUrl}/tareas`, request);
  }

  tomar(id: string, personalCampoId?: string | null): Observable<TareaCampoDto> {
    return this.http.post<TareaCampoDto>(`${this.baseUrl}/tareas/${id}/tomar`, { personalCampoId: personalCampoId ?? null });
  }

  completar(id: string, request: { ubicacion?: string | null; vinConfirmado?: string | null; fotosUrls: string[]; incidencia?: string | null }): Observable<TareaCampoDto> {
    return this.http.post<TareaCampoDto>(`${this.baseUrl}/tareas/${id}/completar`, request);
  }

  uploadFoto(id: string, file: File): Observable<{ fotoUrl: string; tarea: TareaCampoDto }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ fotoUrl: string; tarea: TareaCampoDto }>(`${this.baseUrl}/tareas/${id}/fotos`, form);
  }
}
