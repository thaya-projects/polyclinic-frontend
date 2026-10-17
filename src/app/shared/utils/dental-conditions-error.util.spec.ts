import { HttpErrorResponse } from '@angular/common/http';
import {
  DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE, DENTAL_CONDITION_FORBIDDEN_MESSAGE, DENTAL_CONDITION_GLOBAL_MESSAGE,
  DENTAL_CONDITION_NOT_FOUND_MESSAGE, DENTAL_CONDITION_VALIDATION_MESSAGE, dentalConditionError,
} from './dental-conditions-error.util';

const httpErr = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('dentalConditionError', () => {
  it('409 → "código ya existe" (sin el detail crudo con el GUID del tenant)', () => {
    const err = httpErr(409, { detail: "A dental condition with code 'x' already exists for tenant '3f2a'." });
    expect(dentalConditionError(err)).toEqual({ kind: 'duplicate_code', message: DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE });
    expect(DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE).toContain('código ya existe');
  });

  it('403 de condición global → mensaje propio', () => {
    const err = httpErr(403, { detail: "Dental condition with id 'abc' is global and cannot be modified." });
    expect(dentalConditionError(err)).toEqual({ kind: 'global_not_editable', message: DENTAL_CONDITION_GLOBAL_MESSAGE });
  });

  it('403 sin detail → sin permiso', () => {
    expect(dentalConditionError(httpErr(403))).toEqual({ kind: 'forbidden', message: DENTAL_CONDITION_FORBIDDEN_MESSAGE });
  });

  it('404', () => {
    expect(dentalConditionError(httpErr(404))).toEqual({ kind: 'not_found', message: DENTAL_CONDITION_NOT_FOUND_MESSAGE });
  });

  it('422 conocido → traducido (sin el sufijo de ArgumentException)', () => {
    const err = httpErr(422, { detail: "Color must be a hex value in the form #RRGGBB. (Parameter 'value')" });
    expect(dentalConditionError(err)).toEqual({
      kind: 'validation', message: 'El color debe tener el formato #RRGGBB (ej: #E53935).',
    });
    expect(dentalConditionError(httpErr(422, { detail: 'Code cannot exceed 50 characters.' })).message)
      .toBe('El código no puede superar los 50 caracteres.');
  });

  it('422 desconocido → genérico', () => {
    const err = httpErr(422, { errors: { $: ['The JSON value could not be converted.'] } });
    expect(dentalConditionError(err)).toEqual({ kind: 'validation', message: DENTAL_CONDITION_VALIDATION_MESSAGE });
  });

  it('0 → sin conexión; no HTTP → fallback', () => {
    expect(dentalConditionError(httpErr(0)).message).toBe('No se pudo conectar con el servidor.');
    expect(dentalConditionError(new Error('x'), 'fallback')).toEqual({ kind: 'other', message: 'fallback' });
  });
});
