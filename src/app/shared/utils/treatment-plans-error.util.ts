import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T4: mensajes específicos para los códigos que puede devolver
// /tenants/patients/:patientId/treatment-plans y /tenants/treatment-plans/:id
// (401/404 según el ticket, más 422 para validaciones de formulario).
function baseTreatmentPlansMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El plan de tratamiento (o el paciente) ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/patients/:patientId/treatment-plans
export function treatmentPlansListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseTreatmentPlansMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar los planes de tratamiento.')
    );
  }
  return 'No se pudieron cargar los planes de tratamiento.';
}

// GET /tenants/treatment-plans/:id
export function treatmentPlanDetailErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseTreatmentPlansMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo cargar el plan de tratamiento.')
    );
  }
  return 'No se pudo cargar el plan de tratamiento.';
}

// POST /tenants/patients/:patientId/treatment-plans, PATCH /tenants/treatment-plans/:id
export function treatmentPlanSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return (
      baseTreatmentPlansMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar el plan de tratamiento.')
    );
  }
  return 'No se pudo guardar el plan de tratamiento.';
}
