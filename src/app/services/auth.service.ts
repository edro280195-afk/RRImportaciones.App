import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfo {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  role: string;
  tenantId: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5198/api/auth';
  readonly user = signal<UserInfo | null>(null);
  readonly isAuthenticated = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadSession();
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((res) => this.setSession(res)),
      catchError((err) => {
        const msg = err.error?.message || 'Error al iniciar sesión';
        return throwError(() => new Error(msg));
      }),
    );
  }

  logout(): void {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap((res) => this.setSession(res)),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        }),
      );
  }

  private setSession(res: LoginResponse): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.user.set(res.user);
    this.isAuthenticated.set(true);
  }

  private loadSession(): void {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        this.user.set(JSON.parse(userData));
        this.isAuthenticated.set(true);
      } catch {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.user.set(null);
    this.isAuthenticated.set(false);
  }
}
