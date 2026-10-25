import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

// T4: mensajes específicos para los códigos que puede devolver
// /tenants/patients/:patientId/treatment-plans y /tenants/treatment-plans/:id
// (401/404 según el ticket, más 400/422 para validaciones de formulario).
function baseTreatmentPlansMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El plan de tratamiento (o el paciente) ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/patients/:patientId/treatment-plans
export function treatmentPlansListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseTreatmentPlansMessage(err) ?? 'No se pudieron cargar los planes de tratamiento.';
  }
  return 'No se pudieron cargar los planes de tratamiento.';
}

// GET /tenants/treatment-plans/:id
export function treatmentPlanDetailErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseTreatmentPlansMessage(err) ?? 'No se pudo cargar el plan de tratamiento.';
  }
  return 'No se pudo cargar el plan de tratamiento.';
}

// POST /tenants/patients/:patientId/treatment-plans, PATCH /tenants/treatment-plans/:id y
// POST .../status. 400/422: el campo y el motivo que informa el backend (ProblemDetails
// `detail`/`field`), nunca un "revisá los datos" genérico.
export function treatmentPlanSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar el plan de tratamiento: hay un dato inválido.';
    }
    return baseTreatmentPlansMessage(err) ?? 'No se pudo guardar el plan de tratamiento.';
  }
  return 'No se pudo guardar el plan de tratamiento.';
}
