import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = localStorage.getItem('token');

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && token) {
        return auth.refreshToken().pipe(
          switchMap((res) => {
            const cloned = req.clone({
              setHeaders: { Authorization: `Bearer ${res.token}` },
            });
            return next(cloned);
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => new Error('Sesión expirada'));
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
