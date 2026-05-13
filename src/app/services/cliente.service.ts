import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClienteListDto {
  id: string;
  apodo: string;
  nombreCompleto: string | null;
  telefono: string | null;
  email: string | null;
  procedencia: string | null;
  totalVehiculos: number;
  totalTramites: number;
  totalFacturado: number;
  fechaRegistro: string;
}

export interface VehiculoSimpleDto {
  id: string;
  vin: string;
  marcaNombre: string | null;
  modeloNombre: string | null;
  anno: number | null;
}

export interface TramiteSimpleDto {
  id: string;
  numeroConsecutivo: string;
  estatus: string;
  fechaCreacion: string;
}

export interface ClienteDetailDto extends ClienteListDto {
  notas: string | null;
  rfc: string | null;
  direccion: string | null;
  vehiculos: VehiculoSimpleDto[];
  ultimosTramites: TramiteSimpleDto[];
  saldoPendiente: number;
}

export interface CreateClienteRequest {
  apodo: string;
  nombreCompleto: string | null;
  rfc: string | null;
  telefono: string | null;
  email: string | null;
  procedencia: string | null;
  direccion: string | null;
  notas: string | null;
}

export type UpdateClienteRequest = CreateClienteRequest;

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/clientes';

  getList(params: {
    search?: string;
    procedencia?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<ClienteListDto>> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.procedencia) p = p.set('procedencia', params.procedencia);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<PagedResult<ClienteListDto>>(this.baseUrl, { params: p });
  }

  getById(id: string): Observable<ClienteDetailDto> {
    return this.http.get<ClienteDetailDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateClienteRequest): Observable<ClienteDetailDto> {
    return this.http.post<ClienteDetailDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateClienteRequest): Observable<ClienteDetailDto> {
    return this.http.put<ClienteDetailDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  searchAutocomplete(q: string): Observable<ClienteListDto[]> {
    return this.http.get<ClienteListDto[]>(`${this.baseUrl}/search`, {
      params: new HttpParams().set('q', q),
    });
  }
}
