import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PortalTramiteDto {
  id: string;
  numeroConsecutivo: string;
  estatus: string;
  estatusCliente: string;
  estatusDescripcion: string;
  progreso: number;
  fechaCreacion: string;
  fechaEstadoActual: string | null;
  clienteNombre: string;
  vehiculoResumen: string;
  vehiculoVinCorto: string | null;
  aduanaNombre: string | null;
  tipoTramite: string | null;
  pagosResumen: PortalMoneySummaryDto;
  timeline: PortalTimelineItemDto[];
  pagos: PortalPagoDto[];
  documentos: PortalDocumentoDto[];
  contacto: PortalContactDto;
}

export interface PortalMoneySummaryDto {
  total: number;
  pagado: number;
  pendiente: number;
  pendienteVerificacion: number;
  cubiertoPorRr: number;
}

export interface PortalTimelineItemDto {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  completado: boolean;
  fotoUrl: string | null;
}

export interface PortalPagoDto {
  id: string;
  monto: number;
  moneda: string;
  metodo: string;
  banco: string | null;
  referencia: string | null;
  fechaPago: string;
  verificado: boolean;
}

export interface PortalDocumentoDto {
  tipo: string;
  titulo: string;
  url: string | null;
  fecha: string | null;
}

export interface PortalContactDto {
  nombre: string;
  email: string;
  telefono: string;
  whatsApp: string;
}

@Injectable({ providedIn: 'root' })
export class PortalService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/portal';

  getTramite(id: string): Observable<PortalTramiteDto> {
    return this.http.get<PortalTramiteDto>(`${this.baseUrl}/tramites/${id}`);
  }
}
