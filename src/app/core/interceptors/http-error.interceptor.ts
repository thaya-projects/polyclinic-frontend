import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { isAuthExemptPath } from '../constants/auth-exempt-paths.const';
import { validationErrorMessage } from '../../shared/utils/http-error.util';

// T20: manejo global de 403/404/422 — muestra un toast y deja pasar el
// error tal cual (no lo swallowea), para que cada pantalla pueda además
// mostrar su propio mensaje inline si lo necesita (ej. errores de campo
// en un form). El 401 lo maneja authInterceptor (T15), acá no se toca.
//
// Los endpoints de login/refresh quedan afuera: ya tienen su propio
// mensaje inline (T13/T14/T19) y no queremos duplicarlo con un toast.
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  if (isAuthExemptPath(req.url)) return next(req);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403) {
          toast.error('No tenés permisos para realizar esta acción.');
        } else if (err.status === 404) {
          toast.error('Recurso no encontrado.');
        } else if (err.status === 422) {
          toast.error(validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.');
        }
      }
      return throwError(() => err);
    }),
  );
};
