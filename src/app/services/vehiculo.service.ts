import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VehiculoListDto {
  id: string;
  vin: string;
  vinCorto: string | null;
  marcaNombre: string | null;
  modeloNombre: string | null;
  anno: number | null;
  clienteApodo: string | null;
  fechaIngresoPatio: string | null;
  ubicacionActual: string | null;
  tieneTramiteActivo: boolean;
  cumplioRequisitos: boolean;
  tieneSelloAduanal: boolean;
  fotosCount?: number;
  fotoPreviewUrl?: string | null;
}

export interface TramiteSimpleDto {
  id: string;
  numeroConsecutivo: string;
  estatus: string;
  fechaCreacion: string;
}

export interface VehiculoDetailDto extends VehiculoListDto {
  cilindradaCm3: number | null;
  categoria: string | null;
  fraccionArancelaria: string | null;
  color: string | null;
  numMotor: string | null;
  valorFactura: number | null;
  moneda: string;
  fechaPedimentoProforma: string | null;
  fechaRegistro: string;
  historialTramites: TramiteSimpleDto[];
}

export interface CreateVehiculoRequest {
  vin: string | null;
  marcaId: string;
  modelo: string | null;
  anno: number | null;
  cilindradaCm3: number | null;
  categoria: string | null;
  clienteId: string;
  color: string | null;
  valorFactura: number | null;
  moneda: string;
  numMotor: string | null;
  numSerie: string | null;
  fechaIngresoPatio: string | null;
  ubicacionActual: string | null;
  cumplioRequisitos: boolean;
  tieneSelloAduanal: boolean;
}

export interface UpdateInventarioRequest {
  ubicacionActual: string | null;
  cumplioRequisitos: boolean;
  tieneSelloAduanal: boolean;
  fechaPedimentoProforma: string | null;
}

export interface MarcaDto {
  id: string;
  nombre: string;
  aliases: string[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class VehiculoService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/vehiculos';
  private readonly marcasUrl = 'http://localhost:5198/api/marcas';

  getList(params: {
    search?: string;
    clienteId?: string;
    clienteNombre?: string;
    marcaId?: string;
    annoMin?: number;
    annoMax?: number;
    enPatio?: boolean;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<VehiculoListDto>> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.clienteId) p = p.set('clienteId', params.clienteId);
    if (params.clienteNombre) p = p.set('clienteNombre', params.clienteNombre);
    if (params.marcaId) p = p.set('marcaId', params.marcaId);
    if (params.annoMin) p = p.set('annoMin', params.annoMin);
    if (params.annoMax) p = p.set('annoMax', params.annoMax);
    if (params.enPatio !== undefined) p = p.set('enPatio', params.enPatio);
    if (params.orderBy) p = p.set('orderBy', params.orderBy);
    if (params.orderDir) p = p.set('orderDir', params.orderDir);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<PagedResult<VehiculoListDto>>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<VehiculoDetailDto> {
    return this.http.get<VehiculoDetailDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateVehiculoRequest): Observable<VehiculoDetailDto> {
    return this.http.post<VehiculoDetailDto>(this.baseUrl, request);
  }

  update(id: string, request: CreateVehiculoRequest): Observable<VehiculoDetailDto> {
    return this.http.put<VehiculoDetailDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  updateInventario(id: string, request: UpdateInventarioRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/${id}/inventario`, request);
  }

  getInventarioActual(): Observable<VehiculoListDto[]> {
    return this.http.get<VehiculoListDto[]>(`${this.baseUrl}/inventario`);
  }

  searchMarcas(q: string): Observable<MarcaDto[]> {
    return this.http.get<MarcaDto[]>(`${this.marcasUrl}/search`, {
      params: new HttpParams().set('q', q),
    });
  }

  getMarcas(): Observable<MarcaDto[]> {
    return this.http.get<MarcaDto[]>(this.marcasUrl);
  }
}
