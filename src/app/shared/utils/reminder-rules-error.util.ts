import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

function baseRulesMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'La regla ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

export function reminderRulesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseRulesMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar las reglas de recordatorio.');
  }
  return 'No se pudieron cargar las reglas de recordatorio.';
}

export function reminderRuleSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return 'Ya existe una regla equivalente para ese evento y canal.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return baseRulesMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar la regla.');
  }
  return 'No se pudo guardar la regla.';
}
