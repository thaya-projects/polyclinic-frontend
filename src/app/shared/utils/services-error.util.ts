import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

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
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo cargar el catálogo de servicios.')
    );
  }
  return 'No se pudo cargar el catálogo de servicios.';
}

// POST /tenants/services, PATCH /tenants/services/:id (alta/edición)
export function serviceSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return (
      baseServicesMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar el servicio.')
    );
  }
  return 'No se pudo guardar el servicio.';
}

// PATCH /tenants/services/:id (solo activar/desactivar)
export function serviceStatusErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseServicesMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo actualizar el estado del servicio.')
    );
  }
  return 'No se pudo actualizar el estado del servicio.';
}
