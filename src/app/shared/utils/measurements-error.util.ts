import { HttpErrorResponse } from '@angular/common/http';
import {
  ENCOUNTER_NOT_FOUND_MESSAGE, EncounterErrorKind, KnownMessage, backendMessages, encounterError, normalizeBackendMessage,
  translateEncounterBackendMessage,
} from './encounters-error.util';
import { formatMeasurementValue, measurementTypeLabel } from '../../core/models/measurement.model';
import { extractServerError } from './server-errors.util';
import { translatedValidationMessage } from './translated-validation.util';

// Fase 4 T4: errores de /tenants/patients/:id/measurements y /tenants/measurement-types.
// `kind` decide qué hace la pantalla; un mismo status con causas distintas se separa por el detail:
//   404 "Patient with id …" → 'patient_not_found' ("Paciente no encontrado."); "Encounter with id …"
//       → 'not_found' ("Encuentro no encontrado."); otro → genérico.
//   409 → 'conflict' (el encounter ya no está open: el contenedor lo recarga → solo lectura).
//   403 → texto propio en español; 422 → mensaje del backend traducido o genérico.
//   401 → 'unauthorized' (lo resuelve authInterceptor: la pantalla no muestra nada).
export type MeasurementErrorKind = EncounterErrorKind | 'patient_not_found';

export interface MeasurementError {
  kind: MeasurementErrorKind;
  message: string;
}

export const PATIENT_NOT_FOUND_MESSAGE = 'Paciente no encontrado.';
export const MEASUREMENTS_ACCESS_DENIED_MESSAGE = 'Solo los profesionales pueden ver los signos vitales.';
export const MEASUREMENT_FORBIDDEN_MESSAGE = 'Solo los profesionales activos pueden registrar signos vitales.';
export const MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE =
  'Solo el profesional del encuentro puede registrar signos vitales en él.';
export const MEASUREMENT_INACTIVE_PROFESSIONAL_MESSAGE =
  'Tu profesional está desactivado: no podés registrar signos vitales.';
export const MEASUREMENT_CONFLICT_MESSAGE =
  'El encuentro ya fue firmado o anulado: no se pueden registrar signos vitales en él. Se recargaron los datos.';
export const MEASUREMENT_VALIDATION_MESSAGE = 'Revisá la medición: tipo, valor, unidad, fecha y nota.';
export const MEASUREMENT_RESOURCE_NOT_FOUND_MESSAGE = 'No se encontró el recurso solicitado.';
export const MEASUREMENTS_LOAD_ERROR_MESSAGE = 'No se pudieron cargar los signos vitales.';
export const MEASUREMENT_TYPES_LOAD_ERROR_MESSAGE = 'No se pudo cargar el catálogo de tipos de medición.';
export const MEASUREMENT_REQUIRED_MESSAGE = 'Elegí un tipo e ingresá un valor.';
export const MEASUREMENT_TYPE_FORMAT_MESSAGE =
  'El código del tipo debe empezar con una letra minúscula y tener entre 2 y 50 caracteres (minúsculas, números y guion bajo).';

const FIELD_LABEL: Record<string, string> = {
  type: 'tipo',
  value: 'valor',
  unit: 'unidad',
  measured_at: 'fecha de medición',
  note: 'nota',
  encounter_id: 'encuentro',
  from: 'desde',
  to: 'hasta',
};

const INSTANT_LABEL: Record<string, string> = {
  measured_at: 'La fecha de medición',
  from: 'La fecha "desde"',
  to: 'La fecha "hasta"',
};

const NUMBER = '(-?\\d+(?:\\.\\d+)?)';

