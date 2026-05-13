import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ImportResultDto {
  dryRun: boolean;
  registrosDetectados: number;
  insertados: number;
  saltados: number;
  rechazados: number;
  warnings: string[];
  errores: string[];
  log: string[];
  logPath: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminImportadorService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5198/api/admin/importador';

  validar(file: File): Observable<ImportResultDto> {
    return this.send('validar', file);
  }

  importar(file: File): Observable<ImportResultDto> {
    return this.send('importar', file);
  }

  private send(action: 'validar' | 'importar', file: File): Observable<ImportResultDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportResultDto>(`${this.baseUrl}/${action}`, form);
  }
}
