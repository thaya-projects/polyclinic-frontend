import { HttpErrorResponse } from '@angular/common/http';
import { normalizeBackendMessage } from './encounters-error.util';
import { translatedValidationMessage } from './translated-validation.util';
import {
  ODONTOGRAM_DISABLED_MESSAGE, ODONTOGRAM_MODULE_KEY, hasProblemDetail, isModuleDisabledProblem,
} from './module-disabled.util';

export { ODONTOGRAM_DISABLED_MESSAGE } from './module-disabled.util';

// Fase 6: clasificación de errores de /tenants/patients/{id}/odontogram(s) y /tenants/odontograms. La
// pantalla decide qué hacer según `kind`; `message` es el texto a mostrar (siempre en español, nunca
// el detail crudo del backend). El 401 lo resuelve authInterceptor (refresh o logout).
//
// 404 tiene dos lecturas distintas:
//   - "Patient '...' has no current odontogram." → `no_current`: no es un error, es el estado vacío.
//   - Patient / Odontogram / ClinicalRecord / Encounter "with id '...' was not found." → `not_found`.
//
// 403 tiene cinco causas:
//   - alta con encounter_id y el usuario no es el user del profesional del encounter →
//     EncounterActionNotAllowedForUserException ("Only the user linked to the encounter's professional
//     can attach odontograms to encounter '...'.") → `encounter_forbidden` (no es módulo ni policy).
//   - módulo "odontogram" apagado → ProblemDetails de ModuleDisabledException: code "module_disabled",
//     module "odontogram", detail "The odontogram module is not enabled for this tenant.".
//   - sin tenant / usuario inactivo → ProblemDetails de ModuleRequiresTenantUserException ("The
//     odontogram module is only available to active users of a tenant.", sin code) → forbidden.
//   - sin ClinicalRead / ClinicalWrite (policy) → sin body.
//   - otra ForbiddenException del dominio → ProblemDetails con otro detail.
// Si el body identifica el módulo apagado, manda; si trae otro ProblemDetails, es falta de permiso;
// sin body se usa el estado del módulo conocido por la sesión (`odontogramEnabled`): en lecturas un
// 403 sin body con estado desconocido se atribuye al módulo (igual que el catálogo dental).
//
// 409 depende del recurso:
//   - odontograma (alta):
//       "Cannot attach odontograms to an encounter with status 'signed'|'voided'." → `encounter_closed`.
//       cualquier otro (OdontogramCurrentConflictException: otro request dejó un current nuevo) → `conflict`.
//   - condiciones por pieza (/tenants/odontograms/{id}/teeth; orden backend 404 → 409 → 422):
//       "Odontogram '...' is a historical snapshot (not current); ..." → `historic`.
//       cualquier otro 409 → `conflict` genérico (se recarga la pieza).
//
// 422 del alta con encounter_id: profesional del encounter inactivo (ProfessionalInactiveException,
// "Professional with id '...' is inactive.") → `validation` con texto propio.
export type OdontogramErrorKind =
  | 'unauthorized' | 'feature_disabled' | 'forbidden' | 'encounter_forbidden' | 'no_current' | 'not_found'
  | 'conflict' | 'historic' | 'encounter_closed' | 'validation' | 'other';

export interface OdontogramErrorContext {
  operation?: 'read' | 'write';
  odontogramEnabled?: boolean | null;
  // Recurso de la llamada (default odontogram): cambia la lectura del 409.
  resource?: 'odontogram' | 'tooth_condition';
}

export interface OdontogramError {
  kind: OdontogramErrorKind;
  message: string;
}

export const ODONTOGRAM_NO_CURRENT_MESSAGE = 'Este paciente todavía no tiene odontograma.';
export const ODONTOGRAM_READ_FORBIDDEN_MESSAGE =
  'No tenés acceso al odontograma (requiere ser profesional activo o tener permisos clínicos).';
export const ODONTOGRAM_WRITE_FORBIDDEN_MESSAGE = 'Solo un profesional activo puede crear odontogramas.';
export const ODONTOGRAM_CONFLICT_MESSAGE =
  'Otro usuario creó un odontograma para este paciente al mismo tiempo. Se recargó el odontograma actual.';
export const ODONTOGRAM_PATIENT_NOT_FOUND_MESSAGE = 'El paciente no existe o ya no está disponible.';
export const ODONTOGRAM_NOT_FOUND_MESSAGE = 'El odontograma no existe o ya no está disponible.';
export const ODONTOGRAM_VALIDATION_MESSAGE =
  'No se pudo guardar: algún dato del odontograma (dentición, pieza, condición, cara, estado o nota) no es válido.';
export const ODONTOGRAM_LOAD_ERROR_MESSAGE = 'No se pudo cargar el odontograma.';
export const TOOTH_CONDITION_NOT_FOUND_MESSAGE = 'La condición marcada ya no existe. Se recargó la pieza.';
export const TOOTH_CONDITION_WRITE_FORBIDDEN_MESSAGE =
  'Solo un profesional activo puede marcar condiciones en el odontograma.';
