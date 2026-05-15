import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MarcaDto {
  id: string;
  nombre: string;
  aliases: string[];
  activo: boolean;
}

export interface SaveMarcaRequest {
  nombre: string;
  aliases: string[];
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class MarcaService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/marcas';

  getAll(soloActivas = false): Observable<MarcaDto[]> {
    return this.http.get<MarcaDto[]>(`${this.baseUrl}?soloActivas=${soloActivas}`);
  }

  getById(id: string): Observable<MarcaDto> {
    return this.http.get<MarcaDto>(`${this.baseUrl}/${id}`);
  }

  create(request: SaveMarcaRequest): Observable<MarcaDto> {
    return this.http.post<MarcaDto>(this.baseUrl, request);
  }

  update(id: string, request: SaveMarcaRequest): Observable<MarcaDto> {
    return this.http.put<MarcaDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
