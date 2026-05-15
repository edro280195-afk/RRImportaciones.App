import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

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
            alert('Tu sesion expiro. Vuelve a iniciar sesion para continuar.');
            auth.logout();
            return throwError(() => new Error('Sesion expirada'));
          }),
        );
      }

      return throwError(() => err);
    }),
  );
};
