import { HttpErrorResponse } from '@angular/common/http';
import {
  ODONTOGRAM_CONFLICT_MESSAGE, ODONTOGRAM_DISABLED_MESSAGE, ODONTOGRAM_NO_CURRENT_MESSAGE,
  ODONTOGRAM_PATIENT_NOT_FOUND_MESSAGE, ODONTOGRAM_READ_FORBIDDEN_MESSAGE, ODONTOGRAM_VALIDATION_MESSAGE,
  ODONTOGRAM_WRITE_FORBIDDEN_MESSAGE, odontogramError,
} from './odontogram-error.util';

const httpErr = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('odontogramError', () => {
  it('404 "sin current" → no_current (estado vacío, no error)', () => {
    const err = httpErr(404, { detail: "Patient 'abc' has no current odontogram." });
    expect(odontogramError(err)).toEqual({ kind: 'no_current', message: ODONTOGRAM_NO_CURRENT_MESSAGE });
  });

  it('404 de paciente / historia clínica / encounter → not_found con texto propio', () => {
    expect(odontogramError(httpErr(404, { detail: "Patient with id 'x' was not found." })))
      .toEqual({ kind: 'not_found', message: ODONTOGRAM_PATIENT_NOT_FOUND_MESSAGE });
    expect(odontogramError(httpErr(404, { detail: "ClinicalRecord with id 'x' was not found." })).message)
      .toBe('No se encontró la historia clínica del paciente.');
    expect(odontogramError(httpErr(404, { detail: "Encounter with id 'x' was not found." })).message)
      .toBe('El encuentro indicado no existe.');
  });

  it('409 → conflict (carrera del current)', () => {
    const err = httpErr(409, { detail: "Another odontogram became current for patient 'x' concurrently. Reload and try again." });
    expect(odontogramError(err)).toEqual({ kind: 'conflict', message: ODONTOGRAM_CONFLICT_MESSAGE });
  });

  it('422 conocido → traducido; desconocido → genérico', () => {
    expect(odontogramError(httpErr(422, { detail: "clinical_record_id is required. (Parameter 'clinical_record_id')" })).message)
      .toBe('Falta la historia clínica del paciente.');
    expect(odontogramError(httpErr(422, { detail: "Encounter 'e' does not belong to patient 'p'." })).message)
      .toBe('El encuentro indicado no corresponde a este paciente.');
    expect(odontogramError(httpErr(422, { errors: { $: ['x'] } })))
      .toEqual({ kind: 'validation', message: ODONTOGRAM_VALIDATION_MESSAGE });
  });

  it('401 / 0 / no HTTP', () => {
    expect(odontogramError(httpErr(401)).kind).toBe('unauthorized');
    expect(odontogramError(httpErr(0)).message).toBe('No se pudo conectar con el servidor.');
    expect(odontogramError(new Error('x'), 'fallback')).toEqual({ kind: 'other', message: 'fallback' });
  });
});

describe('odontogramError: 403', () => {
  it('ProblemDetails del módulo apagado (ModuleDisabledException) → feature_disabled aunque la sesión lo crea prendido', () => {
    const bodies = [
      { title: 'Forbidden', status: 403, detail: "Module 'odontogram' is not enabled for this tenant." },
      { title: 'Forbidden', status: 403, detail: 'The odontogram module is disabled.' },
      { type: 'https://polyclinic/errors/module-disabled', title: 'Module disabled', status: 403 },
      { code: 'module_disabled', detail: 'x' },
    ];
    for (const body of bodies) {
      expect(odontogramError(httpErr(403, body), 'x', { operation: 'write', odontogramEnabled: true }))
        .toEqual({ kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE });
    }
  });

  it('otro ProblemDetails 403 → sin permiso aunque la sesión crea el módulo apagado', () => {
    const err = httpErr(403, { detail: 'You are not allowed to perform this action.' });
    expect(odontogramError(err, 'x', { operation: 'read', odontogramEnabled: false }))
      .toEqual({ kind: 'forbidden', message: ODONTOGRAM_READ_FORBIDDEN_MESSAGE });
  });

  it('403 sin body: respaldo con el estado del módulo de la sesión', () => {
    expect(odontogramError(httpErr(403), 'x', { operation: 'read', odontogramEnabled: null }).kind).toBe('feature_disabled');
    expect(odontogramError(httpErr(403), 'x', { operation: 'read', odontogramEnabled: false }).kind).toBe('feature_disabled');
    expect(odontogramError(httpErr(403), 'x', { operation: 'read', odontogramEnabled: true }))
      .toEqual({ kind: 'forbidden', message: ODONTOGRAM_READ_FORBIDDEN_MESSAGE });
    expect(odontogramError(httpErr(403), 'x', { operation: 'write', odontogramEnabled: false }).kind).toBe('feature_disabled');
    expect(odontogramError(httpErr(403), 'x', { operation: 'write', odontogramEnabled: null }))
      .toEqual({ kind: 'forbidden', message: ODONTOGRAM_WRITE_FORBIDDEN_MESSAGE });
  });
});