export const TOOTH_CONDITION_HISTORIC_MESSAGE = 'Este odontograma es histórico; creá uno nuevo o volvé al actual';
export const TOOTH_CONDITION_CONFLICT_MESSAGE =
  'Otro cambio se cruzó con esta operación. Se recargó la pieza; intentá de nuevo.';
export const ODONTOGRAM_ENCOUNTER_SIGNED_MESSAGE = 'El encuentro está firmado; no se puede asociar el odontograma.';
export const ODONTOGRAM_ENCOUNTER_VOIDED_MESSAGE = 'El encuentro está anulado; no se puede asociar el odontograma.';
export const ODONTOGRAM_ENCOUNTER_CLOSED_MESSAGE = 'El encuentro ya no está abierto; no se puede asociar el odontograma.';
export const ODONTOGRAM_ENCOUNTER_NOT_OWNER_MESSAGE =
  'Solo el profesional del encuentro puede asociarle un odontograma.';
export const ODONTOGRAM_ENCOUNTER_PROFESSIONAL_INACTIVE_MESSAGE = 'El profesional del encuentro está inactivo.';
export const ODONTOGRAM_SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Iniciá sesión de nuevo.';

type KnownMessage = { pattern: RegExp; translate: (match: RegExpMatchArray) => string };

const NOT_FOUND_MESSAGES: KnownMessage[] = [
  { pattern: /has no current odontogram/i, translate: () => ODONTOGRAM_NO_CURRENT_MESSAGE },
  { pattern: /^Patient with id '.*' was not found\.?$/i, translate: () => ODONTOGRAM_PATIENT_NOT_FOUND_MESSAGE },
  { pattern: /^ClinicalRecord with id '.*' was not found\.?$/i,
    translate: () => 'No se encontró la historia clínica del paciente.' },
  { pattern: /^Encounter with id '.*' was not found\.?$/i, translate: () => 'El encuentro indicado no existe.' },
  { pattern: /^Professional with id '.*' was not found\.?$/i,
    translate: () => 'No se encontró el profesional del encuentro.' },
  { pattern: /^Odontogram with id '.*' was not found\.?$/i, translate: () => ODONTOGRAM_NOT_FOUND_MESSAGE },
  { pattern: /^ToothCondition with id '.*' was not found\.?$/i, translate: () => TOOTH_CONDITION_NOT_FOUND_MESSAGE },
];

// OdontogramService / Odontogram.Create.
const VALIDATION_MESSAGES: KnownMessage[] = [
  { pattern: /^clinical_record_id is required\.?$/i, translate: () => 'Falta la historia clínica del paciente.' },
  { pattern: /^encounter_id cannot be empty\.?$/i, translate: () => 'El encuentro indicado no es válido.' },
  { pattern: /^Clinical record '.*' does not belong to patient '.*'\.?$/i,
    translate: () => 'La historia clínica no corresponde a este paciente.' },
  { pattern: /^Encounter '.*' does not belong to patient '.*'\.?$/i,
    translate: () => 'El encuentro indicado no corresponde a este paciente.' },
  // OdontogramEncounterClinicalRecordMismatchException.
  { pattern: /^Encounter '.*' does not belong to clinical record '.*'\.?$/i,
    translate: () => 'El encuentro indicado no corresponde a la historia clínica del paciente.' },
  // Encounter.AuthorizeClinicalChildChange (alta con encounter_id): profesional del encounter inactivo.
  { pattern: /^Professional with id '.*' is inactive\.?$/i,
    translate: () => ODONTOGRAM_ENCOUNTER_PROFESSIONAL_INACTIVE_MESSAGE },
  { pattern: /^dentition must be one of: permanente, temporal, mixta\.?$/i,
    translate: () => 'La dentición debe ser permanente, temporal o mixta.' },
  // Condiciones por pieza (/tenants/odontograms/{id}/teeth): ToothFdi, ToothCondition,
  // ToothConditionService y sus excepciones (ToothFdiNotInDentition, ToothConditionDentalConditionNotFound).
  { pattern: /^tooth_fdi is required\.?$/i, translate: () => 'Elegí la pieza a marcar.' },
  { pattern: /^tooth_fdi (-?\d+) is not a valid FDI tooth number\b.*$/i,
    translate: m => `La pieza ${m[1]} no es un número FDI válido (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85).` },
  { pattern: /^tooth_fdi (\d+) is not valid for a '(permanente|temporal|mixta)' dentition\.?$/i,
    translate: m => `La pieza ${m[1]} no corresponde a la dentición ${m[2].toLowerCase()} de este odontograma.` },
  { pattern: /^condition_id (is required|cannot be empty)\.?$/i, translate: () => 'Elegí una condición del catálogo.' },
  { pattern: /^condition_id '.*' does not exist in the dental condition catalog\.?$/i,
    translate: () => 'La condición elegida ya no existe en el catálogo dental. Recargá la página y elegí otra.' },
  { pattern: /^surface (must be one of: .*|cannot be null\.?)$/i, translate: () => 'La cara elegida no es válida.' },
  { pattern: /^state (must be one of: .*|cannot be null\.?)$/i, translate: () => 'El estado elegido no es válido.' },
  { pattern: /^note cannot exceed (\d+) characters\.?$/i,
    translate: m => `La nota no puede superar los ${m[1]} caracteres.` },
];

