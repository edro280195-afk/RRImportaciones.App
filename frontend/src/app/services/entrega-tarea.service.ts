import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TareaEntregaDto {
  id: string;
  tramiteId: string;
  numeroConsecutivo: string;
  clienteNombre: string | null;
  vehiculoResumen: string;
  vin: string | null;
  vinCorto: string | null;
  choferUserId: string | null;
  choferNombre: string | null;
  estado: string;
  fotosUrls: string[];
  ubicacionEntrega: string | null;
  nombreRecibe: string | null;
  firmaBase64: string | null;
  incidencia: string | null;
  notasChofer: string | null;
  fechaCreacion: string;
  fechaTomada: string | null;
  fechaEntregado: string | null;
}

export interface VehiculoEntregaLookupDto {
  vehiculoId: string;
  vin: string;
  vinCorto: string | null;
  vehiculoResumen: string;
  clienteNombre: string | null;
  ubicacionActual: string | null;
  tramiteId: string | null;
  numeroConsecutivo: string | null;
  estadoTramite: string | null;
  yaEntregado: boolean;
}

export interface EntregaLinkResponseDto {
  tarea: TareaEntregaDto;
  enlace: string;
  tieneChoferAsignado: boolean;
  choferTienePin: boolean;
}

export interface EntregaAccesoDto {
  tareaId: string;
  numeroConsecutivo: string;
  vehiculoResumen: string;
  vin: string | null;
  estado: string;
  tieneChoferAsignado: boolean;
  choferNombre: string | null;
  choferTienePin: boolean;
  usuariosDisponibles: Array<{
    id: string;
    username: string;
    nombre: string;
    apellidos: string | null;
    tienePin: boolean;
  }>;
}

export interface ChoferEntregaDto {
  id: string;
  username: string;
  nombre: string;
  apellidos: string | null;
  tienePin: boolean;
}

@Injectable({ providedIn: 'root' })
export class EntregaTareaService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/api/entregas-campo';

  getMias(): Observable<TareaEntregaDto[]> {
    return this.http.get<TareaEntregaDto[]>(`${this.baseUrl}/mias`);
  }

  getAll(estado?: string): Observable<TareaEntregaDto[]> {
    const url = estado ? `${this.baseUrl}?estado=${encodeURIComponent(estado)}` : this.baseUrl;
    return this.http.get<TareaEntregaDto[]>(url);
  }

  getById(id: string): Observable<TareaEntregaDto> {
    return this.http.get<TareaEntregaDto>(`${this.baseUrl}/${id}`);
  }

  buscarVehiculos(query: string): Observable<VehiculoEntregaLookupDto[]> {
    return this.http.get<VehiculoEntregaLookupDto[]>(`${this.baseUrl}/vehiculos`, {
      params: new HttpParams().set('query', query),
    });
  }

  getChoferes(): Observable<ChoferEntregaDto[]> {
    return this.http.get<ChoferEntregaDto[]>(`${this.baseUrl}/choferes`);
  }

  registrarEntregaVehiculo(request: {
    vehiculoId?: string | null;
    vin?: string | null;
    ubicacionEntrega?: string | null;
    nombreRecibe?: string | null;
    notasChofer?: string | null;
  }): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(`${this.baseUrl}/vehiculos/registrar-entrega`, request);
  }

  crear(request: {
    tramiteId: string;
    choferUserId?: string | null;
    ubicacionEntrega?: string | null;
    notasChofer?: string | null;
  }): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(this.baseUrl, request);
  }

  asignarVehiculo(request: {
    vehiculoId: string;
    choferUserId?: string | null;
    ubicacionEntrega?: string | null;
    notasChofer?: string | null;
  }): Observable<EntregaLinkResponseDto> {
    return this.http.post<EntregaLinkResponseDto>(`${this.baseUrl}/asignar-vehiculo`, request);
  }

  regenerarEnlace(tareaId: string): Observable<EntregaLinkResponseDto> {
    return this.http.post<EntregaLinkResponseDto>(`${this.baseUrl}/${tareaId}/enlace`, {});
  }

  getAcceso(token: string): Observable<EntregaAccesoDto> {
    return this.http.get<EntregaAccesoDto>(`${this.baseUrl}/acceso/${encodeURIComponent(token)}`);
  }

  tomarPorEnlace(token: string): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(
      `${this.baseUrl}/acceso/${encodeURIComponent(token)}/tomar`,
      {}
    );
  }

  tomar(id: string): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(`${this.baseUrl}/${id}/tomar`, {});
  }

  registrar(
    id: string,
    request: {
      fotosUrls: string[];
      ubicacionEntrega?: string | null;
      nombreRecibe?: string | null;
      firmaBase64?: string | null;
      notasChofer?: string | null;
      incidencia?: string | null;
    }
  ): Observable<TareaEntregaDto> {
    return this.http.post<TareaEntregaDto>(`${this.baseUrl}/${id}/registrar`, request);
  }

  uploadFoto(id: string, file: File): Observable<{ fotoUrl: string; tarea: TareaEntregaDto }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ fotoUrl: string; tarea: TareaEntregaDto }>(
      `${this.baseUrl}/${id}/fotos`,
      form
    );
  }
}
