import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface BancoDto {
  id: string;
  identificador: string;
  nombre: string;
  titular: string | null;
  cuenta: string | null;
  clabe: string | null;
  moneda: string | null;
  notas: string | null;
  activo: boolean;
}

export interface GuardarBancoRequest {
  identificador: string;
  nombre: string;
  titular: string | null;
  cuenta: string | null;
  clabe: string | null;
  moneda: string | null;
  notas: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class BancoService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/bancos';

  getAll(soloActivos = true): Observable<BancoDto[]> {
    return this.http.get<BancoDto[]>(this.baseUrl, {
      params: new HttpParams().set('soloActivos', soloActivos),
    });
  }

  create(request: GuardarBancoRequest): Observable<BancoDto> {
    return this.http.post<BancoDto>(this.baseUrl, request);
  }

  update(id: string, request: GuardarBancoRequest): Observable<BancoDto> {
    return this.http.put<BancoDto>(`${this.baseUrl}/${id}`, request);
  }
}
