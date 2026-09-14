import { HttpErrorResponse } from '@angular/common/http';

export function httpErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 403) return 'No tenés permisos de Super Admin para realizar esta acción.';
    if (err.status === 401) return 'Necesitás iniciar sesión como Super Admin para ver esta información.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return err.error?.message ?? 'Ocurrió un error inesperado.';
  }
  return 'Ocurrió un error inesperado.';
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
    if (err.status === 403) return 'Usuario o clínica inactiva.';
    if (err.status === 404) return 'Clínica no encontrada.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return err.error?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

// Intenta extraer un mensaje legible de un 422 con errores de validación
// por campo, tolerando distintas formas de respuesta del backend. Exportada
// para que el interceptor global de errores (T20) la reutilice.
export function validationErrorMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (!body) return null;
  if (body.errors && typeof body.errors === 'object') {
    const messages = Object.values(body.errors as Record<string, unknown>).flat();
    if (messages.length) return messages.join(' ');
  }
  if (typeof body.message === 'string') return body.message;
  return null;
}
