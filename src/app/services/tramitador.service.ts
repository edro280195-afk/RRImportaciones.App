import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TramitadorDto {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  comisionTipo: string;
  comisionValor: number;
}

@Injectable({ providedIn: 'root' })
export class TramitadorService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/tramitadores';

  getAll(soloActivos = true): Observable<TramitadorDto[]> {
    return this.http.get<TramitadorDto[]>(`${this.baseUrl}?soloActivos=${soloActivos}`);
  }

  getById(id: string): Observable<TramitadorDto> {
    return this.http.get<TramitadorDto>(`${this.baseUrl}/${id}`);
  }
}
