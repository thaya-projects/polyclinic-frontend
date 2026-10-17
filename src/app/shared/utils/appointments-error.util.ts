import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T6: mensajes específicos para los códigos que puede devolver
// /tenants/appointments (401/404/409 según el ticket, más 422 para
// validaciones de formulario).
function baseAppointmentsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'La cita ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/appointments
export function appointmentsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseAppointmentsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo cargar la agenda.')
    );
  }
  return 'No se pudo cargar la agenda.';
}

// POST /tenants/appointments, PATCH /tenants/appointments/:id — 409
// significa choque de horario (el profesional o el consultorio ya tienen
// una cita que se superpone).
export function appointmentSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) {
      return 'Ese profesional (o consultorio) ya tiene una cita en ese horario. Elegí otro horario.';
    }
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return (
      baseAppointmentsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar la cita.')
    );
  }
  return 'No se pudo guardar la cita.';
}
