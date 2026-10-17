import { HttpErrorResponse } from '@angular/common/http';
import {
  PATIENT_NOT_FOUND_MESSAGE, PRESCRIPTIONS_ACCESS_DENIED_MESSAGE, PRESCRIPTION_CONFLICT_MESSAGE,
  PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE, PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE, PRESCRIPTION_FORBIDDEN_MESSAGE,
  PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE, PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE, PRESCRIPTION_NOT_FOUND_MESSAGE,
  PRESCRIPTION_VALIDATION_MESSAGE, PRESCRIPTION_WINDOW_CLOSED_MESSAGE, prescriptionError,
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

  it('409: ventana de 24 h → window_closed; encuentro no open → conflict', () => {
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.windowClosed), { operation: 'add_item', encounterContext: false }))
      .toEqual({ kind: 'window_closed', message: PRESCRIPTION_WINDOW_CLOSED_MESSAGE });
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.encounterNotOpen('signed')), { operation: 'create_encounter' }))
      .toEqual({ kind: 'conflict', message: PRESCRIPTION_CONFLICT_MESSAGE });
    expect(prescriptionError(error(409, PRESCRIPTION_BACKEND_MESSAGES.itemEncounterNotOpen('voided')), { operation: 'add_item' }))
      .toEqual({ kind: 'conflict', message: PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE });
    // Sin detail reconocible en una receta suelta: solo puede ser la ventana.
    expect(prescriptionError(error(409), { operation: 'add_item', encounterContext: false }).kind).toBe('window_closed');
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
});
