import { HttpErrorResponse } from '@angular/common/http';
import { normalizeBackendMessage } from './encounters-error.util';

// Fase 6: clasificación de errores de /tenants/dental-conditions. La pantalla decide qué hacer según
// `kind`; `message` es el texto a mostrar (siempre en español, nunca el detail crudo del backend).
// El 401 no llega acá con sentido propio: lo resuelve authInterceptor (refresh o logout).
//
// 403 tiene tres causas y dos llegan sin body (las corta un middleware/policy antes de
// ExceptionHandlingMiddleware):
//   - global no editable → ProblemDetails con detail "... is global and cannot be modified."
//   - módulo "odontogram" apagado (OdontogramFeatureGuardMiddleware) → sin body.
//   - sin permiso organization.manage (policy) → sin body.
// Para separar las dos últimas se usa el estado del módulo conocido por la sesión
// (`odontogramEnabled`) y la operación: el GET no exige permiso, así que su 403 sin body es el módulo
// salvo que se sepa que está prendido.
export type DentalConditionErrorKind =
  | 'unauthorized' | 'feature_disabled' | 'global_not_editable' | 'forbidden' | 'not_found' | 'duplicate_code'
  | 'validation' | 'other';

export interface DentalConditionErrorContext {
  operation?: 'list' | 'write';
  odontogramEnabled?: boolean | null;
}

export interface DentalConditionError {
  kind: DentalConditionErrorKind;
  message: string;
}

export const DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE = 'El código ya existe en el catálogo de tu clínica.';
export const DENTAL_CONDITION_GLOBAL_MESSAGE =
  'Las condiciones globales de la plataforma no se pueden editar. Creá una propia con otro nombre o color.';
export const DENTAL_CONDITION_FORBIDDEN_MESSAGE =
  'No tenés permiso para gestionar el catálogo dental (requiere el permiso de administración de la clínica).';
export const DENTAL_CONDITIONS_LIST_FORBIDDEN_MESSAGE = 'No tenés acceso al catálogo dental de esta clínica.';
export const ODONTOGRAM_DISABLED_MESSAGE =
  'El módulo de Odontología no está habilitado para tu clínica. Pedile al administrador de la plataforma que lo active.';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Iniciá sesión de nuevo.';
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

function forbiddenError(err: HttpErrorResponse, context: DentalConditionErrorContext): DentalConditionError {
  const detail = normalizeBackendMessage(backendMessages(err)[0] ?? '');
  if (GLOBAL_NOT_EDITABLE_DETAIL.test(detail)) {
    return { kind: 'global_not_editable', message: DENTAL_CONDITION_GLOBAL_MESSAGE };
  }
  const enabled = context.odontogramEnabled ?? null;
  if (enabled === false || (context.operation === 'list' && enabled === null)) {
    return { kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE };
  }
  return context.operation === 'list'
    ? { kind: 'forbidden', message: DENTAL_CONDITIONS_LIST_FORBIDDEN_MESSAGE }
    : { kind: 'forbidden', message: DENTAL_CONDITION_FORBIDDEN_MESSAGE };
}

export function dentalConditionError(
  err: unknown,
  fallback = 'No se pudo completar la operación.',
  context: DentalConditionErrorContext = {},
): DentalConditionError {
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  switch (err.status) {
    case 401: return { kind: 'unauthorized', message: SESSION_EXPIRED_MESSAGE };
    case 403: return forbiddenError(err, context);
    case 404: return { kind: 'not_found', message: DENTAL_CONDITION_NOT_FOUND_MESSAGE };
    case 409: return { kind: 'duplicate_code', message: DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE };
    case 422: return { kind: 'validation', message: translatedMessage(err) ?? DENTAL_CONDITION_VALIDATION_MESSAGE };
    case 0: return { kind: 'other', message: 'No se pudo conectar con el servidor.' };
    default: return { kind: 'other', message: fallback };
  }
}
