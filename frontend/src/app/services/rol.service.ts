import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PermisoDto {
  id: string;
  codigo: string;
  nombre: string;
  modulo: string;
}

export interface RolDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  permisos: PermisoDto[];
}

import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class RolService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/roles';

  getAll(): Observable<RolDto[]> {
    return this.http.get<RolDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<RolDto> {
    return this.http.get<RolDto>(`${this.baseUrl}/${id}`);
  }

  getAllPermisos(): Observable<PermisoDto[]> {
    return this.http.get<PermisoDto[]>(`${this.baseUrl}/permisos`);
  }

  updatePermisos(rolId: string, permisoIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${rolId}/permisos`, { permisoIds });
  }
}