// Mensajes conocidos del backend → español (textos de Polyclinic.Domain: Exceptions/ClinicalMeasurements,
// ValueObjects/ClinicalMeasurements/MeasurementType.cs, Entities/ClinicalMeasurement.cs,
// Validation/ClinicalInstantGuard.cs, NullCharacterGuard y MeasurementController/Service). Llegan sin
// el sufijo "(Parameter 'x')" (normalizeBackendMessage). Las etiquetas de tipo se usan tal cual
// ("SpO₂", "IMC": nada de pasarlas a minúsculas) y los números del backend (invariantes, "0.2") se
// formatean con el locale del tenant, igual que el rango del formulario. Lo que no matchea cae en los
// genéricos de encounters y, si tampoco, en MEASUREMENT_VALIDATION_MESSAGE: nunca se muestra el
// texto crudo en inglés. Orden: lo específico antes que los genéricos.
export function measurementMessages(locale = 'es'): KnownMessage[] {
  return [
    // ClinicalMeasurement.ResolveUnit: unidad distinta de la canónica de un tipo conocido.
    { pattern: /^unit for type '(\w+)' must be '([^']+)'(?: \(or omitted\))?\.?$/i,
      translate: m => `${measurementTypeLabel(m[1])}: la unidad debe ser ${m[2]}.` },
    // Tipo libre sin unidad.
    { pattern: /^unit is required for custom measurement types\.?$/i,
      translate: () => 'Indicá la unidad: es obligatoria para los tipos que no están en el catálogo.' },
    // ClinicalMeasurement.ValidateValue: rango del catálogo (con la unidad), decimales y magnitud.
    { pattern: new RegExp(`^value for type '(\\w+)' must be between ${NUMBER} and ${NUMBER}(?: (.+?))?\\.?$`, 'i'),
      translate: m => `${measurementTypeLabel(m[1])}: el valor debe estar entre `
        + `${formatMeasurementValue(Number(m[2]), locale)} y ${formatMeasurementValue(Number(m[3]), locale)}`
        + `${m[4] ? ` ${m[4]}` : ''}.` },
    { pattern: /^value cannot have more than (\d+) decimal places\.?$/i,
      translate: m => `El valor no puede tener más de ${m[1]} decimales.` },
    { pattern: /^value must be less than 10\^10 in absolute value\.?$/i,
      translate: () => 'El valor es demasiado grande.' },
    // MeasurementType.Create: formato del tipo (alta y filtro del listado).
    { pattern: /^type must start with a letter.*$/i, translate: () => MEASUREMENT_TYPE_FORMAT_MESSAGE },
    // ClinicalInstantGuard (measured_at) y filtros from/to sin offset.
    { pattern: /^(measured_at|from|to) cannot be in the future\.?$/i,
      translate: m => `${INSTANT_LABEL[m[1]]} no puede ser futura.` },
    { pattern: /^(measured_at|from|to) cannot be earlier than 1900-01-01\.?$/i,
      translate: m => `${INSTANT_LABEL[m[1]]} no puede ser anterior a 1900.` },
    { pattern: /^(measured_at|from|to) must include a UTC offset.*$/i,
      translate: m => `${INSTANT_LABEL[m[1]]} debe incluir la zona horaria.` },
    // ClinicalInstantGuard.ParseFilter (from/to del listado).
    { pattern: /^(from|to) must be an ISO 8601 date-time.*$/i,
      translate: m => `${INSTANT_LABEL[m[1]]} debe incluir fecha y hora.` },
    { pattern: /^(from|to) is not a valid date-time\.?$/i,
      translate: m => `${INSTANT_LABEL[m[1]]} no es una fecha válida.` },
    // ClinicalMeasurementEncounterPatientMismatchException (422) y EncounterActionNotAllowedForUserException
    // con "add measurements to" (403).
    { pattern: /^Encounter '.*' does not belong to patient '.*'\.?$/i,
      translate: () => 'El encuentro corresponde a otro paciente.' },
    { pattern: /^Only the user linked to the encounter's professional can add measurements to encounter '.*'\.?$/i,
      translate: () => MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE },
    // ClinicalMeasurementActionNotAllowedForUserException (403, sin profesional activo).
    { pattern: /^Only a user linked to (?:an active|a) professional of the tenant can record measurements\.?$/i,
      translate: () => MEASUREMENT_FORBIDDEN_MESSAGE },
    { pattern: /^Professional with id '.*' is inactive\.?$/i, translate: () => MEASUREMENT_INACTIVE_PROFESSIONAL_MESSAGE },
    // MeasurementController / ClinicalMeasurementService (listado).
    { pattern: /^encounter_id is not a valid id\.?$/i, translate: () => 'El encuentro indicado no es válido.' },
    { pattern: /^from cannot be later than to\.?$/i,
      translate: () => 'La fecha "desde" no puede ser posterior a la fecha "hasta".' },
    // NullCharacterGuard (unit, note).
    { pattern: /^(\w+) cannot contain the null character.*$/i,
      translate: m => `El campo ${FIELD_LABEL[m[1]] ?? m[1]} contiene un carácter inválido.` },
    { pattern: /^(\w+) cannot exceed (\d+) characters\.?$/i,
      translate: m => `El campo ${FIELD_LABEL[m[1]] ?? m[1]} no puede superar los ${m[2]} caracteres.` },
    { pattern: /^(\w+) is required\.?$/i,
      translate: m => `Falta un dato obligatorio: ${FIELD_LABEL[m[1]] ?? m[1]}.` },
  ];
}

