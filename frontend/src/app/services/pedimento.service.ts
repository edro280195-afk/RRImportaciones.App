import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PedimentoDto {
  id: string;
  tramiteId: string;
  numeroConsecutivo: string;
  numeroPedimento: string;
  tipo: string;
  fechaEntrada?: string;
  fechaPago?: string;
  clienteApodo?: string;
  clienteNombre?: string;
  estatus?: string;
  fechaCreacion: string;
}

import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class PedimentoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/api/pedimentos';

  getAll(search?: string): Observable<PedimentoDto[]> {
    const params: any = {};
    if (search) params.search = search;
    return this.http.get<PedimentoDto[]>(this.apiUrl, { params });
  }
}
