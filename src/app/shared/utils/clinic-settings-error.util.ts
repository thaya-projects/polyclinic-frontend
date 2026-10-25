import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

// Configuración de la clínica (sucursales, consultorios, especialidades, horarios): estos endpoints
// devuelven ProblemDetails ({ status, detail, field? }), no { message }. httpErrorMessage es el de
// Super Admin (403 "No tenés permisos de Super Admin..."), por eso acá hay uno propio.
// `fallback` nombra la acción ("No se pudo guardar la sucursal.").
export function clinicSettingsErrorMessage(err: unknown, fallback: string, notFound = 'El registro ya no existe.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
  const specific = specificErrorMessage(err);
  if (specific) return specific;
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'No tenés permisos para realizar esta acción en esta clínica.';
  if (err.status === 404) return notFound;
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  if (err.status === 400 || err.status === 422) return validationErrorMessage(err) ?? fallback;
  const detail = err.error?.detail;
  return typeof detail === 'string' && detail ? translateServerMessage(detail) : fallback;
}

// PUT /tenants/professionals/:id/schedule, POST /tenants/schedule-exceptions. Las reglas de los
// bloques (ScheduleBlockValidationException, 422 sin `field`: superposición, fin <= inicio,
// minutos por turno) se traducen en server-errors.util (KNOWN_MESSAGES).
export function scheduleSaveErrorMessage(err: unknown, fallback: string): string {
  return clinicSettingsErrorMessage(err, fallback, 'El profesional o la sucursal ya no existen.');
}
