import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

function baseRulesMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'La regla ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

export function reminderRulesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseRulesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudieron cargar las reglas de recordatorio.');
  }
  return 'No se pudieron cargar las reglas de recordatorio.';
}

export function reminderRuleSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'Ya existe una regla equivalente para ese evento y canal.';
    if (err.status === 400 || err.status === 422) return validationErrorMessage(err) ?? 'El servidor rechazó los datos de la regla de recordatorio.';
    return baseRulesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudo guardar la regla.');
  }
  return 'No se pudo guardar la regla.';
}
