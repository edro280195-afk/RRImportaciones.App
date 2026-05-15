import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PagoListDto {
  id: string;
  tramiteId: string;
  numeroConsecutivo: string;
  clienteNombre: string | null;
  monto: number;
  moneda: string;
  tipoCambio: number | null;
  tipoMovimiento: string;
  pagadoPor: string;
  seCobraAlCliente: boolean;
  metodo: string;
  banco: string | null;
  referencia: string | null;
  comprobanteUrl: string | null;
  folioRecibo: string | null;
  reciboPagoUrl: string | null;
  reciboGeneradoEn: string | null;
  fechaPago: string;
  verificado: boolean;
  fechaRegistro: string;
}

export interface PagoDetailDto extends PagoListDto {
  notas: string | null;
  verificadoPorNombre: string | null;
  verificadoEn: string | null;
  registradoPor: string;
}

export interface PagoResumenDto {
  cobroTotal: number;
  totalPagado: number;
  totalVerificado: number;
  saldoPendiente: number;
}

export interface CreatePagoRequest {
  tramiteId: string;
  monto: number;
  moneda: string;
  tipoCambio?: number | null;
  tipoMovimiento?: string;
  pagadoPor?: string;
  seCobraAlCliente?: boolean;
  metodo: string;
  banco?: string | null;
  referencia?: string | null;
  comprobanteUrl?: string | null;
  notas?: string | null;
  fechaPago: string;
}

export interface UpdatePagoRequest extends CreatePagoRequest {}

export interface PagoVerificarResponse {
  tramiteCobrado: boolean;
  mensaje: string;
}

export interface PagoComprobanteResponse {
  pagoId: string;
  comprobanteUrl?: string | null;
}

export interface PagoReciboResponse {
  pagoId: string;
  folioRecibo: string;
  reciboPagoUrl: string;
  reciboGeneradoEn: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private http = inject(HttpClient);

  private baseUrl = 'http://localhost:5198/api/pagos';

  getList(params: {
    tramiteId?: string;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    verificado?: boolean;
    metodo?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<PagoListDto>> {
    let httpParams = new HttpParams();
    if (params.tramiteId) httpParams = httpParams.set('tramiteId', params.tramiteId);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.fechaDesde) httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    if (params.verificado != null) httpParams = httpParams.set('verificado', params.verificado);
    if (params.metodo) httpParams = httpParams.set('metodo', params.metodo);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResult<PagoListDto>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<PagoDetailDto> {
    return this.http.get<PagoDetailDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreatePagoRequest): Observable<PagoDetailDto> {
    return this.http.post<PagoDetailDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdatePagoRequest): Observable<PagoDetailDto> {
    return this.http.put<PagoDetailDto>(`${this.baseUrl}/${id}`, request);
  }

  verificar(id: string): Observable<PagoVerificarResponse> {
    return this.http.post<PagoVerificarResponse>(`${this.baseUrl}/${id}/verificar`, {});
  }

  verificarBulk(pagoIds: string[]): Observable<PagoVerificarResponse> {
    return this.http.post<PagoVerificarResponse>(`${this.baseUrl}/verificar-bulk`, { pagoIds });
  }

  uploadComprobante(id: string, file: File): Observable<PagoComprobanteResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<PagoComprobanteResponse>(`${this.baseUrl}/${id}/comprobante`, form);
  }

  reciboUrl(id: string): string {
    return `${this.baseUrl}/${id}/recibo`;
  }

  regenerarRecibo(id: string): Observable<PagoReciboResponse> {
    return this.http.post<PagoReciboResponse>(`${this.baseUrl}/${id}/recibo/regenerar`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getResumen(tramiteId: string): Observable<PagoResumenDto> {
    return this.http.get<PagoResumenDto>(`${this.baseUrl}/resumen/${tramiteId}`);
  }
}
