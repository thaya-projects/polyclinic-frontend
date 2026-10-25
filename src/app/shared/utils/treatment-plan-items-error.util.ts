import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/treatment-plans/:id/items(...) y .../items/:itemId/status
// (401/404/400/422 según el ticket).
function baseTreatmentPlanItemsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El plan de tratamiento (o el item) ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/treatment-plans/:id/items
export function treatmentPlanItemsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseTreatmentPlanItemsMessage(err) ?? 'No se pudieron cargar los items del plan.';
  }
  return 'No se pudieron cargar los items del plan.';
}

// POST/PATCH/DELETE .../items(/:itemId). 400/422: el campo y el motivo que informa el backend
// ("Cantidad: El valor debe ser mayor a 0."), nunca un "revisá los datos" genérico.
export function treatmentPlanItemSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar el item: hay un dato inválido.';
    }
    return baseTreatmentPlanItemsMessage(err) ?? 'No se pudo guardar el item.';
  }
  return 'No se pudo guardar el item.';
}

// POST .../items/:itemId/status
export function treatmentPlanItemStatusErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo actualizar el estado del item: hay un dato inválido.';
    }
    return baseTreatmentPlanItemsMessage(err) ?? 'No se pudo actualizar el estado del item.';
  }
  return 'No se pudo actualizar el estado del item.';
}
