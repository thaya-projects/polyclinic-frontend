import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../services/error.service';
import { ApiError } from '../models/api-error.model';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Auth endpoints handle their own errors; don't double-emit
      const isAuthRoute = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
      if (!isAuthRoute) {
        const apiError: ApiError = error.error?.message
          ? (error.error as ApiError)
          : { type: 'Unknown', message: 'Ha ocurrido un error inesperado.', statusCode: error.status };
        errorService.setError(apiError);
      }
      return throwError(() => error);
    }),
  );
};
