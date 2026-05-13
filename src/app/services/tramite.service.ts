import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TramiteListDto {
  id: string;
  numeroConsecutivo: string;
  fechaCreacion: string;
  clienteApodo: string | null;
  clienteNombre: string | null;
  vehiculoVinCorto: string | null;
  vehiculoMarcaModelo: string | null;
  aduanaNombre: string | null;
  tramitadorNombre: string | null;
  estatus: string;
  tipoTramite: string;
  cobroTotal: number;
  cargoExpress: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaEstadoActual: string | null;
  diasEnEstado: number;
}

export interface TramiteEventoDto {
  id: string;
  tipo: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  contenido: string;
  fotoUrl: string | null;
  fechaEvento: string;
  creadoPorNombre: string | null;
}

export interface TramitePedimentoDto {
  id: string;
  numeroPedimento: string;
  tipo: string;
  fechaEntrada: string | null;
  patente: string | null;
  igi: number | null;
  dta: number | null;
  iva: number | null;
  totalContribuciones: number | null;
  estatus: string | null;
  motivoRectificacion: string | null;
  responsableError: string | null;
  cobroAdicional: number;
}

export interface TramitePagoDto {
  id: string;
  monto: number;
  moneda: string;
  tipoCambio: number | null;
  metodo: string;
  banco: string | null;
  referencia: string | null;
  fechaPago: string;
  verificado: boolean;
}

export interface TramiteGastoDto {
  id: string;
  tipoGasto: string;
  concepto: string;
  monto: number;
  moneda: string;
  seCargaAlCliente: boolean;
  comprobanteUrl: string | null;
  fechaGasto: string;
}

export interface TramiteEntregaDto {
  id: string;
  responsableCampoNombre: string | null;
  recibidoPorPartnerNombre: string | null;
  descripcion: string | null;
  ubicacionEntrega: string | null;
  documentosEntregados: string[];
  fechaEntrega: string;
}

export interface TramiteDetailDto {
  id: string;
  numeroConsecutivo: string;
  clienteId: string | null;
  clienteApodo: string | null;
  clienteNombre: string | null;
  vehiculoId: string | null;
  vehiculoVin: string | null;
  vehiculoVinCorto: string | null;
  vehiculoMarca: string | null;
  vehiculoModelo: string | null;
  vehiculoAnno: number | null;
  descripcionMercancia: string | null;
  aduanaId: string | null;
  aduanaNombre: string | null;
  tramitadorId: string | null;
  tramitadorNombre: string | null;
  tipoTramite: string;
  estatus: string;
  cobroTotal: number;
  honorarios: number;
  cargoExpress: number;
  totalPagado: number;
  saldoPendiente: number;
  notas: string | null;
  fechaInicio: string | null;
  fechaEstadoActual: string | null;
  diasEnEstado: number;
  fechaCreacion: string;
  fechaModificacion: string | null;
  eventos: TramiteEventoDto[];
  pedimentos: TramitePedimentoDto[];
  pagos: TramitePagoDto[];
  gastosHormiga: TramiteGastoDto[];
  entregas: TramiteEntregaDto[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TramiteDashboardDto {
  activos: number;
  verdesEsteMes: number;
  amarillosPendientePago: number;
  cobradoMes: number;
  porCobrar: number;
  vehiculosEnPatio: number;
}

export interface CreateTramiteRequest {
  clienteId: string;
  vehiculoId?: string;
  descripcionMercancia?: string;
  aduanaId?: string;
  tramitadorId?: string;
  tipoTramite: string;
  cobroTotal: number;
  honorarios: number;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class TramiteService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/tramites';

  getList(params: {
    search?: string;
    estado?: string;
    tramitadorId?: string;
    clienteId?: string;
    aduanaId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<TramiteListDto>> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.tramitadorId) p = p.set('tramitadorId', params.tramitadorId);
    if (params.clienteId) p = p.set('clienteId', params.clienteId);
    if (params.aduanaId) p = p.set('aduanaId', params.aduanaId);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    if (params.orderBy) p = p.set('orderBy', params.orderBy);
    if (params.orderDir) p = p.set('orderDir', params.orderDir);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<PagedResult<TramiteListDto>>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<TramiteDetailDto> {
    return this.http.get<TramiteDetailDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTramiteRequest): Observable<TramiteDetailDto> {
    return this.http.post<TramiteDetailDto>(this.baseUrl, request);
  }

  update(id: string, request: any): Observable<TramiteDetailDto> {
    return this.http.put<TramiteDetailDto>(`${this.baseUrl}/${id}`, request);
  }

  cambiarEstado(id: string, request: { nuevoEstado: string; notas?: string; fechaEvento?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/cambiar-estado`, request);
  }

  agregarPedimento(id: string, request: {
    numeroPedimento: string;
    tipo: string;
    fechaEntrada?: string;
    motivoRectificacion?: string;
    responsableError?: string;
    cobroAdicional?: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/pedimentos`, request);
  }

  agregarEntrega(id: string, request: {
    responsableCampoId?: string;
    recibidoPorPartnerId?: string;
    descripcion?: string;
    ubicacionEntrega?: string;
    documentosEntregados?: string[];
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/entregas`, request);
  }

  agregarNota(id: string, contenido: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/notas`, { contenido });
  }

  getDashboard(): Observable<TramiteDashboardDto> {
    return this.http.get<TramiteDashboardDto>(`${this.baseUrl}/dashboard`);
  }
}
