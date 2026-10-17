import { HttpErrorResponse } from '@angular/common/http';

// Fase 4 T7: clasificación de errores de /tenants/encounters. La pantalla decide qué hacer según
// `kind` (404 → volver al listado, 409 → recargar el encounter); `message` es el texto a mostrar.
// El 401 no llega acá con sentido propio: lo resuelve authInterceptor (refresh o logout).
export type EncounterErrorKind = 'not_found' | 'conflict' | 'forbidden' | 'validation' | 'unauthorized' | 'other';

export interface EncounterError {
  kind: EncounterErrorKind;
  message: string;
}

export const ENCOUNTER_CONFLICT_MESSAGE =
  'El encuentro ya fue firmado/anulado o fue modificado por otro usuario. Se recargaron los datos.';
export const ENCOUNTER_DRAFT_CONFLICT_MESSAGE =
  'La nota fue modificada por otro usuario. Revisá los cambios y volvé a guardar.';
export const ENCOUNTER_FORBIDDEN_MESSAGE = 'Solo el profesional del encuentro puede editar, firmar o anular esta nota.';
export const ENCOUNTER_NOT_FOUND_MESSAGE = 'Encuentro no encontrado.';
export const NO_PROFESSIONAL_MESSAGE = 'Solo profesionales pueden crear encuentros.';
export const INACTIVE_PROFESSIONAL_MESSAGE = 'Tu profesional está desactivado.';
export const PROFESSIONALS_LOAD_ERROR_MESSAGE = 'No se pudieron cargar los profesionales.';
export const PATIENTS_LOAD_ERROR_MESSAGE = 'No se pudieron cargar los pacientes.';
export const ENCOUNTERS_ACCESS_DENIED_MESSAGE = 'Solo los profesionales pueden ver las notas clínicas.';
export const ADMIN_VOID_ONLY_MESSAGE =
  'Solo el profesional del encuentro puede editar o firmar esta nota. Podés anularla administrativamente.';
export const GENERIC_VALIDATION_MESSAGE = 'Revisá los datos ingresados e intentá de nuevo.';

// Fase 4 T4/T5: diagnósticos y CIE-10.
export const DIAGNOSIS_FORBIDDEN_MESSAGE = 'Solo el profesional del encuentro puede agregar o eliminar diagnósticos.';
export const DIAGNOSIS_CONFLICT_MESSAGE =
  'El encuentro ya fue firmado o anulado: sus diagnósticos no se pueden modificar. Se recargaron los datos.';
export const DIAGNOSIS_NOT_FOUND_MESSAGE = 'El diagnóstico ya no existe. Se actualizó la lista.';
export const DIAGNOSIS_DUPLICATE_CODE_MESSAGE = 'Ese código CIE-10 ya está cargado en este encuentro.';
export const DIAGNOSIS_INACTIVE_PROFESSIONAL_MESSAGE =
  'El profesional del encuentro está desactivado: no puede agregar ni eliminar diagnósticos.';
export const DIAGNOSIS_RESOURCE_NOT_FOUND_MESSAGE = 'No se encontró el recurso solicitado.';
export const DIAGNOSES_NOT_FOUND_MESSAGE = 'No se encontraron los diagnósticos: el encuentro no existe o fue eliminado.';
export const DIAGNOSIS_VALIDATION_MESSAGE =
  'Revisá el diagnóstico: indicá una descripción (hasta 1000 caracteres) o un código CIE-10 válido.';
export const DIAGNOSIS_REQUIRED_MESSAGE = 'Ingresá una descripción o elegí un código CIE-10.';
export const DIAGNOSES_LOAD_ERROR_MESSAGE = 'No se pudieron cargar los diagnósticos.';
export const DIAGNOSES_ACCESS_DENIED_MESSAGE = 'No tenés acceso a los diagnósticos de este encuentro.';
export const CIE10_SEARCH_ERROR_MESSAGE = 'No se pudo buscar en el catálogo CIE-10.';

const OPERATION_LABEL: Record<string, string> = {
  update: 'editar', sign: 'firmar', void: 'anular', create: 'crear',
  'add diagnoses to': 'agregar diagnósticos a', 'remove diagnoses from': 'quitar diagnósticos de',
};
const STATUS_LABEL: Record<string, string> = { open: 'abierto', signed: 'firmado', voided: 'anulado' };

