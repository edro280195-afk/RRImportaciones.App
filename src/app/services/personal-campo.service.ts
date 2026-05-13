import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PersonalCampoDto {
  id: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PersonalCampoService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/personal-campo';

  getAll(soloActivos = true): Observable<PersonalCampoDto[]> {
    return this.http.get<PersonalCampoDto[]>(`${this.baseUrl}?soloActivos=${soloActivos}`);
  }
}
