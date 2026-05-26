import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TareaEntregaDto {
  id: string;
  tramiteId: string;
  numeroConsecutivo: string;
  clienteNombre: string | null;
  vehiculoResumen: string;
  vin: string | null;
  vinCorto: string | null;
  choferUserId: string | null;
  choferNombre: string | null;
  estado: string;
  fotosUrls: string[];
  ubicacionEntrega: string | null;
  nombreRecibe: string | null;
  firmaBase64: string | null;
  incidencia: string | null;
  notasChofer: string | null;
  fechaCreacion: string;
  fechaTomada: string | null;
  fechaEntregado: string | null;
}

@Injectable({ providedIn: 'root' })
export class EntregaTareaService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/entregas-campo';

  getMias(): Observable<TareaEntregaDto[]> {
    return this.http.get<TareaEntregaDto[]>(`${this.baseUrl}/mias`);
  }

  getAll(estado?: string): Observable<TareaEntregaDto[]> {
    const url = estado ? `${this.baseUrl}?estado=${encodeURIComponent(estado)}` : this.baseUrl;
    return this.http.get<TareaEntregaDto[]>(url);
  }

  getById(id: string): Observable<TareaEntregaDto> {
    return this.http.get<TareaEntregaDto>(`${this.baseUrl}/${id}`);
  }

  crear(request: {
    tramiteId: string;
    choferUserId?: string | null;
    ubicacionEntrega?: string | null;
    notasChofer?: string | null;
  }): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(this.baseUrl, request);
  }

  tomar(id: string): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(`${this.baseUrl}/${id}/tomar`, {});
  }

  registrar(
    id: string,
    request: {
      fotosUrls: string[];
      ubicacionEntrega?: string | null;
      nombreRecibe?: string | null;
      firmaBase64?: string | null;
      notasChofer?: string | null;
      incidencia?: string | null;
    }
  ): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(`${this.baseUrl}/${id}/registrar`, request);
  }

  uploadFoto(id: string, file: File): Observable<{ fotoUrl: string; tarea: TareaEntregaDto }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ fotoUrl: string; tarea: TareaEntregaDto }>(
      `${this.baseUrl}/${id}/fotos`,
      form
    );
  }
}
