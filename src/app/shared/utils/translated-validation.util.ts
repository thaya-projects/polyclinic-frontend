import { HttpErrorResponse } from '@angular/common/http';
import { extractServerError, serverErrorText } from './server-errors.util';

// Para los *-error.util que nunca muestran el texto crudo del backend en inglés (Fase 4/6): el
// motivo genérico de server-errors.util ("Pieza (FDI): Este campo es obligatorio.") solo cuando el
// backend informa el campo y uno de sus patrones tradujo el texto (sin campo, "Este campo es
// obligatorio." no dice nada). Si no, null y el caller usa su texto propio.
export function translatedValidationMessage(err: HttpErrorResponse): string | null {
  const error = extractServerError(err);
  const raw = firstRawMessage(err);
  if (!error?.field || !raw) return null;
  const untranslated = raw.replace(/\s*\(Parameter '[^']*'\)\s*$/, '').trim();
  return error.message !== untranslated ? serverErrorText(error) : null;
}

// Mismo orden que extractServerError: detail, errors (model binding), message.
function firstRawMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (!body || typeof body !== 'object') return null;
  if (typeof body.detail === 'string' && body.detail) return body.detail;
  if (body.errors && typeof body.errors === 'object') {
    const value = Object.values(body.errors as Record<string, unknown>)[0];
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined || first === null ? null : String(first);
  }
  return typeof body.message === 'string' && body.message ? body.message : null;
}
