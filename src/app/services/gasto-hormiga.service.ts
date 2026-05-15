import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GastoHormigaListDto {
  id: string;
  tramiteId: string | null;
  clienteId: string | null;
  vehiculoId: string | null;
  tipoGastoId: string;
  numeroConsecutivo: string | null;
  clienteNombre: string | null;
  vehiculoVin: string | null;
  tipoGasto: string;
  concepto: string;
  monto: number;
  moneda: string;
  seCargaAlCliente: boolean;
  comprobanteUrl: string | null;
  fechaGasto: string;
}

export interface CreateGastoHormigaRequest {
  tramiteId?: string | null;
  clienteId?: string | null;
  vehiculoId?: string | null;
  tipoGastoId: string;
  concepto: string;
  monto: number;
  moneda: string;
  gastoUsd?: number | null;
  comprobanteUrl?: string | null;
  seCargaAlCliente: boolean;
  fechaGasto: string;
}

export interface UpdateGastoHormigaRequest extends CreateGastoHormigaRequest {}

export interface GastoHormigaResumenDto {
  totalPeriodo: number;
  totalCargableCliente: number;
  totalCostoPropio: number;
  porCategoria: GastoHormigaCategoriaDto[];
  porCliente: GastoHormigaClienteDto[];
  porTramitador: GastoHormigaTramitadorDto[];
}

export interface GastoHormigaCategoriaDto {
  categoria: string;
  total: number;
  cantidad: number;
}

export interface GastoHormigaClienteDto {
  clienteId: string | null;
  cliente: string;
  total: number;
  cantidad: number;
}

export interface GastoHormigaTramitadorDto {
  tramitadorId: string | null;
  tramitador: string;
  total: number;
  cantidad: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TipoGastoDto {
  id: string;
  categoria: string;
  nombre: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class GastoHormigaService {
  private http = inject(HttpClient);

  private baseUrl = 'http://localhost:5198/api/gastos-hormiga';
  private tiposUrl = 'http://localhost:5198/api/tipos-gasto';

  getList(params: {
    tramiteId?: string;
    clienteId?: string;
    vehiculoId?: string;
    tipoGastoId?: string;
    categoria?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<GastoHormigaListDto>> {
    let httpParams = new HttpParams();
    if (params.tramiteId) httpParams = httpParams.set('tramiteId', params.tramiteId);
    if (params.clienteId) httpParams = httpParams.set('clienteId', params.clienteId);
    if (params.vehiculoId) httpParams = httpParams.set('vehiculoId', params.vehiculoId);
    if (params.tipoGastoId) httpParams = httpParams.set('tipoGastoId', params.tipoGastoId);
    if (params.categoria) httpParams = httpParams.set('categoria', params.categoria);
    if (params.fechaDesde) httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResult<GastoHormigaListDto>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<GastoHormigaListDto> {
    return this.http.get<GastoHormigaListDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateGastoHormigaRequest): Observable<GastoHormigaListDto> {
    return this.http.post<GastoHormigaListDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateGastoHormigaRequest): Observable<GastoHormigaListDto> {
    return this.http.put<GastoHormigaListDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getResumen(fechaDesde?: string, fechaHasta?: string): Observable<GastoHormigaResumenDto> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
    return this.http.get<GastoHormigaResumenDto>(`${this.baseUrl}/resumen`, { params });
  }

  getTiposGasto(): Observable<TipoGastoDto[]> {
    return this.http.get<TipoGastoDto[]>(this.tiposUrl);
  }
}
