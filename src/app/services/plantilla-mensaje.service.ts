import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlantillaMensajeDto {
  id: string;
  codigo: string;
  asunto: string | null;
  cuerpo: string;
  variablesDisponibles: string;
  activa: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface GuardarPlantillaMensajeRequest {
  codigo: string;
  asunto: string | null;
  cuerpo: string;
  variablesDisponibles: string;
  activa: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlantillaMensajeService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/admin/plantillas';

  getAll(): Observable<PlantillaMensajeDto[]> {
    return this.http.get<PlantillaMensajeDto[]>(this.baseUrl);
  }

  crear(request: GuardarPlantillaMensajeRequest): Observable<PlantillaMensajeDto> {
    return this.http.post<PlantillaMensajeDto>(this.baseUrl, request);
  }

  actualizar(id: string, request: GuardarPlantillaMensajeRequest): Observable<PlantillaMensajeDto> {
    return this.http.put<PlantillaMensajeDto>(`${this.baseUrl}/${id}`, request);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
