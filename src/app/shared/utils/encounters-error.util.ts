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

const OPERATION_LABEL: Record<string, string> = {
  update: 'editar', sign: 'firmar', void: 'anular', create: 'crear',
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
};

// B4: mensajes conocidos del backend (inglés, con GUIDs) → español. Lo que no matchea devuelve
// null y quien llama usa un genérico en español: nunca se muestra el texto crudo del backend.
const KNOWN_MESSAGES: { pattern: RegExp; translate: (m: RegExpMatchArray) => string }[] = [
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
  { pattern: /^Cannot (\w+) an encounter with status '(\w+)'\.?$/i,
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

export function translateEncounterBackendMessage(message: string): string | null {
  const text = message.trim();
  for (const known of KNOWN_MESSAGES) {
    const match = text.match(known.pattern);
    if (match) return known.translate(match);
  }
  return null;
}

// ProblemDetails ({ detail }) desde ExceptionHandlingMiddleware, { errors } del model binding o
// { message }. Se traduce cada mensaje; si alguno no se reconoce → null (genérico).
function translatedBackendMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (!body || typeof body !== 'object') return null;
  const raw: string[] = [];
  if (typeof body.detail === 'string' && body.detail) raw.push(body.detail);
  else if (body.errors && typeof body.errors === 'object') {
    raw.push(...Object.values(body.errors as Record<string, unknown>).flat().filter((m): m is string => typeof m === 'string'));
  } else if (typeof body.message === 'string' && body.message) raw.push(body.message);
  if (raw.length === 0) return null;
  const translated = raw.map(translateEncounterBackendMessage);
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
