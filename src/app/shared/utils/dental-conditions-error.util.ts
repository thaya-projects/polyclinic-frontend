import { HttpErrorResponse } from '@angular/common/http';
import { normalizeBackendMessage } from './encounters-error.util';

// Fase 6: clasificación de errores de /tenants/dental-conditions. La pantalla decide qué hacer según
// `kind`; `message` es el texto a mostrar (siempre en español, nunca el detail crudo del backend).
export type DentalConditionErrorKind =
  | 'global_not_editable' | 'forbidden' | 'not_found' | 'duplicate_code' | 'validation' | 'other';

export interface DentalConditionError {
  kind: DentalConditionErrorKind;
  message: string;
}

export const DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE = 'El código ya existe en el catálogo de tu clínica.';
export const DENTAL_CONDITION_GLOBAL_MESSAGE =
  'Las condiciones globales de la plataforma no se pueden editar. Creá una propia con otro nombre o color.';
export const DENTAL_CONDITION_FORBIDDEN_MESSAGE = 'No tenés permiso para gestionar el catálogo dental.';
export const DENTAL_CONDITION_NOT_FOUND_MESSAGE = 'La condición ya no existe. Se actualizó el listado.';
export const DENTAL_CONDITION_VALIDATION_MESSAGE = 'Revisá los datos ingresados e intentá de nuevo.';
export const DENTAL_CONDITIONS_LOAD_ERROR_MESSAGE = 'No se pudo cargar el catálogo de condiciones dentales.';

type KnownMessage = { pattern: RegExp; translate: (m: RegExpMatchArray) => string };

// DentalConditionCode, HexColor, DentalCondition.NormalizeName y el "name cannot be null" del PATCH.
const KNOWN_MESSAGES: KnownMessage[] = [
  { pattern: /^Code is required\.?$/i, translate: () => 'El código es obligatorio.' },
  { pattern: /^Code cannot exceed (\d+) characters\.?$/i,
    translate: m => `El código no puede superar los ${m[1]} caracteres.` },
  { pattern: /^Code must contain only lowercase letters, digits and underscores\.?$/i,
    translate: () => 'El código solo admite minúsculas, números y guion bajo (_).' },
  { pattern: /^Name is required\.?$/i, translate: () => 'El nombre es obligatorio.' },
  { pattern: /^name cannot be null\.?$/i, translate: () => 'El nombre es obligatorio.' },
  { pattern: /^Color is required\.?$/i, translate: () => 'El color es obligatorio.' },
  { pattern: /^Color must be a hex value in the form #RRGGBB\.?$/i,
    translate: () => 'El color debe tener el formato #RRGGBB (ej: #E53935).' },
];

const GLOBAL_NOT_EDITABLE_DETAIL = /^Dental condition with id '.*' is global and cannot be modified\.?$/i;

export function translateDentalConditionBackendMessage(message: string): string | null {
  const text = normalizeBackendMessage(message);
  for (const known of KNOWN_MESSAGES) {
    const match = text.match(known.pattern);
    if (match) return known.translate(match);
  }
  return null;
}

// ProblemDetails ({ detail }) o { errors } del model binding.
function backendMessages(err: HttpErrorResponse): string[] {
  const body = err.error;
  if (!body || typeof body !== 'object') return [];
  if (typeof body.detail === 'string' && body.detail) return [body.detail];
  if (body.errors && typeof body.errors === 'object') {
    return Object.values(body.errors as Record<string, unknown>).flat().filter((m): m is string => typeof m === 'string');
  }
  return [];
}

function translatedMessage(err: HttpErrorResponse): string | null {
  const raw = backendMessages(err);
  if (raw.length === 0) return null;
  const translated = raw.map(translateDentalConditionBackendMessage);
  return translated.every((t): t is string => t !== null) ? translated.join(' ') : null;
}

export function dentalConditionError(err: unknown, fallback = 'No se pudo completar la operación.'): DentalConditionError {
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  switch (err.status) {
    case 403: {
      const detail = normalizeBackendMessage(backendMessages(err)[0] ?? '');
      return GLOBAL_NOT_EDITABLE_DETAIL.test(detail)
        ? { kind: 'global_not_editable', message: DENTAL_CONDITION_GLOBAL_MESSAGE }
        : { kind: 'forbidden', message: DENTAL_CONDITION_FORBIDDEN_MESSAGE };
    }
    case 404: return { kind: 'not_found', message: DENTAL_CONDITION_NOT_FOUND_MESSAGE };
    case 409: return { kind: 'duplicate_code', message: DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE };
    case 422: return { kind: 'validation', message: translatedMessage(err) ?? DENTAL_CONDITION_VALIDATION_MESSAGE };
    case 0: return { kind: 'other', message: 'No se pudo conectar con el servidor.' };
    default: return { kind: 'other', message: fallback };
  }
}
