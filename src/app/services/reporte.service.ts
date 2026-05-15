import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConversionCotizacionesDto {
  totalEmitidas: number;
  totalAceptadas: number;
  totalRechazadas: number;
  totalExpiradas: number;
  tasaConversionGlobal: number;
  tiempoPromedioAceptacionDias: number;
  topClientes: { clienteId: string | null; cliente: string; totalCotizaciones: number }[];
}

export interface ReporteFinancieroDto {
  desde: string;
  hasta: string;
  cobradoTotal: number;
  porCobrarTotal: number;
  gastosHormigaTotal: number;
  gastosCargablesTotal: number;
  margenBruto: number;
  tramitesCerradosPeriodo: number;
  tramitesActivosActual: number;
  pagosPendientesVerificacion: number;
  pagosPendientesVerificacionMonto: number;
  evolucionMensual: { anno: number; mes: number; mesNombre: string; cobradoVerificado: number }[];
  gastosPorCategoria: { categoria: string; total: number; cantidad: number }[];
}

export interface EstadoCuentaClienteDto {
  clienteId: string;
  apodo: string;
  nombreCompleto?: string;
  telefono?: string;
  totalFacturado: number;
  totalPagado: number;
  saldoPendiente: number;
  tramites: { id: string; numeroConsecutivo: string; vehiculo: string; estatus: string; cobroTotal: number; totalPagado: number; saldo: number; fechaCreacion: string }[];
}

export interface ReportePipelineDto {
  totalActivos: number;
  estados: { estado: string; etiquetaCliente: string; cantidad: number; montoTotal: number; diasPromedioEnEstado: number }[];
}

export interface ReporteProductividadDto {
  desde: string;
  hasta: string;
  tramitadores: { tramitadorId: string; nombre: string; tramitesActivos: number; tramitesCerradosPeriodo: number; montoTotalCobrado: number; montoTotalVerificado: number; diasPromedioResolucion: number }[];
}

export interface GastoHormigaResumenDto {
  totalPeriodo: number;
  totalCargableCliente: number;
  totalCostoPropio: number;
  porCategoria: { categoria: string; total: number; cantidad: number }[];
  porCliente: { clienteId: string; cliente: string; total: number; cantidad: number }[];
  porTramitador: { tramitadorId: string; tramitador: string; total: number; cantidad: number }[];
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/reportes';

  financiero(desde?: string, hasta?: string): Observable<ReporteFinancieroDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteFinancieroDto>(`${this.baseUrl}/financiero`, { params });
  }

  estadoCuentaCliente(clienteId: string): Observable<EstadoCuentaClienteDto> {
    return this.http.get<EstadoCuentaClienteDto>(`${this.baseUrl}/clientes/${clienteId}/estado-cuenta`);
  }

  pipeline(): Observable<ReportePipelineDto> {
    return this.http.get<ReportePipelineDto>(`${this.baseUrl}/pipeline`);
  }

  tramitadores(desde?: string, hasta?: string): Observable<ReporteProductividadDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteProductividadDto>(`${this.baseUrl}/tramitadores`, { params });
  }

  gastosHormiga(desde?: string, hasta?: string): Observable<GastoHormigaResumenDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<GastoHormigaResumenDto>(`${this.baseUrl}/gastos-hormiga`, { params });
  }

  conversionCotizaciones(desde?: string, hasta?: string): Observable<ConversionCotizacionesDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ConversionCotizacionesDto>(`${this.baseUrl}/cotizaciones`, { params });
  }
}
