import { HttpErrorResponse } from '@angular/common/http';
import {
  ODONTOGRAM_CONFLICT_MESSAGE, ODONTOGRAM_DISABLED_MESSAGE, ODONTOGRAM_NO_CURRENT_MESSAGE,
  ODONTOGRAM_PATIENT_NOT_FOUND_MESSAGE, ODONTOGRAM_READ_FORBIDDEN_MESSAGE, ODONTOGRAM_VALIDATION_MESSAGE,
  ODONTOGRAM_NOT_FOUND_MESSAGE, ODONTOGRAM_WRITE_FORBIDDEN_MESSAGE, TOOTH_CONDITION_HISTORIC_MESSAGE,
  TOOTH_CONDITION_NOT_FOUND_MESSAGE, TOOTH_CONDITION_CONFLICT_MESSAGE, ODONTOGRAM_ENCOUNTER_SIGNED_MESSAGE,
  ODONTOGRAM_ENCOUNTER_VOIDED_MESSAGE, odontogramError,
} from './odontogram-error.util';
import { moduleDisabledProblem, moduleRequiresTenantUserProblem } from '../../testing/module-problem';

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

  it('409 encounter firmado / anulado → encounter_closed (distinto del conflicto de current)', () => {
    expect(odontogramError(httpErr(409, { detail: "Cannot attach odontograms to an encounter with status 'signed'." })))
      .toEqual({ kind: 'encounter_closed', message: ODONTOGRAM_ENCOUNTER_SIGNED_MESSAGE });
    expect(odontogramError(httpErr(409, { detail: "Cannot attach odontograms to an encounter with status 'voided'." })))
      .toEqual({ kind: 'encounter_closed', message: ODONTOGRAM_ENCOUNTER_VOIDED_MESSAGE });
    expect(ODONTOGRAM_ENCOUNTER_SIGNED_MESSAGE).toBe('El encuentro está firmado; no se puede asociar el odontograma.');
    expect(ODONTOGRAM_ENCOUNTER_VOIDED_MESSAGE).toBe('El encuentro está anulado; no se puede asociar el odontograma.');
  });

  it('422 encounter de otra historia clínica → texto propio', () => {
    expect(odontogramError(httpErr(422, { detail: "Encounter 'e' does not belong to clinical record 'c'." })))
      .toEqual({ kind: 'validation', message: 'El encuentro indicado no corresponde a la historia clínica del paciente.' });
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

// Textos reales del backend: ToothFdi, ToothCondition, ToothConditionService y las excepciones de
// Polyclinic.Domain/Exceptions/ToothConditions (ArgumentException → 422 con "(Parameter '...')").
describe('odontogramError: condiciones por pieza (/teeth)', () => {
  const ctx = { operation: 'write' as const, odontogramEnabled: true, resource: 'tooth_condition' as const };
  const msg = (status: number, detail: string) => odontogramError(httpErr(status, { detail }), 'x', ctx);

  it('422 tooth_fdi fuera de rango FDI → mensaje visible con la pieza', () => {
    const e = msg(422, "tooth_fdi 19 is not a valid FDI tooth number (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, "
      + "71-75, 81-85). (Parameter 'tooth_fdi')");
    expect(e.kind).toBe('validation');
    expect(e.message).toBe('La pieza 19 no es un número FDI válido (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85).');
  });

  it('422 tooth_fdi requerido / de otra dentición', () => {
    expect(msg(422, "tooth_fdi is required. (Parameter 'tooth_fdi')").message).toBe('Elegí la pieza a marcar.');
    expect(msg(422, "tooth_fdi 51 is not valid for a 'permanente' dentition.").message)
      .toBe('La pieza 51 no corresponde a la dentición permanente de este odontograma.');
  });

  it('422 condition_id requerido / inexistente en el catálogo', () => {
    expect(msg(422, "condition_id is required. (Parameter 'condition_id')").message).toBe('Elegí una condición del catálogo.');
    expect(msg(422, "condition_id '3f1c' does not exist in the dental condition catalog.").message)
      .toBe('La condición elegida ya no existe en el catálogo dental. Recargá la página y elegí otra.');
  });

  it('422 surface / state / note', () => {
    expect(msg(422, "surface cannot be null. (Parameter 'surface')").message).toBe('La cara elegida no es válida.');
    expect(msg(422, "surface must be one of: mesial, distal, oclusal, incisal, vestibular, lingual, palatino, cervical, whole. (Parameter 'surface')").message)
      .toBe('La cara elegida no es válida.');
    expect(msg(422, "state must be one of: existente, planificado, en_proceso, realizado. (Parameter 'state')").message)
      .toBe('El estado elegido no es válido.');
    expect(msg(422, "note cannot exceed 500 characters. (Parameter 'note')").message)
      .toBe('La nota no puede superar los 500 caracteres.');
  });

  it('404 odontograma / tooth condition', () => {
    expect(msg(404, "Odontogram with id 'a' was not found.")).toEqual({ kind: 'not_found', message: ODONTOGRAM_NOT_FOUND_MESSAGE });
    expect(msg(404, "ToothCondition with id 'b' was not found."))
      .toEqual({ kind: 'not_found', message: TOOTH_CONDITION_NOT_FOUND_MESSAGE });
  });

  it('409 en /teeth "historical snapshot" → historic; otro 409 en /teeth → conflict genérico', () => {
    expect(msg(409, "Odontogram 'o' is a historical snapshot (not current); its tooth conditions cannot be changed."))
      .toEqual({ kind: 'historic', message: TOOTH_CONDITION_HISTORIC_MESSAGE });
    expect(msg(409, 'Odontogram is not current.').kind).toBe('historic');
    expect(msg(409, 'The resource was modified by another request.'))
      .toEqual({ kind: 'conflict', message: TOOTH_CONDITION_CONFLICT_MESSAGE });
    expect(odontogramError(httpErr(409), 'x', ctx))
      .toEqual({ kind: 'conflict', message: TOOTH_CONDITION_CONFLICT_MESSAGE });
    expect(odontogramError(httpErr(409, { detail: 'x' }), 'x', { operation: 'write' }).kind).toBe('conflict');
  });

  it('403 ProblemDetails real de ModuleDisabledException (code module_disabled) → feature_disabled', () => {
    expect(odontogramError(httpErr(403, moduleDisabledProblem()), 'x', ctx))
      .toEqual({ kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE });
  });

  it('403 "solo usuarios activos de un tenant" → forbidden, no módulo apagado (aunque el estado sea desconocido)', () => {
    const body = moduleRequiresTenantUserProblem();
    expect(odontogramError(httpErr(403, body), 'x', ctx).kind).toBe('forbidden');
    expect(odontogramError(httpErr(403, body), 'x', { operation: 'read', odontogramEnabled: null }))
      .toEqual({ kind: 'forbidden', message: ODONTOGRAM_READ_FORBIDDEN_MESSAGE });
  });

  it('403 otro ProblemDetails → forbidden; 401 → unauthorized', () => {
    expect(msg(403, 'Only active professionals can write clinical data.').kind).toBe('forbidden');
    expect(odontogramError(httpErr(401), 'x', ctx).kind).toBe('unauthorized');
  });
});
