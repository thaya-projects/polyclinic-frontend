import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T6: mensajes específicos para los códigos que puede devolver
// GET /tenants/appointments/:id y POST /tenants/appointments/:id/status.
// Importante: el 409 acá significa algo DISTINTO del 409 de choque de
// horario que usa appointmentSaveErrorMessage (alta/edición) — por eso es
// un util separado, no se reutiliza ese mensaje.
function baseAppointmentStatusMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'La cita ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/appointments/:id
export function appointmentDetailErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseAppointmentStatusMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo cargar el detalle de la cita.')
    );
  }
  return 'No se pudo cargar el detalle de la cita.';
}

// POST /tenants/appointments/:id/status — 409 significa que se intentó
// reabrir (volver a "scheduled") una cita completed/cancelled; 422 es
// validación (ej. cancelled_reason faltante).
export function appointmentStatusChangeErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) {
      return 'No se puede reabrir una cita completada o cancelada. Elegí otro estado.';
    }
    if (err.status === 422) {
      return validationErrorMessage(err) ?? 'El motivo de cancelación es obligatorio para cancelar la cita.';
    }
    return (
      baseAppointmentStatusMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo actualizar el estado de la cita.')
    );
  }
  return 'No se pudo actualizar el estado de la cita.';
}