export function translateMeasurementBackendMessage(message: string, locale = 'es'): string | null {
  return translateEncounterBackendMessage(message, measurementMessages(locale));
}

function translated(err: HttpErrorResponse, locale: string): string | null {
  const raw = backendMessages(err);
  if (raw.length === 0) return null;
  const list = raw.map(m => translateMeasurementBackendMessage(m, locale));
  return list.every((t): t is string => t !== null) ? list.join(' ') : null;
}

function detail(err: HttpErrorResponse): string {
  return normalizeBackendMessage(backendMessages(err)[0] ?? '');
}

export interface MeasurementErrorOptions {
  fallback?: string;
  // La operación fue sobre un encounter (sección del detalle) → el 403 habla del profesional del encuentro.
  encounterContext?: boolean;
  locale?: string;
}

export function measurementError(err: unknown, options: MeasurementErrorOptions = {}): MeasurementError {
  const { fallback = 'No se pudo completar la operación.', encounterContext = false, locale = 'es' } = options;
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  switch (err.status) {
    case 403:
      return {
        kind: 'forbidden',
        message: translated(err, locale)
          ?? (encounterContext ? MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE : MEASUREMENT_FORBIDDEN_MESSAGE),
      };
    case 404: {
      const text = detail(err);
      if (/^Patient with id /i.test(text)) return { kind: 'patient_not_found', message: PATIENT_NOT_FOUND_MESSAGE };
      if (/^Encounter with id /i.test(text)) return { kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE };
      return { kind: 'other', message: MEASUREMENT_RESOURCE_NOT_FOUND_MESSAGE };
    }
    case 409: return { kind: 'conflict', message: MEASUREMENT_CONFLICT_MESSAGE };
    // 400 (model binding) y 422: texto propio si se reconoce, si no el genérico traducido con el campo.
    case 400:
    case 422: return {
      kind: 'validation',
      message: translated(err, locale) ?? translatedValidationMessage(err) ?? MEASUREMENT_VALIDATION_MESSAGE,
    };
    default: return encounterError(err, fallback);
  }
}

// Campo del alta al que apunta un 400/422, para marcarlo en su input. El middleware no informa
// `field` cuando el ParamName es "value" (justo el del valor de la medición), así que primero se lee
// el detail ("value for type …", "unit is required …", "measured_at cannot …", "note cannot …").
const FIELD_FROM_DETAIL = /^(type|value|unit|measured_at|note)\b/i;

export function measurementErrorField(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse) || (err.status !== 400 && err.status !== 422)) return null;
  const match = detail(err).match(FIELD_FROM_DETAIL);
  return match ? match[1].toLowerCase() : extractServerError(err)?.field ?? null;
}
