import { HttpErrorResponse } from '@angular/common/http';
import { normalizeBackendMessage } from './encounters-error.util';
import { ODONTOGRAM_DISABLED_MESSAGE, hasProblemDetail, isModuleDisabledProblem } from './module-disabled.util';

export { ODONTOGRAM_DISABLED_MESSAGE } from './module-disabled.util';

// Fase 6: clasificación de errores de /tenants/patients/{id}/odontogram(s) y /tenants/odontograms. La
// pantalla decide qué hacer según `kind`; `message` es el texto a mostrar (siempre en español, nunca
// el detail crudo del backend). El 401 lo resuelve authInterceptor (refresh o logout).
//
// 404 tiene dos lecturas distintas:
//   - "Patient '...' has no current odontogram." → `no_current`: no es un error, es el estado vacío.
//   - Patient / Odontogram / ClinicalRecord / Encounter "with id '...' was not found." → `not_found`.
//
// 403 tiene tres causas:
//   - módulo "odontogram" apagado → ProblemDetails de ModuleDisabledException (o, antes de ese cambio
//     del backend, sin body desde OdontogramFeatureGuardMiddleware).
//   - sin ClinicalRead / ClinicalWrite (policy) → sin body.
//   - ForbiddenException del dominio → ProblemDetails con otro detail.
// Si el body identifica el módulo apagado, manda; si trae otro ProblemDetails, es falta de permiso;
// sin body se usa el estado del módulo conocido por la sesión (`odontogramEnabled`): en lecturas un
// 403 sin body con estado desconocido se atribuye al módulo (igual que el catálogo dental).
export type OdontogramErrorKind =
  | 'unauthorized' | 'feature_disabled' | 'forbidden' | 'no_current' | 'not_found' | 'conflict' | 'validation'
  | 'other';

export interface OdontogramErrorContext {
  operation?: 'read' | 'write';
  odontogramEnabled?: boolean | null;
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
export const ODONTOGRAM_VALIDATION_MESSAGE = 'Revisá los datos ingresados e intentá de nuevo.';
export const ODONTOGRAM_LOAD_ERROR_MESSAGE = 'No se pudo cargar el odontograma.';
export const TOOTH_CONDITION_NOT_FOUND_MESSAGE = 'La condición marcada ya no existe. Se recargó la pieza.';
export const TOOTH_CONDITION_WRITE_FORBIDDEN_MESSAGE =
  'Solo un profesional activo puede marcar condiciones en el odontograma.';
export const ODONTOGRAM_SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Iniciá sesión de nuevo.';

type KnownMessage = { pattern: RegExp; translate: () => string };

const NOT_FOUND_MESSAGES: KnownMessage[] = [
  { pattern: /has no current odontogram/i, translate: () => ODONTOGRAM_NO_CURRENT_MESSAGE },
  { pattern: /^Patient with id '.*' was not found\.?$/i, translate: () => ODONTOGRAM_PATIENT_NOT_FOUND_MESSAGE },
  { pattern: /^ClinicalRecord with id '.*' was not found\.?$/i,
    translate: () => 'No se encontró la historia clínica del paciente.' },
  { pattern: /^Encounter with id '.*' was not found\.?$/i, translate: () => 'El encuentro indicado no existe.' },
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
  { pattern: /^dentition must be one of: permanente, temporal, mixta\.?$/i,
    translate: () => 'La dentición debe ser permanente, temporal o mixta.' },
  // Condiciones por pieza (/tenants/odontograms/{id}/teeth).
  { pattern: /^Tooth \d+ is not valid for dentition '.*'\.?$/i,
    translate: () => 'La pieza no corresponde a la dentición del odontograma.' },
  { pattern: /^condition_id (is required|cannot be empty)\.?$/i, translate: () => 'Elegí una condición del catálogo.' },
  { pattern: /^surface must be one of: .*$/i, translate: () => 'La cara elegida no es válida.' },
  { pattern: /^state must be one of: .*$/i, translate: () => 'El estado elegido no es válido.' },
];

function detailOf(err: HttpErrorResponse): string {
  const body = err.error;
  return body && typeof body === 'object' && typeof body.detail === 'string' ? normalizeBackendMessage(body.detail) : '';
}

function translate(detail: string, known: KnownMessage[]): string | null {
  return known.find(k => k.pattern.test(detail))?.translate() ?? null;
}

function forbiddenError(err: HttpErrorResponse, context: OdontogramErrorContext): OdontogramError {
  const forbidden: OdontogramError = context.operation === 'write'
    ? { kind: 'forbidden', message: ODONTOGRAM_WRITE_FORBIDDEN_MESSAGE }
    : { kind: 'forbidden', message: ODONTOGRAM_READ_FORBIDDEN_MESSAGE };
  if (isModuleDisabledProblem(err.error)) return { kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE };
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
    case 409: return { kind: 'conflict', message: ODONTOGRAM_CONFLICT_MESSAGE };
    case 422: return {
      kind: 'validation', message: translate(detailOf(err), VALIDATION_MESSAGES) ?? ODONTOGRAM_VALIDATION_MESSAGE,
    };
    case 0: return { kind: 'other', message: 'No se pudo conectar con el servidor.' };
    default: return { kind: 'other', message: fallback };
  }
}
