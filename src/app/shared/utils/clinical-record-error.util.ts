import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/patients/:id/clinical-record (solo 401/404 según el ticket).
function baseClinicalRecordMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'Todavía no hay historia clínica registrada para este paciente (o el paciente no existe).';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/patients/:id/clinical-record
export function clinicalRecordLoadErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseClinicalRecordMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo cargar la historia clínica.')
    );
  }
  return 'No se pudo cargar la historia clínica.';
}

// PATCH /tenants/patients/:id/clinical-record
export function clinicalRecordSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    return (
      baseClinicalRecordMessage(err) ??
      validationErrorMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar la historia clínica.')
    );
  }
  return 'No se pudo guardar la historia clínica.';
}
