import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ParametroFiscalDto {
  id: string;
  regimen: string;
  descripcion: string;
  igi: number | null;
  dta: number | null;
  dtaFijo: number | null;
  iva: number;
  prevFijo: number;
  prvFijo: number;
  activo: boolean;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
}

export interface UpdateParametroFiscalRequest {
  igi?: number;
  dta?: number;
  dtaFijo?: number;
  iva: number;
  prevFijo: number;
  prvFijo: number;
  vigenteDesde: string;
}

interface ApiParametroFiscalDto {
  id: string;
  regimen: string;
  descripcion: string;
  igiPorcentaje: number | null;
  dtaPorcentaje: number | null;
  dtaFijo: number | null;
  ivaPorcentaje: number;
  prevFijo: number | null;
  prvFijo: number | null;
  activo: boolean;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
}

interface ApiUpdateParametroFiscalRequest {
  igiPorcentaje?: number;
  dtaPorcentaje?: number;
  dtaFijo?: number;
  ivaPorcentaje: number;
  prevFijo: number;
  prvFijo: number;
  vigenteDesde: string;
}

@Injectable({ providedIn: 'root' })
export class ParametrosFiscalesService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/admin/parametros-fiscales';

  getAll(): Observable<ParametroFiscalDto[]> {
    return this.http.get<ApiParametroFiscalDto[]>(this.baseUrl).pipe(
      map(items => items.map(item => ({
        id: item.id,
        regimen: item.regimen,
        descripcion: item.descripcion,
        igi: item.igiPorcentaje,
        dta: item.dtaPorcentaje,
        dtaFijo: item.dtaFijo,
        iva: item.ivaPorcentaje,
        prevFijo: item.prevFijo ?? 0,
        prvFijo: item.prvFijo ?? 0,
        activo: item.activo,
        vigenteDesde: item.vigenteDesde,
        vigenteHasta: item.vigenteHasta,
      }))),
    );
  }

  update(regimen: string, request: UpdateParametroFiscalRequest): Observable<ParametroFiscalDto> {
    const apiRequest: ApiUpdateParametroFiscalRequest = {
      igiPorcentaje: request.igi,
      dtaPorcentaje: request.dta,
      dtaFijo: request.dtaFijo,
      ivaPorcentaje: request.iva,
      prevFijo: request.prevFijo,
      prvFijo: request.prvFijo,
      vigenteDesde: request.vigenteDesde,
    };

    return this.http.put<ApiParametroFiscalDto>(`${this.baseUrl}/${regimen}`, apiRequest).pipe(
      map(item => ({
        id: item.id,
        regimen: item.regimen,
        descripcion: item.descripcion,
        igi: item.igiPorcentaje,
        dta: item.dtaPorcentaje,
        dtaFijo: item.dtaFijo,
        iva: item.ivaPorcentaje,
        prevFijo: item.prevFijo ?? 0,
        prvFijo: item.prvFijo ?? 0,
        activo: item.activo,
        vigenteDesde: item.vigenteDesde,
        vigenteHasta: item.vigenteHasta,
      })),
    );
  }
}
