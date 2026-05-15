import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AduanaDto {
  id: string;
  claveAduana: string;
  nombre: string;
  ciudad: string | null;
  estado: string | null;
}

@Injectable({ providedIn: 'root' })
export class AduanaService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5198/api/aduanas';

  getAll(): Observable<AduanaDto[]> {
    return this.http.get<AduanaDto[]>(this.baseUrl);
  }
}
