import { HttpErrorResponse } from '@angular/common/http';
import {
  PATIENT_NOT_FOUND_MESSAGE, PRESCRIPTIONS_ACCESS_DENIED_MESSAGE, PRESCRIPTION_CONFLICT_MESSAGE,
  PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE, PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE, PRESCRIPTION_FORBIDDEN_MESSAGE,
  PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE, PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE, PRESCRIPTION_NOT_FOUND_MESSAGE,
  PRESCRIPTION_CONCURRENCY_MESSAGE, PRESCRIPTION_VALIDATION_MESSAGE, PRESCRIPTION_WINDOW_CLOSED_MESSAGE, prescriptionError,
  prescriptionErrorField,
} from './prescriptions-error.util';
import { ENCOUNTER_NOT_FOUND_MESSAGE } from './encounters-error.util';
import { PRESCRIPTION_BACKEND_MESSAGES } from '../../testing/prescriptions-mock.repository';

const error = (status: number, detail?: string) => new HttpErrorResponse({ status, error: detail ? { detail } : null });

describe('prescriptionError', () => {
  it('401 → unauthorized (lo resuelve authInterceptor)', () => {
    expect(prescriptionError(error(401)).kind).toBe('unauthorized');
  });

  it('404: distingue paciente, encuentro y receta por el detail', () => {
    expect(prescriptionError(error(404, "Patient with id 'p1' was not found.")))
      .toEqual({ kind: 'patient_not_found', message: PATIENT_NOT_FOUND_MESSAGE });
    expect(prescriptionError(error(404, "Encounter with id 'e1' was not found.")))
      .toEqual({ kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE });
    expect(prescriptionError(error(404, "Prescription with id 'rx-1' was not found.")))
      .toEqual({ kind: 'prescription_not_found', message: PRESCRIPTION_NOT_FOUND_MESSAGE });
    expect(prescriptionError(error(404)).kind).toBe('other');
  });

  it('403: acceso al leer; en escrituras, el detail traducido o el texto de la operación', () => {
    expect(prescriptionError(error(403, 'Forbidden.')).message).toBe(PRESCRIPTIONS_ACCESS_DENIED_MESSAGE);
    expect(prescriptionError(error(403), { operation: 'create_standalone' }).message).toBe(PRESCRIPTION_FORBIDDEN_MESSAGE);
    expect(prescriptionError(error(403), { operation: 'create_encounter' }).message).toBe(PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE);
    expect(prescriptionError(error(403), { operation: 'add_item' }).message).toBe(PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE);
    expect(prescriptionError(error(403, PRESCRIPTION_BACKEND_MESSAGES.encounterForbidden('e1')), { operation: 'create_encounter' }).message)
      .toBe(PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE);
    expect(prescriptionError(error(403, PRESCRIPTION_BACKEND_MESSAGES.itemForbidden('rx-1')), { operation: 'add_item' }).message)
      .toBe(PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE);
    expect(prescriptionError(error(403, PRESCRIPTION_BACKEND_MESSAGES.standaloneForbidden), { operation: 'create_standalone' }).message)
      .toBe(PRESCRIPTION_FORBIDDEN_MESSAGE);
  });

  it('409: ventana de 24 h → window_closed; encuentro no open → conflict (solo por el detail)', () => {
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.windowClosed), { operation: 'add_item' }))
      .toEqual({ kind: 'window_closed', message: PRESCRIPTION_WINDOW_CLOSED_MESSAGE });
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.encounterNotOpen('signed')), { operation: 'create_encounter' }))
      .toEqual({ kind: 'conflict', message: PRESCRIPTION_CONFLICT_MESSAGE });
    expect(prescriptionError(error(409, "Cannot add prescriptions to an encounter with status 'voided'."), { operation: 'create_encounter' }).kind)
      .toBe('conflict');
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.itemEncounterNotOpen('voided')), { operation: 'add_item' }))
      .toEqual({ kind: 'conflict', message: PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE });
    expect(prescriptionError(error(409, "Cannot add prescription items to an encounter with status 'signed'."), { operation: 'add_item' }).kind)
      .toBe('conflict');
  });

  it('409 de concurrencia, índice único, inmutabilidad o sin detail → concurrency (no bloquea, no habla del encuentro)', () => {
    const concurrency = { kind: 'concurrency', message: PRESCRIPTION_CONCURRENCY_MESSAGE };
    const details = [
      'The resource was modified by another request. Reload and try again.',
      "Unique constraint 'IX_prescription_items_prescription_id_position' on table 'prescription_items' was violated.",
      'Prescriptions are immutable once issued.',
      undefined,
    ];
    for (const operation of ['create_encounter', 'create_standalone', 'add_item'] as const) {
      for (const detail of details) expect(prescriptionError(error(409, detail), { operation })).toEqual(concurrency);
    }
    // Una receta suelta no tiene encuentro: ni siquiera un texto de estado se trata como conflict.
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.encounterNotOpen('signed')), { operation: 'create_standalone' }))
      .toEqual(concurrency);
    expect(PRESCRIPTION_CONCURRENCY_MESSAGE).not.toMatch(/encuentro/i);
  });

  it('422: mensajes en español (sin el sufijo "(Parameter \'x\')"); desconocido → genérico', () => {
    const t = (detail: string) => prescriptionError(error(422, detail)).message;
    expect(t("medication is required. (Parameter 'medication')")).toBe('Ingresá el medicamento.');
    expect(t("items[1].medication is required. (Parameter 'items[1].medication')")).toBe('Ingresá el medicamento 2.');
    expect(t("medication cannot exceed 200 characters. (Parameter 'medication')"))
      .toBe('El campo medicamento no puede superar los 200 caracteres.');
    expect(t("instructions cannot exceed 1000 characters. (Parameter 'instructions')"))
      .toBe('El campo indicaciones no puede superar los 1000 caracteres.');
    expect(t("notes cannot exceed 2000 characters. (Parameter 'notes')")).toBe('El campo notas no puede superar los 2000 caracteres.');
    expect(t("dose cannot contain the null character (U+0000). (Parameter 'dose')")).toBe('El campo dosis contiene un carácter inválido.');
    expect(t(PRESCRIPTION_BACKEND_MESSAGES.maxItems)).toBe('Una receta puede tener como máximo 50 medicamentos.');
    expect(t("Professional with id 'prof-1' is inactive.")).toBe(PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE);
    expect(t('Something unexpected happened.')).toBe(PRESCRIPTION_VALIDATION_MESSAGE);
  });

  it('422: ítems nulos y carácter nulo en el body o en los textos (con/sin items[i]. y "(Parameter \'x\')")', () => {
    const t = (detail: string) => prescriptionError(error(422, detail), { operation: 'create_encounter' }).message;
    expect(t('items[2] cannot be null.')).toBe('Faltan los datos del medicamento 3.');
    expect(t("items[0] cannot be null. (Parameter 'items')")).toBe('Faltan los datos del medicamento 1.');
    expect(t('item cannot be null.')).toBe('Faltan los datos del medicamento.');
    expect(t("item cannot be null. (Parameter 'item')")).toBe('Faltan los datos del medicamento.');
    expect(t('Request body cannot contain the null character (U+0000).'))
      .toBe('La receta contiene un carácter inválido. Revisá los textos e intentá de nuevo.');
    expect(t("Request body cannot contain the null character (U+0000). (Parameter 'body')"))
      .toBe('La receta contiene un carácter inválido. Revisá los textos e intentá de nuevo.');
    expect(t('Text values cannot contain the null character (U+0000).')).toBe('Un texto de la receta contiene un carácter inválido.');
    expect(t("items[1].Text values cannot contain the null character (U+0000). (Parameter 'items[1]')"))
      .toBe('Un texto del medicamento 2 contiene un carácter inválido.');
    expect(t("items[0].medication cannot contain the null character (U+0000). (Parameter 'items[0].medication')"))
      .toBe('El campo medicamento (medicamento 1) contiene un carácter inválido.');
    expect(t("items[3].duration cannot exceed 200 characters. (Parameter 'items[3].duration')"))
      .toBe('El campo duración (medicamento 4) no puede superar los 200 caracteres.');
    // Ninguno se muestra en inglés.
    for (const raw of [PRESCRIPTION_BACKEND_MESSAGES.itemNull(0), PRESCRIPTION_BACKEND_MESSAGES.singleItemNull,
      PRESCRIPTION_BACKEND_MESSAGES.requestBodyNullChar, PRESCRIPTION_BACKEND_MESSAGES.textNullChar]) {
      expect(t(raw)).not.toBe(PRESCRIPTION_VALIDATION_MESSAGE);
    }
  });
});

describe('prescriptionErrorField', () => {
  it('campo e índice del medicamento desde el detail', () => {
    expect(prescriptionErrorField(error(422, "items[2].medication is required. (Parameter 'medication')")))
      .toEqual({ index: 2, field: 'medication' });
    expect(prescriptionErrorField(error(422, 'notes cannot exceed 2000 characters.'))).toEqual({ index: null, field: 'notes' });
    expect(prescriptionErrorField(error(422, 'A prescription cannot have more than 50 items.'))).toBeNull();
    expect(prescriptionErrorField(error(409, 'medication is required.'))).toBeNull();
  });
});
