import { HttpErrorResponse } from '@angular/common/http';
import { normalizeBackendMessage } from './encounters-error.util';
import { translatedValidationMessage } from './translated-validation.util';
import {
  ODONTOGRAM_DISABLED_MESSAGE, ODONTOGRAM_MODULE_KEY, hasProblemDetail, isModuleDisabledProblem,
} from './module-disabled.util';

export { ODONTOGRAM_DISABLED_MESSAGE } from './module-disabled.util';

// Fase 6: clasificación de errores de /tenants/dental-conditions. La pantalla decide qué hacer según
// `kind`; `message` es el texto a mostrar (siempre en español, nunca el detail crudo del backend).
// El 401 no llega acá con sentido propio: lo resuelve authInterceptor (refresh o logout).
//
// 403 tiene cuatro causas:
//   - global no editable → ProblemDetails "Dental condition with id '...' is global and cannot be modified."
//   - módulo "odontogram" apagado → ProblemDetails de ModuleDisabledException con code "module_disabled"
//     (se reconoce primero, module-disabled.util).
//   - sin tenant / usuario inactivo → ProblemDetails de ModuleRequiresTenantUserException ("The odontogram
//     module is only available to active users of a tenant.", sin code) → forbidden, NO módulo apagado.
//   - sin permiso organization.manage (policy) → sin body.
// Sin body se usa el estado del módulo conocido por la sesión (`odontogramEnabled`) y la operación:
// el GET no exige permiso, así que su 403 sin body es el módulo salvo que se sepa que está prendido.
//
// 409: DentalConditionCodeAlreadyExistsException ("A dental condition with code '...' already exists
// for tenant '...'." / "A global dental condition with code '...' already exists.") → duplicate_code.
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
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Iniciá sesión de nuevo.';
export const DENTAL_CONDITION_NOT_FOUND_MESSAGE = 'La condición ya no existe. Se actualizó el listado.';
export const DENTAL_CONDITION_VALIDATION_MESSAGE =
  'No se pudo guardar la condición: el código, el nombre, la categoría o el color no son válidos.';
export const DENTAL_CONDITIONS_LOAD_ERROR_MESSAGE = 'No se pudo cargar el catálogo de condiciones dentales.';

type KnownMessage = { pattern: RegExp; translate: (m: RegExpMatchArray) => string };

// DentalConditionCode, HexColor y DentalCondition (NormalizeName / NormalizeCategory). El PATCH con
// name null también cae en "Name is required." (lo rechaza la entidad).
const KNOWN_MESSAGES: KnownMessage[] = [
  { pattern: /^Code is required\.?$/i, translate: () => 'El código es obligatorio.' },
  { pattern: /^Code cannot exceed (\d+) characters\.?$/i,
    translate: m => `El código no puede superar los ${m[1]} caracteres.` },
  { pattern: /^Code must contain only lowercase letters, digits and underscores\.?$/i,
    translate: () => 'El código solo admite minúsculas, números y guion bajo (_).' },
  { pattern: /^Name is required\.?$/i, translate: () => 'El nombre es obligatorio.' },
  { pattern: /^Name cannot exceed (\d+) characters\.?$/i,
    translate: m => `El nombre no puede superar los ${m[1]} caracteres.` },
  { pattern: /^Category cannot exceed (\d+) characters\.?$/i,
    translate: m => `La categoría no puede superar los ${m[1]} caracteres.` },
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
  if (isModuleDisabledProblem(err.error, ODONTOGRAM_MODULE_KEY)) {
    return { kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE };
  }
  const forbidden: DentalConditionError = context.operation === 'list'
    ? { kind: 'forbidden', message: DENTAL_CONDITIONS_LIST_FORBIDDEN_MESSAGE }
    : { kind: 'forbidden', message: DENTAL_CONDITION_FORBIDDEN_MESSAGE };
  // Otro ProblemDetails (p. ej. usuario sin tenant / inactivo): no es el módulo apagado.
  if (hasProblemDetail(err.error)) return forbidden;
  const enabled = context.odontogramEnabled ?? null;
  if (enabled === false || (context.operation === 'list' && enabled === null)) {
    return { kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE };
  }
  return forbidden;
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
    // 400 (model binding) y 422: texto propio si se reconoce, si no el genérico traducido con el campo.
    case 400:
    case 422: return {
      kind: 'validation',
      message: translatedMessage(err) ?? translatedValidationMessage(err) ?? DENTAL_CONDITION_VALIDATION_MESSAGE,
    };
    case 0: return { kind: 'other', message: 'No se pudo conectar con el servidor.' };
    default: return { kind: 'other', message: fallback };
  }
}
