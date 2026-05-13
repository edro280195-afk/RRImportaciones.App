import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CotizacionInput {
  vin: string | null;
  marcaId: string | null;
  marca: string | null;
  modelo: string | null;
  anno: number | null;
  cilindradaCm3: number | null;
  tipoVehiculo: string | null;
  valorAduanaUsdOverride: number | null;
  tcMargen: number;
  tipoTramite: string;
  honorariosOverride: number | null;
}

export interface GuardarCotizacionRequest extends CotizacionInput {
  folio: string | null;
  clienteId: string | null;
  notas: string | null;
  fechaExpiracion: string | null;
}

export interface CotizacionOutput {
  id: string | null;
  folio: string | null;
  clienteId: string | null;
  estado: string;
  vin: string | null;
  marcaId: string | null;
  marca: string | null;
  modelo: string | null;
  anno: number | null;
  cilindradaCm3: number | null;
  categoria: string;
  fraccion: string;
  regimenFiscal: string;
  fuentePrecio: string;
  valorAduanaUsd: number | null;
  valorPesos: number;
  tipoCambioReferencia: number | null;
  tipoCambioAplicado: number | null;
  tipoCambioStale: boolean;
  igiPorcentaje: number;
  igi: number;
  dta: number;
  iva: number;
  prev: number;
  prv: number;
  impuestosTotal: number;
  honorarios: number;
  cargoExpress: number;
  total: number;
  notas: string | null;
  fechaExpiracion: string | null;
}

export interface CotizacionListDto {
  id: string;
  folio: string | null;
  estado: string;
  clienteNombre: string | null;
  vin: string | null;
  vehiculo: string | null;
  anno: number | null;
  total: number;
  fechaCreacion: string;
  fechaExpiracion: string | null;
}

export interface VehicleDecodedDto {
  vin: string;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  manufacturer: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
  engineCylinders: number | null;
  displacementCC: number | null;
  fuelTypePrimary: string | null;
  plantCountry: string | null;
}

export interface TipoCambioDto {
  fecha: string;
  tipoCambio: number;
  fuente: string;
  isStale: boolean;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/cotizaciones';

  calcular(input: CotizacionInput): Observable<CotizacionOutput> {
    return this.http.post<CotizacionOutput>(`${this.baseUrl}/calcular`, input);
  }

  crear(request: GuardarCotizacionRequest): Observable<CotizacionOutput> {
    return this.http.post<CotizacionOutput>(this.baseUrl, request);
  }

  getList(params: { search?: string; estado?: string; clienteId?: string; page?: number; pageSize?: number }): Observable<PagedResult<CotizacionListDto>> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.clienteId) p = p.set('clienteId', params.clienteId);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<PagedResult<CotizacionListDto>>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<CotizacionOutput> {
    return this.http.get<CotizacionOutput>(`${this.baseUrl}/${id}`);
  }

  decodeVin(vin: string): Observable<VehicleDecodedDto> {
    return this.http.get<VehicleDecodedDto>(`${this.baseUrl}/decode-vin/${vin}`);
  }

  getTipoCambio(): Observable<TipoCambioDto> {
    return this.http.get<TipoCambioDto>(`${this.baseUrl}/tipo-cambio`);
  }

  aceptar(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/aceptar`, {});
  }

  rechazar(id: string, motivo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/rechazar`, { motivo });
  }
}
