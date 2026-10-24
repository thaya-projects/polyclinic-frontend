import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T7: mensajes específicos para los códigos que puede devolver
// /tenants/patients. Nada de "Ocurrió un error inesperado" sin explicación.
function basePatientsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'No tenés permisos para gestionar pacientes de esta clínica.';
  if (err.status === 404) return 'El paciente ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/patients
export function patientsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      basePatientsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo cargar el listado de pacientes.')
    );
  }
  return 'No se pudo cargar el listado de pacientes.';
}

// POST /tenants/patients, PATCH /tenants/patients/:id — 409 significa
// documento duplicado.
export function patientSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return 'Ya existe un paciente con ese número de documento.';
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    }
    return (
      basePatientsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar el paciente.')
    );
  }
  return 'No se pudo guardar el paciente.';
}

// POST /tenants/patients/:id/deactivate
export function patientDeactivateErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      basePatientsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo desactivar el paciente.')
    );
  }
  return 'No se pudo desactivar el paciente.';
}
