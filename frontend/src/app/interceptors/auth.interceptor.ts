import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse && err.status === 401 && token))
        return throwError(() => err);

      // Si ya estamos refrescando, esperar a que termine
      if (isRefreshing) {
        return refreshSubject.pipe(
          filter((result) => result !== null),
          take(1),
          switchMap((success) => {
            if (success) {
              const newToken = localStorage.getItem('token');
              return next(req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              }));
            }
            return throwError(() => err);
          }),
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return auth.refreshToken().pipe(
        switchMap((res) => {
          isRefreshing = false;
          refreshSubject.next(true);
          return next(req.clone({
            setHeaders: { Authorization: `Bearer ${res.token}` },
          }));
        }),
        catchError(() => {
          isRefreshing = false;
          refreshSubject.next(false);
          auth.clearSession();
          if (router.url.startsWith('/campo')) {
            router.navigateByUrl('/campo/pin');
          } else {
            router.navigate(['/login'], { queryParams: { session_expired: 'true' } });
          }
          return throwError(() => new Error('Sesion expirada'));
        }),
      );
    }),
  );
};
