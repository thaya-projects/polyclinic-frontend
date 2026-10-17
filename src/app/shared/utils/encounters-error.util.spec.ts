import { HttpErrorResponse } from '@angular/common/http';
import {
  ENCOUNTER_CONFLICT_MESSAGE, ENCOUNTER_FORBIDDEN_MESSAGE, ENCOUNTER_NOT_FOUND_MESSAGE, GENERIC_VALIDATION_MESSAGE,
  encounterError, translateEncounterBackendMessage,
  DIAGNOSIS_CONFLICT_MESSAGE, DIAGNOSIS_DUPLICATE_CODE_MESSAGE, DIAGNOSIS_FORBIDDEN_MESSAGE,
  DIAGNOSIS_INACTIVE_PROFESSIONAL_MESSAGE, DIAGNOSIS_NOT_FOUND_MESSAGE, DIAGNOSIS_REQUIRED_MESSAGE,
  DIAGNOSIS_RESOURCE_NOT_FOUND_MESSAGE, DIAGNOSIS_VALIDATION_MESSAGE, cie10SearchErrorMessage, diagnosisError,
  normalizeBackendMessage,
} from './encounters-error.util';

const httpErr = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('encounterError', () => {
  it('0 → sin conexión', () => {
    expect(encounterError(httpErr(0))).toEqual({ kind: 'other', message: 'No se pudo conectar con el servidor.' });
  });

  it('401 → unauthorized (lo resuelve authInterceptor)', () => {
    expect(encounterError(httpErr(401)).kind).toBe('unauthorized');
  });

  it('403 / 404', () => {
    expect(encounterError(httpErr(403))).toEqual({ kind: 'forbidden', message: ENCOUNTER_FORBIDDEN_MESSAGE });
    expect(encounterError(httpErr(404))).toEqual({ kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE });
  });

  it('409 de concurrencia → mensaje de conflicto en español', () => {
    const err = httpErr(409, { detail: 'The resource was modified by another request. Reload and try again.' });
    expect(encounterError(err)).toEqual({ kind: 'conflict', message: ENCOUNTER_CONFLICT_MESSAGE });
  });

  it('422 con detail conocido → traducido', () => {
    const err = httpErr(422, { title: 'Unprocessable Entity', detail: 'version is required.' });
    expect(encounterError(err)).toEqual({
      kind: 'validation', message: 'Falta la versión del encuentro. Recargá la página e intentá de nuevo.',
    });
  });

  it('422 con detail desconocido → genérico en español (nunca el texto crudo con GUIDs)', () => {
    const err = httpErr(422, { detail: "Weird rule for '3f2a-…' failed." });
    expect(encounterError(err)).toEqual({ kind: 'validation', message: GENERIC_VALIDATION_MESSAGE });
  });

  it('422 con errors (model binding) conocidos → traducidos', () => {
    const err = httpErr(422, { errors: { reason: ['reason is required.'], anamnesis: ['anamnesis cannot exceed 20000 characters.'] } });
    expect(encounterError(err).message)
      .toBe('El motivo de anulación es obligatorio. El campo anamnesis no puede superar los 20000 caracteres.');
  });

  it('422 con errors desconocidos → genérico', () => {
    const err = httpErr(422, { errors: { $: ['The JSON value could not be converted to System.Guid.'] } });
    expect(encounterError(err).message).toBe(GENERIC_VALIDATION_MESSAGE);
  });

  it('error que no es HTTP → fallback', () => {
    expect(encounterError(new Error('x'), 'fallback')).toEqual({ kind: 'other', message: 'fallback' });
  });
});

describe('translateEncounterBackendMessage', () => {
  const cases: [string, string][] = [
    ["Professional with id '9b1c' is inactive.", 'El profesional del encuentro está desactivado'],
    ["Clinical record 'a' does not belong to patient 'b'.", 'La historia clínica no corresponde al paciente seleccionado.'],
    ['reason is required.', 'El motivo de anulación es obligatorio.'],
    ['reason cannot exceed 500 characters.', 'El motivo de anulación no puede superar los 500 caracteres.'],
    ['version is required.', 'Falta la versión del encuentro.'],
    ["Appointment 'a' has status 'Cancelled' and cannot be linked to an encounter.", 'La cita fue cancelada o marcada como ausente'],
    ["Appointment 'a' does not belong to professional 'p'.", 'La cita corresponde a otro profesional.'],
    ["Appointment 'a' already has an encounter.", 'La cita ya tiene un encuentro registrado.'],
    ['The following specialties are inactive and cannot be assigned: 7c1e-aa.', 'La especialidad seleccionada está desactivada.'],
    ["Cannot sign an encounter with status 'signed'.", 'No se puede firmar un encuentro firmado.'],
    ["Cannot update an encounter with status 'voided'.", 'No se puede editar un encuentro anulado.'],
    ["Only the user linked to the encounter's professional can void encounter 'e1'.", 'Solo el profesional del encuentro'],
  ];
  for (const [raw, expected] of cases) {
    it(raw, () => expect(translateEncounterBackendMessage(raw)).toContain(expected));
  }

  it('desconocido → null', () => {
    expect(translateEncounterBackendMessage('Something else.')).toBeNull();
  });
});

