import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

// Estos endpoints devuelven ProblemDetails ({ detail }); { message } queda por compatibilidad.
function backendText(err: HttpErrorResponse): string | null {
  const raw = err.error?.detail ?? err.error?.message;
  return typeof raw === 'string' && raw ? translateServerMessage(raw) : null;
}

// T6: mensajes específicos para los códigos que puede devolver
// /tenants/service-categories y /tenants/services (401/404 según el
// ticket, más 422 para los errores de validación del criterio de aceptación).
function baseServicesMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El servicio ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/service-categories, GET /tenants/services
export function servicesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseServicesMessage(err) ??
      backendText(err) ?? 'No se pudo cargar el catálogo de servicios.'
    );
  }
  return 'No se pudo cargar el catálogo de servicios.';
}

// POST /tenants/services, PATCH /tenants/services/:id (alta/edición)
export function serviceSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar el servicio: uno de los datos no es válido.';
    }
    if (err.status === 409) return 'Ya existe un servicio con ese código en tu clínica.';
    return (
      baseServicesMessage(err) ??
      backendText(err) ?? 'No se pudo guardar el servicio.'
    );
  }
  return 'No se pudo guardar el servicio.';
}

// PATCH /tenants/services/:id (solo activar/desactivar)
export function serviceStatusErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    return (
      baseServicesMessage(err) ??
      backendText(err) ?? 'No se pudo actualizar el estado del servicio.'
    );
  }
  return 'No se pudo actualizar el estado del servicio.';
}
