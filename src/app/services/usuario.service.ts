import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UsuarioDto {
  id: string;
  username: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  roleId: string;
  rolNombre: string;
  activo: boolean;
  ultimoAcceso: string | null;
  fechaCreacion: string;
}

export interface CreateUsuarioRequest {
  username: string;
  nombre: string;
  apellidos?: string;
  email?: string;
  password: string;
  roleId: string;
  activo: boolean;
}

export interface UpdateUsuarioRequest {
  nombre: string;
  apellidos?: string;
  email?: string;
  roleId: string;
  activo: boolean;
  nuevoPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/usuarios';

  getAll(): Observable<UsuarioDto[]> {
    return this.http.get<UsuarioDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<UsuarioDto> {
    return this.http.get<UsuarioDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateUsuarioRequest): Observable<UsuarioDto> {
    return this.http.post<UsuarioDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateUsuarioRequest): Observable<UsuarioDto> {
    return this.http.put<UsuarioDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
