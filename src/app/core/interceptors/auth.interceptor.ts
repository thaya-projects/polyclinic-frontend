import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Skip attaching tokens to auth endpoints to avoid loops
const AUTH_ENDPOINTS = ['/Auth/login', '/Auth/refresh', '/Auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getAccessToken();

  const isAuthEndpoint = AUTH_ENDPOINTS.some(e => req.url.includes(e));

  const outgoing = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthEndpoint) {
        return auth.refresh().pipe(
          switchMap(res => {
            if (!res) return throwError(() => err);
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${auth.getAccessToken()!}` },
            });
            return next(retried);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
