import { HttpErrorResponse } from '@angular/common/http';
import {
  MEASUREMENT_CONFLICT_MESSAGE, MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE, MEASUREMENT_FORBIDDEN_MESSAGE,
  MEASUREMENT_INACTIVE_PROFESSIONAL_MESSAGE, MEASUREMENT_TYPE_FORMAT_MESSAGE, MEASUREMENT_VALIDATION_MESSAGE,
  PATIENT_NOT_FOUND_MESSAGE, measurementError, translateMeasurementBackendMessage,
} from './measurements-error.util';
import { ENCOUNTER_NOT_FOUND_MESSAGE } from './encounters-error.util';
import { formatMeasurementRange } from '../../core/models/measurement.model';

const error = (status: number, detail?: string) => new HttpErrorResponse({ status, error: detail ? { detail } : null });

describe('measurementError', () => {
  it('401 → unauthorized (lo resuelve authInterceptor)', () => {
    expect(measurementError(error(401)).kind).toBe('unauthorized');
  });

  it('404: distingue paciente y encuentro por el detail', () => {
    expect(measurementError(error(404, "Patient with id 'p1' was not found.")))
      .toEqual({ kind: 'patient_not_found', message: PATIENT_NOT_FOUND_MESSAGE });
    expect(measurementError(error(404, "Encounter with id 'e1' was not found.")))
      .toEqual({ kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE });
    expect(measurementError(error(404)).kind).toBe('other');
  });

  it('403: mensaje de acceso según el contexto / detail', () => {
    expect(measurementError(error(403)).message).toBe(MEASUREMENT_FORBIDDEN_MESSAGE);
    expect(measurementError(error(403), { encounterContext: true }).message).toBe(MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE);
    expect(measurementError(error(403, 'Only a user linked to a professional of the tenant can record measurements.')).message)
      .toBe(MEASUREMENT_FORBIDDEN_MESSAGE);
    expect(measurementError(error(403,
      "Only the user linked to the encounter's professional can add measurements to encounter 'e1'.")).message)
      .toBe(MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE);
  });

  it('409 → conflict', () => {
    expect(measurementError(error(409, "Cannot add measurements to an encounter with status 'signed'.")))
      .toEqual({ kind: 'conflict', message: MEASUREMENT_CONFLICT_MESSAGE });
  });

  it('422 → mensajes del backend en español (sin el sufijo "(Parameter \'x\')"); desconocido → genérico', () => {
    const cases: [string, string][] = [
      ["unit for type 'weight' must be 'kg' (or omitted). (Parameter 'unit')", 'Peso: la unidad debe ser kg.'],
      ["unit is required for custom measurement types. (Parameter 'unit')",
        'Indicá la unidad: es obligatoria para los tipos que no están en el catálogo.'],
      ["value for type 'heart_rate' must be between 0 and 350 bpm. (Parameter 'value')",
        'Frecuencia cardíaca: el valor debe estar entre 0 y 350 bpm.'],
      ["value cannot have more than 4 decimal places. (Parameter 'value')", 'El valor no puede tener más de 4 decimales.'],
      ["value must be less than 10^10 in absolute value. (Parameter 'value')", 'El valor es demasiado grande.'],
      ["value is required. (Parameter 'value')", 'Falta un dato obligatorio: valor.'],
      ["type must start with a letter and contain only lowercase letters, digits or '_' (2-50 characters). (Parameter 'type')",
        MEASUREMENT_TYPE_FORMAT_MESSAGE],
      ['measured_at cannot be in the future. (Parameter \'measured_at\')', 'La fecha de medición no puede ser futura.'],
      ['measured_at cannot be earlier than 1900-01-01. (Parameter \'measured_at\')', 'La fecha de medición no puede ser anterior a 1900.'],
      ["measured_at must include a UTC offset (e.g. '2026-01-01T10:00:00Z' or '...-04:00'). (Parameter 'measured_at')",
        'La fecha de medición debe incluir la zona horaria.'],
      ["from must include a UTC offset (e.g. '2026-01-01T10:00:00Z' or '...-04:00'). (Parameter 'from')",
        'La fecha "desde" debe incluir la zona horaria.'],
      ["to must be an ISO 8601 date-time (date-only values are not accepted). (Parameter 'to')",
        'La fecha "hasta" debe incluir fecha y hora.'],
      ["from is not a valid date-time. (Parameter 'from')", 'La fecha "desde" no es una fecha válida.'],
      ['from cannot be later than to. (Parameter \'from\')', 'La fecha "desde" no puede ser posterior a la fecha "hasta".'],
      ["note cannot exceed 1000 characters. (Parameter 'note')", 'El campo nota no puede superar los 1000 caracteres.'],
      ["unit cannot exceed 20 characters. (Parameter 'unit')", 'El campo unidad no puede superar los 20 caracteres.'],
      ["note cannot contain the null character (U+0000). (Parameter 'note')", 'El campo nota contiene un carácter inválido.'],
      ["Encounter 'e1' does not belong to patient 'p1'.", 'El encuentro corresponde a otro paciente.'],
      ["Professional with id 'x' is inactive.", MEASUREMENT_INACTIVE_PROFESSIONAL_MESSAGE],
    ];
    for (const [detail, expected] of cases) {
      expect(measurementError(error(422, detail))).toEqual({ kind: 'validation', message: expected });
    }
    expect(measurementError(error(422, 'Something unexpected in English.')).message).toBe(MEASUREMENT_VALIDATION_MESSAGE);
  });

  it('no pasa las etiquetas a minúsculas (SpO₂, IMC)', () => {
    expect(translateMeasurementBackendMessage("unit for type 'spo2' must be '%' (or omitted)."))
      .toBe('Saturación de O₂: la unidad debe ser %.');
    expect(translateMeasurementBackendMessage("value for type 'bmi' must be between 5 and 150 kg/m2."))
      .toBe('IMC: el valor debe estar entre 5 y 150 kg/m2.');
  });

  it('formatea los números del 422 con el locale del tenant, igual que el rango del formulario', () => {
    const message = measurementError(
      error(422, "value for type 'weight' must be between 0.2 and 700 kg. (Parameter 'value')"),
      { locale: 'es-AR' },
    ).message;
    expect(message).toBe('Peso: el valor debe estar entre 0,2 y 700 kg.');
    expect(formatMeasurementRange(0.2, 700, 'kg', 'es-AR')).toBe('0,2 – 700 kg');
    expect(measurementError(error(422, "value for type 'glucose' must be between 10 and 3000 mg/dL."), { locale: 'es-AR' })
      .message).toBe('Glucemia: el valor debe estar entre 10 y 3.000 mg/dL.');
  });

  it('errores no HTTP → fallback', () => {
    expect(measurementError(new Error('x'), { fallback: 'fallback' })).toEqual({ kind: 'other', message: 'fallback' });
  });

  it('translateMeasurementBackendMessage: null si no se reconoce', () => {
    expect(translateMeasurementBackendMessage('nope')).toBeNull();
  });
});
