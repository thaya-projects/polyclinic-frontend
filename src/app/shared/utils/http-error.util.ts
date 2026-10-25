import { HttpErrorResponse } from '@angular/common/http';
import { extractServerError, knownServerMessage, serverErrorText, translateServerMessage } from './server-errors.util';

export function httpErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = knownServerMessage(err) ?? validationErrorMessage(err);
    if (specific) return specific;
    if (err.status === 403) return 'No tenés permisos de Super Admin para realizar esta acción.';
    if (err.status === 401) return 'Necesitás iniciar sesión como Super Admin para ver esta información.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return backendDetail(err) ?? 'Ocurrió un error inesperado.';
  }
  return 'Ocurrió un error inesperado.';
}

// El backend responde ProblemDetails (`detail`); `message` queda por compatibilidad. Los 5xx traen
// un detail genérico en inglés que no le sirve al usuario.
function backendDetail(err: HttpErrorResponse): string | null {
  if (err.status >= 500) return null;
  const body = err.error;
  if (typeof body?.detail === 'string' && body.detail) return translateServerMessage(body.detail);
  if (typeof body?.message === 'string' && body.message) return body.message;
  return null;
}

// Mapeo específico para el login de Super Admin (T19): la ficha pide
// textos exactos distintos de los que usa el resto de la app para 401/403.
export function loginErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return 'Credenciales inválidas.';
    if (err.status === 403) return 'Usuario inactivo o no autorizado.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return err.error?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

// Mapeo específico para el login de clínica (T14): 401/403/404/422 tienen
// textos propios según la ficha, distintos de los de Super Admin.
export function clinicLoginErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return 'Credenciales inválidas.';
    if (err.status === 403) return 'Tu usuario o tu clínica están inactivos.';
    if (err.status === 404) return 'Credenciales inválidas.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'El servidor rechazó los datos de acceso.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return err.error?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

// Mensaje legible de un 400/422 de validación: el motivo traducido y, si el backend lo informa,
// el campo que falló ("WhatsApp: Ingresá el número con código de país..."). Exportada para que el
// interceptor global de errores (T20) y los *-error.util la reutilicen.
export function validationErrorMessage(err: HttpErrorResponse): string | null {
  const error = extractServerError(err);
  return error ? serverErrorText(error) : null;
}

// Motivo concreto que informó el backend, para cualquier status: una regla de negocio conocida
// (409 "La factura no tiene ítems…", 404 "La especialidad seleccionada ya no existe…") o la
// validación de un campo (400/422). null → el caller usa su texto por status.
export function specificErrorMessage(err: HttpErrorResponse): string | null {
  return knownServerMessage(err) ?? validationErrorMessage(err);
}
