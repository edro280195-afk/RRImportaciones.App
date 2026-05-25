import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoteVehiculoItemRequest {
  vehiculoId?: string | null;
  vin?: string | null;
  marcaId?: string | null;
  marcaTexto?: string | null;
  modelo?: string | null;
  anno?: number | null;
  cilindradaCm3?: number | null;
  categoria?: string | null;
  color?: string | null;
  valorFactura?: number | null;
  moneda: string;
  descripcionMercancia?: string | null;
  cobroTotal: number;
  honorarios: number;
  tipoTramite?: string | null;
  notas?: string | null;
}

export interface CreateLoteRequest {
  clienteId: string;
  aduanaId?: string | null;
  tramitadorId?: string | null;
  tipoTramite: string;
  notas?: string | null;
  vehiculos: LoteVehiculoItemRequest[];
}

export interface LoteListDto {
  id: string;
  folioLote: string;
  estado: string;
  clienteId: string;
  clienteApodo: string | null;
  clienteNombre: string | null;
  aduanaNombre: string | null;
  tramitadorNombre: string | null;
  totalTramites: number;
  tramitesCompletados: number;
  tramitesPendientes: number;
  montoTotal: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaCruce: string | null;
  fechaCreacion: string;
}

export interface LoteTramiteItemDto {
  id: string;
  numeroConsecutivo: string;
  vehiculoId: string | null;
  vehiculoVin: string | null;
  vehiculoVinCorto: string | null;
  vehiculoMarcaModelo: string | null;
  descripcionMercancia: string | null;
  estadoLogistico: string;
  cobroTotal: number;
  cargoExpress: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaCreacion: string;
}

export interface LoteDetailDto extends LoteListDto {
  aduanaId: string | null;
  tramitadorId: string | null;
  tipoTramite: string;
  notas: string | null;
  fechaModificacion: string | null;
  tramites: LoteTramiteItemDto[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class LoteImportacionService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/lotes';

  getList(params: {
    search?: string;
    estado?: string;
    clienteId?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<LoteListDto>> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.clienteId) p = p.set('clienteId', params.clienteId);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<PagedResult<LoteListDto>>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<LoteDetailDto> {
    return this.http.get<LoteDetailDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateLoteRequest): Observable<LoteDetailDto> {
    return this.http.post<LoteDetailDto>(this.baseUrl, request);
  }

  cancelar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  removerVehiculo(loteId: string, tramiteId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${loteId}/vehiculos/${tramiteId}`);
  }

  descargarPdf(id: string): void {
    window.open(`${this.baseUrl}/${id}/pdf`, '_blank');
  }

  enviarWhatsApp(id: string, telefono: string, mensajePersonalizado?: string): Observable<{ pdfUrl: string, mensaje: string, whatsappUrl: string }> {
    return this.http.post<{ pdfUrl: string, mensaje: string, whatsappUrl: string }>(`${this.baseUrl}/${id}/whatsapp`, { telefono, mensajePersonalizado });
  }
}
