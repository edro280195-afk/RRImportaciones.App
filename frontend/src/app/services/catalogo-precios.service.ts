import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface PrecioAntiguedadDto {
  id: string;
  antiguedadAnios: number;
  precioUsd: number;
}

export interface CatalogoPrecioListDto {
  id: string;
  fraccion: string;
  fraccionDescripcion: string;
  tipoVehiculo: string | null;
  marcaId: string | null;
  marcaTexto: string;
  modelo: string;
  categoria: string;
  inciso: string | null;
  esGenerico: boolean;
  hojaOrigen: string | null;
  aniosDisponibles: number[];
  precioMinUsd: number | null;
  precioMaxUsd: number | null;
}

export interface CatalogoPrecioDetailDto extends CatalogoPrecioListDto {
  precios: PrecioAntiguedadDto[];
}

export interface CatalogoStatsDto {
  totalEntradas: number;
  totalFracciones: number;
  entradasGenericas: number;
  entradasEspecificas: number;
}

export interface UpdateCatalogoPrecioRequest {
  marcaTexto: string;
  modelo: string;
  categoria: string;
  inciso: string | null;
  hojaOrigen: string | null;
  esGenerico: boolean;
  precios: { id: string; precioUsd: number }[];
}

export interface CreateCatalogoPrecioRequest {
  fraccionCodigo: string;
  marcaTexto: string;
  modelo: string;
  categoria: string;
  inciso: string | null;
  hojaOrigen: string | null;
  esGenerico: boolean;
  precios: { antiguedadAnios: number; precioUsd: number }[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CatalogoPreciosService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/admin/catalogo-precios';

  getList(params: {
    search?: string;
    fraccion?: string;
    marcaId?: string;
    tipoVehiculo?: string;
    esGenerico?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<CatalogoPrecioListDto>> {
    let p = new HttpParams();
    if (params.search)       p = p.set('search', params.search);
    if (params.fraccion)     p = p.set('fraccion', params.fraccion);
    if (params.marcaId)      p = p.set('marcaId', params.marcaId);
    if (params.tipoVehiculo) p = p.set('tipoVehiculo', params.tipoVehiculo);
    if (params.esGenerico !== undefined) p = p.set('esGenerico', String(params.esGenerico));
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 50);
    return this.http.get<PagedResult<CatalogoPrecioListDto>>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<CatalogoPrecioDetailDto> {
    return this.http.get<CatalogoPrecioDetailDto>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<CatalogoStatsDto> {
    return this.http.get<CatalogoStatsDto>(`${this.baseUrl}/stats`);
  }

  create(request: CreateCatalogoPrecioRequest): Observable<CatalogoPrecioDetailDto> {
    return this.http.post<CatalogoPrecioDetailDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateCatalogoPrecioRequest): Observable<CatalogoPrecioDetailDto> {
    return this.http.put<CatalogoPrecioDetailDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
