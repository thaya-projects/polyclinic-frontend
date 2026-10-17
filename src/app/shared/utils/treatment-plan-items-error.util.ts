import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/treatment-plans/:id/items(...) y .../items/:itemId/status
// (401/404/422 según el ticket).
function baseTreatmentPlanItemsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El plan de tratamiento (o el item) ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/treatment-plans/:id/items
export function treatmentPlanItemsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseTreatmentPlanItemsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar los items del plan.')
    );
  }
  return 'No se pudieron cargar los items del plan.';
}

// POST/PATCH/DELETE .../items(/:itemId)
export function treatmentPlanItemSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return (
      baseTreatmentPlanItemsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar el item.')
    );
  }
  return 'No se pudo guardar el item.';
}

// POST .../items/:itemId/status
export function treatmentPlanItemStatusErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return (
      baseTreatmentPlanItemsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo actualizar el estado del item.')
    );
  }
  return 'No se pudo actualizar el estado del item.';
}