describe('sufijo (Parameter) de ArgumentException', () => {
  it('se quita antes de traducir (detail real del backend)', () => {
    expect(normalizeBackendMessage("reason is required. (Parameter 'reason')")).toBe('reason is required.');
    expect(translateEncounterBackendMessage("reason is required. (Parameter 'reason')"))
      .toBe('El motivo de anulación es obligatorio.');
    expect(translateEncounterBackendMessage("version is required. (Parameter 'version')"))
      .toContain('Falta la versión del encuentro.');
    expect(translateEncounterBackendMessage("chief_complaint cannot exceed 500 characters. (Parameter 'chief_complaint')"))
      .toBe('El campo motivo de consulta no puede superar los 500 caracteres.');
    expect(translateEncounterBackendMessage("encounter_date cannot be in the future. (Parameter 'encounter_date')"))
      .toBe('La fecha de atención no puede ser futura.');
  });

  it('un 422 de encounter con sufijo ya no cae al genérico', () => {
    const err = httpErr(422, { detail: "reason cannot exceed 500 characters. (Parameter 'reason')" });
    expect(encounterError(err).message).toBe('El motivo de anulación no puede superar los 500 caracteres.');
  });
});

describe('translateEncounterBackendMessage: diagnósticos y CIE-10 (textos de Polyclinic.Domain)', () => {
  const cases: [string, string][] = [
    ["cie10_code 'X99.9' does not exist in the CIE-10 catalog.", 'El código CIE-10 X99.9 no existe en el catálogo.'],
    ["cie10_code 'ZZZ' is not a valid ICD-10 code. (Parameter 'cie10_code')", 'El código CIE-10 ZZZ no tiene un formato válido.'],
    ["description is required when cie10_code is not provided. (Parameter 'description')", DIAGNOSIS_REQUIRED_MESSAGE],
    ["description cannot exceed 1000 characters. (Parameter 'description')",
      'La descripción del diagnóstico no puede superar los 1000 caracteres.'],
    ["q must have at least 2 characters. (Parameter 'q')", 'Escribí al menos 2 caracteres para buscar.'],
    ["q cannot exceed 100 characters. (Parameter 'q')", 'La búsqueda no puede superar los 100 caracteres.'],
    ["Only the user linked to the encounter's professional can add diagnoses to encounter 'e1'.", DIAGNOSIS_FORBIDDEN_MESSAGE],
    ["Cannot add diagnoses to an encounter with status 'signed'.", 'No se puede agregar diagnósticos a un encuentro firmado.'],
    ["Cannot remove diagnoses from an encounter with status 'voided'.", 'No se puede quitar diagnósticos de un encuentro anulado.'],
    ["Encounter 'e1' already has a diagnosis with cie10_code 'R51'.", DIAGNOSIS_DUPLICATE_CODE_MESSAGE],
    ['The encounter is no longer open; its clinical content cannot be changed.',
      'El encuentro ya no está abierto: su contenido clínico no se puede modificar.'],
    ["description cannot contain the null character (U+0000). (Parameter 'description')",
      'La descripción contiene un carácter inválido.'],
  ];
  for (const [raw, expected] of cases) {
    it(raw, () => expect(translateEncounterBackendMessage(raw)).toBe(expected));
  }
});

describe('diagnosisError', () => {
  it('403 → texto propio de diagnósticos', () => {
    expect(diagnosisError(httpErr(403))).toEqual({ kind: 'forbidden', message: DIAGNOSIS_FORBIDDEN_MESSAGE });
  });

  it('404: distingue diagnosis / encounter / otro por el detail', () => {
    expect(diagnosisError(httpErr(404, { detail: "Diagnosis with id 'd1' was not found." })))
      .toEqual({ kind: 'diagnosis_not_found', message: DIAGNOSIS_NOT_FOUND_MESSAGE });
    expect(diagnosisError(httpErr(404, { detail: "Encounter with id 'e1' was not found." })))
      .toEqual({ kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE });
    expect(diagnosisError(httpErr(404))).toEqual({ kind: 'other', message: DIAGNOSIS_RESOURCE_NOT_FOUND_MESSAGE });
  });

  it('409: código repetido ≠ encounter firmado/anulado', () => {
    expect(diagnosisError(httpErr(409, { detail: "Encounter 'e1' already has a diagnosis with cie10_code 'R51'." })))
      .toEqual({ kind: 'duplicate_code', message: DIAGNOSIS_DUPLICATE_CODE_MESSAGE });
    expect(diagnosisError(httpErr(409, { detail: "Cannot add diagnoses to an encounter with status 'signed'." })))
      .toEqual({ kind: 'conflict', message: DIAGNOSIS_CONFLICT_MESSAGE });
    // EncounterClosedForChangesException (race: firmado entre la lectura y el lock).
    expect(diagnosisError(httpErr(409, { detail: 'The encounter is no longer open; its clinical content cannot be changed.' })))
      .toEqual({ kind: 'conflict', message: DIAGNOSIS_CONFLICT_MESSAGE });
    expect(diagnosisError(httpErr(409, { detail: 'The resource was modified by another request. Reload and try again.' })).kind)
      .toBe('conflict');
  });

  it('422: traducido en contexto de diagnósticos, o genérico', () => {
    expect(diagnosisError(httpErr(422, { detail: "Professional with id 'p1' is inactive." })).message)
      .toBe(DIAGNOSIS_INACTIVE_PROFESSIONAL_MESSAGE);
    expect(diagnosisError(httpErr(422, { detail: "cie10_code 'X99.9' does not exist in the CIE-10 catalog." })).message)
      .toBe('El código CIE-10 X99.9 no existe en el catálogo.');
    expect(diagnosisError(httpErr(422, { detail: 'Algo desconocido.' })).message).toBe(DIAGNOSIS_VALIDATION_MESSAGE);
  });

  it('el buscador traduce el 422 de q', () => {
    expect(cie10SearchErrorMessage(httpErr(422, { detail: "q cannot exceed 100 characters. (Parameter 'q')" })))
      .toBe('La búsqueda no puede superar los 100 caracteres.');
  });
});
