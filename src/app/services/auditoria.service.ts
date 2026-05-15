import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditoriaLogDto {
  id: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  valoresAnteriores: string | null;
  valoresNuevos: string | null;
  ipAddress: string | null;
  fecha: string;
}

export interface AuditoriaPagedResult {
  total: number;
  page: number;
  pageSize: number;
  items: AuditoriaLogDto[];
}

export interface AuditoriaFiltros {
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/auditoria';

  getAll(filtros: AuditoriaFiltros = {}): Observable<AuditoriaPagedResult> {
    let params = new HttpParams();
    if (filtros.entidad) params = params.set('entidad', filtros.entidad);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.page) params = params.set('page', filtros.page.toString());
    if (filtros.pageSize) params = params.set('pageSize', filtros.pageSize.toString());
    return this.http.get<AuditoriaPagedResult>(this.baseUrl, { params });
  }
}