const FIELD_LABEL: Record<string, string> = {
  chief_complaint: 'motivo de consulta',
  anamnesis: 'anamnesis',
  exam: 'examen físico',
  reason: 'motivo de anulación',
  patient_id: 'paciente',
  clinical_record_id: 'historia clínica',
  professional_id: 'profesional',
  version: 'versión',
  description: 'descripción',
  cie10_code: 'código CIE-10',
};

// B4: mensajes conocidos del backend (inglés, con GUIDs) → español. Lo que no matchea devuelve
// null y quien llama usa un genérico en español: nunca se muestra el texto crudo del backend.
// Orden: lo específico antes que los genéricos "(\w+) cannot exceed" / "(\w+) is required".
export type KnownMessage = { pattern: RegExp; translate: (m: RegExpMatchArray) => string };

// Diagnósticos / CIE-10 (Polyclinic.Domain: Cie10CodeNotFoundException, Cie10Code, Cie10SearchQuery,
// Diagnosis.Create, DiagnosisDuplicateCodeException, EncounterClosedForChangesException y los
// mensajes de Encounter con ClinicalChildOperation → "add diagnoses to" / "remove diagnoses from").
const DIAGNOSIS_DUPLICATE_CODE_DETAIL = /^Encounter '.*' already has a diagnosis with cie10_code '.*'\.?$/i;

const DIAGNOSIS_MESSAGES: KnownMessage[] = [
  { pattern: DIAGNOSIS_DUPLICATE_CODE_DETAIL, translate: () => DIAGNOSIS_DUPLICATE_CODE_MESSAGE },
  { pattern: /^The encounter is no longer open; its clinical content cannot be changed\.?$/i,
    translate: () => 'El encuentro ya no está abierto: su contenido clínico no se puede modificar.' },
  { pattern: /^description cannot contain the null character.*$/i,
    translate: () => 'La descripción contiene un carácter inválido.' },
  { pattern: /^cie10_code '(.+)' does not exist in the CIE-10 catalog\.?$/i,
    translate: m => `El código CIE-10 ${m[1]} no existe en el catálogo.` },
  { pattern: /^cie10_code '(.+)' is not a valid ICD-10 code\.?$/i,
    translate: m => `El código CIE-10 ${m[1]} no tiene un formato válido.` },
  { pattern: /^cie10_code cannot be empty\.?$/i, translate: () => DIAGNOSIS_REQUIRED_MESSAGE },
  { pattern: /^description is required when cie10_code is not provided\.?$/i,
    translate: () => DIAGNOSIS_REQUIRED_MESSAGE },
  { pattern: /^description cannot exceed (\d+) characters\.?$/i,
    translate: m => `La descripción del diagnóstico no puede superar los ${m[1]} caracteres.` },
  { pattern: /^q must have at least (\d+) characters\.?$/i,
    translate: m => `Escribí al menos ${m[1]} caracteres para buscar.` },
  { pattern: /^q cannot exceed (\d+) characters\.?$/i,
    translate: m => `La búsqueda no puede superar los ${m[1]} caracteres.` },
  { pattern: /^Only the user linked to the encounter's professional can (add diagnoses to|remove diagnoses from) encounter '.*'\.?$/i,
    translate: () => DIAGNOSIS_FORBIDDEN_MESSAGE },
];

