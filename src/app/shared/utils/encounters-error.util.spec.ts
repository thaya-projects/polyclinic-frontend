import { HttpErrorResponse } from '@angular/common/http';
import {
  ENCOUNTER_CONFLICT_MESSAGE, ENCOUNTER_FORBIDDEN_MESSAGE, ENCOUNTER_NOT_FOUND_MESSAGE, GENERIC_VALIDATION_MESSAGE,
  encounterError, translateEncounterBackendMessage,
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
