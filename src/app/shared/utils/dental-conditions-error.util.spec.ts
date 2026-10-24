import { HttpErrorResponse } from '@angular/common/http';
import {
  DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE, DENTAL_CONDITION_FORBIDDEN_MESSAGE, DENTAL_CONDITION_GLOBAL_MESSAGE,
  DENTAL_CONDITION_NOT_FOUND_MESSAGE, DENTAL_CONDITION_VALIDATION_MESSAGE, DENTAL_CONDITIONS_LIST_FORBIDDEN_MESSAGE,
  ODONTOGRAM_DISABLED_MESSAGE, SESSION_EXPIRED_MESSAGE, dentalConditionError,
} from './dental-conditions-error.util';
import { moduleDisabledProblem, moduleRequiresTenantUserProblem } from '../../testing/module-problem';

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

  it('401 → unauthorized (lo resuelve authInterceptor)', () => {
    expect(dentalConditionError(httpErr(401))).toEqual({ kind: 'unauthorized', message: SESSION_EXPIRED_MESSAGE });
  });
});

describe('dentalConditionError: 403 del módulo odontogram apagado', () => {
  it('listado con 403 sin body y módulo desconocido o apagado → feature_disabled (mensaje claro)', () => {
    for (const odontogramEnabled of [null, false]) {
      expect(dentalConditionError(httpErr(403), 'x', { operation: 'list', odontogramEnabled }))
        .toEqual({ kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE });
    }
    expect(ODONTOGRAM_DISABLED_MESSAGE).toContain('Odontología no está habilitado');
  });

  it('listado con 403 y módulo prendido → sin acceso (no se culpa al módulo)', () => {
    expect(dentalConditionError(httpErr(403), 'x', { operation: 'list', odontogramEnabled: true }))
      .toEqual({ kind: 'forbidden', message: DENTAL_CONDITIONS_LIST_FORBIDDEN_MESSAGE });
  });

  it('escritura con 403 sin body: módulo apagado → feature_disabled; si no → sin permiso', () => {
    expect(dentalConditionError(httpErr(403), 'x', { operation: 'write', odontogramEnabled: false }).kind)
      .toBe('feature_disabled');
    expect(dentalConditionError(httpErr(403), 'x', { operation: 'write', odontogramEnabled: true }))
      .toEqual({ kind: 'forbidden', message: DENTAL_CONDITION_FORBIDDEN_MESSAGE });
    expect(dentalConditionError(httpErr(403), 'x', { operation: 'write', odontogramEnabled: null }).kind)
      .toBe('forbidden');
  });

  it('403 de global no editable gana aunque el módulo figure apagado', () => {
    const err = httpErr(403, { detail: "Dental condition with id 'abc' is global and cannot be modified." });
    expect(dentalConditionError(err, 'x', { operation: 'write', odontogramEnabled: false }).kind)
      .toBe('global_not_editable');
  });

  it('ProblemDetails real de ModuleDisabledException (code module_disabled) → feature_disabled', () => {
    for (const operation of ['list', 'write'] as const) {
      expect(dentalConditionError(httpErr(403, moduleDisabledProblem()), 'x', { operation, odontogramEnabled: true }))
        .toEqual({ kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE });
    }
  });

  it('403 "solo usuarios activos de un tenant" → forbidden, no módulo apagado', () => {
    const err = httpErr(403, moduleRequiresTenantUserProblem());
    expect(dentalConditionError(err, 'x', { operation: 'list', odontogramEnabled: null }))
      .toEqual({ kind: 'forbidden', message: DENTAL_CONDITIONS_LIST_FORBIDDEN_MESSAGE });
    expect(dentalConditionError(err, 'x', { operation: 'write', odontogramEnabled: null }))
      .toEqual({ kind: 'forbidden', message: DENTAL_CONDITION_FORBIDDEN_MESSAGE });
  });

  it('409 con los textos reales (tenant y global) → duplicate_code', () => {
    for (const detail of [
      "A dental condition with code 'caries' already exists for tenant '3f2a'.",
      "A global dental condition with code 'caries' already exists.",
    ]) {
      expect(dentalConditionError(httpErr(409, { detail }))).toEqual({
        kind: 'duplicate_code', message: DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE,
      });
    }
  });

  it('422 de largos de name / category (DentalCondition) → traducido', () => {
    expect(dentalConditionError(httpErr(422, { detail: "Name cannot exceed 100 characters. (Parameter 'name')" })).message)
      .toBe('El nombre no puede superar los 100 caracteres.');
    expect(dentalConditionError(httpErr(422, { detail: "Category cannot exceed 50 characters. (Parameter 'category')" })).message)
      .toBe('La categoría no puede superar los 50 caracteres.');
  });

  it('ProblemDetails del módulo apagado (respaldo por texto) gana aunque la sesión lo crea prendido', () => {
    const err = httpErr(403, { title: 'Forbidden', detail: "Module 'odontogram' is not enabled for this tenant." });
    expect(dentalConditionError(err, 'x', { operation: 'write', odontogramEnabled: true }))
      .toEqual({ kind: 'feature_disabled', message: ODONTOGRAM_DISABLED_MESSAGE });
  });
});