const KNOWN_MESSAGES: KnownMessage[] = [
  ...DIAGNOSIS_MESSAGES,
  { pattern: /^Professional with id '.*' is inactive\.?$/i,
    translate: () => 'El profesional del encuentro está desactivado: no puede crear, editar, firmar ni anular.' },
  { pattern: /^Clinical record '.*' does not belong to patient '.*'\.?$/i,
    translate: () => 'La historia clínica no corresponde al paciente seleccionado.' },
  { pattern: /^reason is required\.?$/i, translate: () => 'El motivo de anulación es obligatorio.' },
  { pattern: /^reason cannot exceed (\d+) characters\.?$/i,
    translate: m => `El motivo de anulación no puede superar los ${m[1]} caracteres.` },
  { pattern: /^version is required\.?$/i,
    translate: () => 'Falta la versión del encuentro. Recargá la página e intentá de nuevo.' },
  { pattern: /^Appointment '.*' has status '.*' and cannot be linked to an encounter\.?$/i,
    translate: () => 'La cita fue cancelada o marcada como ausente: no puede asociarse a un encuentro.' },
  { pattern: /^Appointment '.*' does not belong to professional '.*'\.?$/i,
    translate: () => 'La cita corresponde a otro profesional.' },
  { pattern: /^Appointment '.*' does not belong to patient '.*'\.?$/i,
    translate: () => 'La cita corresponde a otro paciente.' },
  { pattern: /^Appointment '.*' already has an encounter\.?$/i,
    translate: () => 'La cita ya tiene un encuentro registrado.' },
  // SpecialtiesInactiveException (alta con specialty_id desactivada).
  { pattern: /^The following specialties are inactive and cannot be assigned: .*$/i,
    translate: () => 'La especialidad seleccionada está desactivada.' },
  // EncounterStatusTransitionNotAllowedException (409).
  { pattern: /^Cannot (.+?) an encounter with status '(\w+)'\.?$/i,
    translate: m => `No se puede ${OPERATION_LABEL[m[1].toLowerCase()] ?? m[1]} un encuentro `
      + `${STATUS_LABEL[m[2].toLowerCase()] ?? m[2]}.` },
  // EncounterActionNotAllowedForUserException (403; la UI usa su propio texto, por si llega como detail).
  { pattern: /^Only the user linked to the (encounter's )?professional can (\w+) (an encounter|encounter '.*')\.?$/i,
    translate: () => ENCOUNTER_FORBIDDEN_MESSAGE },
  { pattern: /^(\w+) cannot exceed (\d+) characters\.?$/i,
    translate: m => `El campo ${FIELD_LABEL[m[1]] ?? m[1]} no puede superar los ${m[2]} caracteres.` },
  { pattern: /^(\w+) is required\.?$/i,
    translate: m => `Falta un dato obligatorio: ${FIELD_LABEL[m[1]] ?? m[1]}.` },
  { pattern: /^encounter_date cannot be in the future\.?$/i,
    translate: () => 'La fecha de atención no puede ser futura.' },
  { pattern: /^clinical_data cannot be null\.?$/i,
    translate: () => 'Los datos clínicos no pueden quedar vacíos.' },
];

// Mismo texto en contexto de diagnósticos: el genérico habla de "crear, editar, firmar o anular".
const DIAGNOSIS_CONTEXT_MESSAGES: KnownMessage[] = [
  { pattern: /^Professional with id '.*' is inactive\.?$/i, translate: () => DIAGNOSIS_INACTIVE_PROFESSIONAL_MESSAGE },
];

// Las ArgumentException de .NET agregan " (Parameter 'x')" al Message, y el backend devuelve
// ex.Message como detail: se quita antes de comparar.
export function normalizeBackendMessage(message: string): string {
  return message.trim().replace(/\s*\(Parameter '[^']*'\)$/, '');
}

export function translateEncounterBackendMessage(message: string, context: KnownMessage[] = []): string | null {
  const text = normalizeBackendMessage(message);
  for (const known of [...context, ...KNOWN_MESSAGES]) {
    const match = text.match(known.pattern);
    if (match) return known.translate(match);
  }
  return null;
}

// ProblemDetails ({ detail }) desde ExceptionHandlingMiddleware, { errors } del model binding o
// { message }. Se traduce cada mensaje; si alguno no se reconoce → null (genérico).
export function backendMessages(err: HttpErrorResponse): string[] {
  const body = err.error;
  if (!body || typeof body !== 'object') return [];
  const raw: string[] = [];
  if (typeof body.detail === 'string' && body.detail) raw.push(body.detail);
  else if (body.errors && typeof body.errors === 'object') {
    raw.push(...Object.values(body.errors as Record<string, unknown>).flat().filter((m): m is string => typeof m === 'string'));
  } else if (typeof body.message === 'string' && body.message) raw.push(body.message);
  return raw;
}

function backendDetail(err: HttpErrorResponse): string {
  return normalizeBackendMessage(backendMessages(err)[0] ?? '');
}

function translatedBackendMessage(err: HttpErrorResponse, context: KnownMessage[] = []): string | null {
  const raw = backendMessages(err);
  if (raw.length === 0) return null;
  const translated = raw.map(m => translateEncounterBackendMessage(m, context));
  return translated.every((t): t is string => t !== null) ? translated.join(' ') : null;
}

export function encounterError(err: unknown, fallback = 'No se pudo completar la operación.'): EncounterError {
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  switch (err.status) {
    case 401: return { kind: 'unauthorized', message: 'Tu sesión expiró. Iniciá sesión de nuevo.' };
    case 403: return { kind: 'forbidden', message: ENCOUNTER_FORBIDDEN_MESSAGE };
    case 404: return { kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE };
    case 409: return { kind: 'conflict', message: translatedBackendMessage(err) ?? ENCOUNTER_CONFLICT_MESSAGE };
    case 422: return { kind: 'validation', message: translatedBackendMessage(err) ?? GENERIC_VALIDATION_MESSAGE };
    case 0: return { kind: 'other', message: 'No se pudo conectar con el servidor.' };
    default: return { kind: 'other', message: fallback };
  }
}

// Fase 4 T5: errores de /tenants/encounters/:id/diagnoses y /tenants/cie10. El `kind` decide qué
// hace la pantalla; se distingue por el detail cuando un mismo status tiene causas distintas:
//   409 código repetido (DiagnosisDuplicateCodeException) → 'duplicate_code' (no recargar), el resto
//       de los 409 (encounter firmado/anulado) → 'conflict' (recargar el encounter).
//   404 "Diagnosis with id …" → 'diagnosis_not_found'; "Encounter with id …" → 'not_found'; otro →
//       genérico.
//   403 → texto propio; 422 → mensaje traducido (en contexto de diagnósticos) o genérico.
export type DiagnosisErrorKind = EncounterErrorKind | 'duplicate_code' | 'diagnosis_not_found';

export interface DiagnosisError {
  kind: DiagnosisErrorKind;
  message: string;
}

// DiagnosisDuplicateCodeException: "Encounter '{id}' already has a diagnosis with cie10_code '{code}'."
// El resto de los 409 (EncounterStatusTransitionNotAllowedException, EncounterClosedForChangesException,
// ConcurrencyConflictException) significan "el encounter ya no está como lo viste" → recargar.
export function isDuplicateCodeDetail(detail: string): boolean {
  return DIAGNOSIS_DUPLICATE_CODE_DETAIL.test(normalizeBackendMessage(detail));
}

export function diagnosisError(err: unknown, fallback = 'No se pudo completar la operación.'): DiagnosisError {
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  const detail = backendDetail(err);
  switch (err.status) {
    case 403: return { kind: 'forbidden', message: DIAGNOSIS_FORBIDDEN_MESSAGE };
    case 404:
      if (/^Diagnosis with id /i.test(detail)) return { kind: 'diagnosis_not_found', message: DIAGNOSIS_NOT_FOUND_MESSAGE };
      if (/^Encounter with id /i.test(detail)) return { kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE };
      return { kind: 'other', message: DIAGNOSIS_RESOURCE_NOT_FOUND_MESSAGE };
    case 409:
      return isDuplicateCodeDetail(detail)
        ? { kind: 'duplicate_code', message: DIAGNOSIS_DUPLICATE_CODE_MESSAGE }
        : { kind: 'conflict', message: DIAGNOSIS_CONFLICT_MESSAGE };
    case 422:
      return {
        kind: 'validation',
        message: translatedBackendMessage(err, DIAGNOSIS_CONTEXT_MESSAGES) ?? DIAGNOSIS_VALIDATION_MESSAGE,
      };
    default: return encounterError(err, fallback);
  }
}

// Error del buscador CIE-10: el 422 de q (2..100) traducido; el resto, genérico.
export function cie10SearchErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 422) {
    return translatedBackendMessage(err) ?? CIE10_SEARCH_ERROR_MESSAGE;
  }
  if (err instanceof HttpErrorResponse && err.status === 0) return 'No se pudo conectar con el servidor.';
  return CIE10_SEARCH_ERROR_MESSAGE;
}
