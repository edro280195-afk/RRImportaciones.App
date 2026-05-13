import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PartnerExternoDto {
  id: string;
  nombre: string;
  aliases: string[];
  tipo: string;
  notas: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PartnerExternoService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/partners-externos';

  getAll(soloActivos = true): Observable<PartnerExternoDto[]> {
    return this.http.get<PartnerExternoDto[]>(`${this.baseUrl}?soloActivos=${soloActivos}`);
  }
}