function detailOf(err: HttpErrorResponse): string {
  const body = err.error;
  return body && typeof body === 'object' && typeof body.detail === 'string' ? normalizeBackendMessage(body.detail) : '';
}

function translate(detail: string, known: KnownMessage[]): string | null {
  for (const k of known) {
    const match = detail.match(k.pattern);
    if (match) return k.translate(match);
  }
  return null;
}

// EncounterActionNotAllowedForUserException (AttachOdontogram) del alta con encounter_id.
const ENCOUNTER_NOT_OWNER_DETAIL =
  /^Only the user linked to the (encounter's )?professional can attach odontograms to (an encounter|encounter '.*')\.?$/i;

function forbiddenError(err: HttpErrorResponse, context: OdontogramErrorContext): OdontogramError {
  const forbidden: OdontogramError = context.operation === 'write'
    ? { kind: 'forbidden', message: ODONTOGRAM_WRITE_FORBIDDEN_MESSAGE }
    : { kind: 'forbidden', message: ODONTOGRAM_READ_FORBIDDEN_MESSAGE };
  if (isModuleDisabledProblem(err.error, ODONTOGRAM_MODULE_KEY)) return { kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE };
  if (ENCOUNTER_NOT_OWNER_DETAIL.test(detailOf(err))) {
    return { kind: 'encounter_forbidden', message: ODONTOGRAM_ENCOUNTER_NOT_OWNER_MESSAGE };
  }
  if (hasProblemDetail(err.error)) return forbidden;
  const enabled = context.odontogramEnabled ?? null;
  if (enabled === false || (context.operation !== 'write' && enabled === null)) {
    return { kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE };
  }
  return forbidden;
}

function notFoundError(err: HttpErrorResponse): OdontogramError {
  const detail = detailOf(err);
  if (/has no current odontogram/i.test(detail)) return { kind: 'no_current', message: ODONTOGRAM_NO_CURRENT_MESSAGE };
  return { kind: 'not_found', message: translate(detail, NOT_FOUND_MESSAGES) ?? ODONTOGRAM_NOT_FOUND_MESSAGE };
}

const HISTORIC_DETAIL = /\bhistorical snapshot\b|\bnot current\b/i;
const ENCOUNTER_CLOSED_DETAIL = /^Cannot attach odontograms to an encounter with status '([a-z_]+)'\.?$/i;

function conflictError(err: HttpErrorResponse, context: OdontogramErrorContext): OdontogramError {
  const detail = detailOf(err);
  if (context.resource === 'tooth_condition') {
    return HISTORIC_DETAIL.test(detail)
      ? { kind: 'historic', message: TOOTH_CONDITION_HISTORIC_MESSAGE }
      : { kind: 'conflict', message: TOOTH_CONDITION_CONFLICT_MESSAGE };
  }
  const closed = detail.match(ENCOUNTER_CLOSED_DETAIL);
  if (closed) {
    const status = closed[1].toLowerCase();
    const message = status === 'signed' ? ODONTOGRAM_ENCOUNTER_SIGNED_MESSAGE
      : status === 'voided' ? ODONTOGRAM_ENCOUNTER_VOIDED_MESSAGE : ODONTOGRAM_ENCOUNTER_CLOSED_MESSAGE;
    return { kind: 'encounter_closed', message };
  }
  return { kind: 'conflict', message: ODONTOGRAM_CONFLICT_MESSAGE };
}

export function odontogramError(
  err: unknown,
  fallback = 'No se pudo completar la operación.',
  context: OdontogramErrorContext = {},
): OdontogramError {
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  switch (err.status) {
    case 401: return { kind: 'unauthorized', message: ODONTOGRAM_SESSION_EXPIRED_MESSAGE };
    case 403: return forbiddenError(err, context);
    case 404: return notFoundError(err);
    case 409: return conflictError(err, context);
    // 400 (model binding) y 422: texto propio si se reconoce, si no el genérico traducido con el campo.
    case 400:
    case 422: return {
      kind: 'validation',
      message: translate(detailOf(err), VALIDATION_MESSAGES) ?? translatedValidationMessage(err) ?? ODONTOGRAM_VALIDATION_MESSAGE,
    };
    case 0: return { kind: 'other', message: 'No se pudo conectar con el servidor.' };
    default: return { kind: 'other', message: fallback };
  }
}
