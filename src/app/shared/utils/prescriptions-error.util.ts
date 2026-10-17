import { HttpErrorResponse } from '@angular/common/http';
import {
  ENCOUNTER_NOT_FOUND_MESSAGE, EncounterErrorKind, KnownMessage, backendMessages, encounterError, normalizeBackendMessage,
  translateEncounterBackendMessage,
} from './encounters-error.util';
import { PATIENT_NOT_FOUND_MESSAGE } from './measurements-error.util';
import { PRESCRIPTION_LIMITS } from '../../core/models/prescription.model';

// Fase 4 Recetas T5: errores de /tenants/encounters/:id/prescriptions,
// /tenants/patients/:id/prescriptions y /tenants/prescriptions/:id/items. `kind` decide qué hace la
// pantalla; un mismo status con causas distintas se separa por el detail:
//   404 "Patient with id …" → 'patient_not_found'; "Encounter with id …" → 'not_found';
//       "Prescription with id …" → 'prescription_not_found'; otro → genérico.
//   409 se clasifica SOLO por el detail:
//       "Cannot add prescriptions|prescription items to an encounter with status '…'" → 'conflict'
//         (encuentro firmado/anulado: la receta se bloquea y el detalle recarga el encuentro);
//       "Items can only be added within 24 hours …" → 'window_closed' (se bloquea esa receta);
//       cualquier otro 409, o sin detail (concurrencia optimista, choque de índice único,
//       inmutabilidad u otro texto propio del backend) → 'concurrency': aviso para reintentar, SIN
//       bloquear nada; se recargan los datos (encuentro → versión nueva; paciente → la lista).
//   403 → texto propio en español según la operación; 422 → mensaje del backend traducido o genérico.
//   401 → 'unauthorized' (lo resuelve authInterceptor: la pantalla no muestra nada).
export type PrescriptionErrorKind =
  EncounterErrorKind | 'patient_not_found' | 'prescription_not_found' | 'window_closed' | 'concurrency';

export interface PrescriptionError {
  kind: PrescriptionErrorKind;
  message: string;
}

// Qué operación falló (cambia el texto del 403 y del 409).
export type PrescriptionOperation = 'read' | 'create_encounter' | 'create_standalone' | 'add_item';

export { PATIENT_NOT_FOUND_MESSAGE };
export const PRESCRIPTIONS_ACCESS_DENIED_MESSAGE = 'Solo los profesionales pueden ver las recetas.';
export const PRESCRIPTIONS_LOAD_ERROR_MESSAGE = 'No se pudieron cargar las recetas.';
export const PRESCRIPTION_NOT_FOUND_MESSAGE = 'La receta ya no existe. Se actualizó la lista.';
export const PRESCRIPTION_RESOURCE_NOT_FOUND_MESSAGE = 'No se encontró el recurso solicitado.';
export const PRESCRIPTION_FORBIDDEN_MESSAGE = 'Solo los profesionales activos pueden emitir recetas.';
export const PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE = 'Solo el profesional del encuentro puede emitir recetas en él.';
export const PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE =
  'Solo el profesional que emitió la receta puede agregarle medicamentos.';
export const PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE =
  'Tu profesional está desactivado: no podés emitir recetas ni agregar medicamentos.';
export const PRESCRIPTION_CONFLICT_MESSAGE =
  'El encuentro ya fue firmado o anulado: no se pueden emitir recetas ni agregar medicamentos en él. Se recargaron los datos.';
export const PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE =
  'El encuentro de esta receta ya fue firmado o anulado: no admite más medicamentos.';
export const PRESCRIPTION_WINDOW_CLOSED_MESSAGE =
  'Pasaron más de 24 h desde la emisión de esta receta suelta: ya no se le pueden agregar medicamentos.';
// Pista del cliente (no bloquea): según el reloj local la ventana venció, pero decide el backend.
export const PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE =
  'Probablemente ya pasaron 24 h desde la emisión de esta receta suelta: el sistema podría rechazar medicamentos nuevos.';
// 409 que no es de estado ni de la ventana (concurrencia, choque de índice único, inmutabilidad…).
export const PRESCRIPTION_CONCURRENCY_MESSAGE = 'Otro cambio se guardó al mismo tiempo. Reintentá.';
export const PRESCRIPTION_MAX_ITEMS_MESSAGE =
  `Una receta puede tener como máximo ${PRESCRIPTION_LIMITS.maxItems} medicamentos.`;
export const PRESCRIPTION_VALIDATION_MESSAGE =
  'Revisá la receta: el medicamento es obligatorio y cada campo tiene un largo máximo.';
export const PRESCRIPTION_MEDICATION_REQUIRED_MESSAGE = 'Ingresá el medicamento.';

const FIELD_LABEL: Record<string, string> = {
  medication: 'medicamento',
  presentation: 'presentación',
  dose: 'dosis',
  frequency: 'frecuencia',
  duration: 'duración',
  instructions: 'indicaciones',
  notes: 'notas',
  items: 'medicamentos',
};

// Prefijo opcional de un ítem del alta ("items[2].medication").
const ITEM_PREFIX = "(?:items\\[(\\d+)\\]\\.)?";

function fieldText(field: string, index: string | undefined): string {
  const label = FIELD_LABEL[field] ?? field;
  return index !== undefined ? `${label} (medicamento ${Number(index) + 1})` : label;
}

// 409 de la ventana de 24 h y del encuentro no open (textos del backend).
const WINDOW_CLOSED_DETAIL = /^Items can only be added within 24 hours of issuing a standalone prescription\.?$/i;
const ENCOUNTER_NOT_OPEN_DETAIL = /^Cannot add (?:prescriptions|prescription items) to an encounter with status '(\w+)'\.?$/i;

// Mensajes del backend → español (el sufijo "(Parameter 'x')" lo quita normalizeBackendMessage).
// Lo que no matchea cae en los genéricos de encounters y, si tampoco, en
// PRESCRIPTION_VALIDATION_MESSAGE: nunca se muestra el texto crudo en inglés.
export const PRESCRIPTION_MESSAGES: KnownMessage[] = [
  { pattern: WINDOW_CLOSED_DETAIL, translate: () => PRESCRIPTION_WINDOW_CLOSED_MESSAGE },
  // Ítem nulo en el alta ("items[2] cannot be null.") o al agregar ("item cannot be null.").
  { pattern: /^items\[(\d+)\] cannot be null\.?$/i,
    translate: m => `Faltan los datos del medicamento ${Number(m[1]) + 1}.` },
  { pattern: new RegExp(`^${ITEM_PREFIX}item cannot be null\\.?$`, 'i'),
    translate: m => (m[1] !== undefined ? `Faltan los datos del medicamento ${Number(m[1]) + 1}.` : 'Faltan los datos del medicamento.') },
  // NullCharacterGuard sobre el body completo o sobre los textos (con o sin el prefijo items[n].).
  { pattern: new RegExp(`^${ITEM_PREFIX}Request body cannot contain the null character.*$`, 'i'),
    translate: () => 'La receta contiene un carácter inválido. Revisá los textos e intentá de nuevo.' },
  { pattern: new RegExp(`^${ITEM_PREFIX}Text values cannot contain the null character.*$`, 'i'),
    translate: m => (m[1] !== undefined
      ? `Un texto del medicamento ${Number(m[1]) + 1} contiene un carácter inválido.`
      : 'Un texto de la receta contiene un carácter inválido.') },
  // Máximo de ítems por receta.
  { pattern: /^A prescription cannot have more than (\d+) items\.?$/i,
    translate: m => `Una receta puede tener como máximo ${m[1]} medicamentos.` },
  // 403 en el encuentro / al agregar ítem / receta suelta sin profesional.
  { pattern: /^Only the user linked to the encounter's professional can add (?:prescriptions|prescription items) to encounter '.*'\.?$/i,
    translate: () => PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE },
  { pattern: /^Only the user linked to the prescribing professional can add items to prescription '.*'\.?$/i,
    translate: () => PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE },
  { pattern: /^Only a user linked to (?:an active|a) professional of the tenant can (?:issue|create) prescriptions\.?$/i,
    translate: () => PRESCRIPTION_FORBIDDEN_MESSAGE },
  { pattern: /^Professional with id '.*' is inactive\.?$/i, translate: () => PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE },
  // 409 del encuentro no open.
  { pattern: ENCOUNTER_NOT_OPEN_DETAIL, translate: () => PRESCRIPTION_CONFLICT_MESSAGE },
  // NullCharacterGuard, largos y obligatorios (con o sin el prefijo items[n].).
  { pattern: new RegExp(`^${ITEM_PREFIX}(\\w+) cannot contain the null character.*$`, 'i'),
    translate: m => `El campo ${fieldText(m[2], m[1])} contiene un carácter inválido.` },
  { pattern: new RegExp(`^${ITEM_PREFIX}(\\w+) cannot exceed (\\d+) characters\\.?$`, 'i'),
    translate: m => `El campo ${fieldText(m[2], m[1])} no puede superar los ${m[3]} caracteres.` },
  { pattern: new RegExp(`^${ITEM_PREFIX}medication is required\\.?$`, 'i'),
    translate: m => (m[1] !== undefined
      ? `Ingresá el medicamento ${Number(m[1]) + 1}.`
      : PRESCRIPTION_MEDICATION_REQUIRED_MESSAGE) },
  { pattern: new RegExp(`^${ITEM_PREFIX}(\\w+) is required\\.?$`, 'i'),
    translate: m => `Falta un dato obligatorio: ${fieldText(m[2], m[1])}.` },
];

export function translatePrescriptionBackendMessage(message: string): string | null {
  return translateEncounterBackendMessage(message, PRESCRIPTION_MESSAGES);
}

function translated(err: HttpErrorResponse): string | null {
  const raw = backendMessages(err);
  if (raw.length === 0) return null;
  const list = raw.map(m => translatePrescriptionBackendMessage(m));
  return list.every((t): t is string => t !== null) ? list.join(' ') : null;
}

function detail(err: HttpErrorResponse): string {
  return normalizeBackendMessage(backendMessages(err)[0] ?? '');
}

const FORBIDDEN_BY_OPERATION: Record<PrescriptionOperation, string> = {
  read: PRESCRIPTIONS_ACCESS_DENIED_MESSAGE,
  create_encounter: PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE,
  create_standalone: PRESCRIPTION_FORBIDDEN_MESSAGE,
  add_item: PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE,
};

export interface PrescriptionErrorOptions {
  fallback?: string;
  operation?: PrescriptionOperation;
}

export function prescriptionError(err: unknown, options: PrescriptionErrorOptions = {}): PrescriptionError {
  const { fallback = 'No se pudo completar la operación.', operation = 'read' } = options;
  if (!(err instanceof HttpErrorResponse)) return { kind: 'other', message: fallback };
  switch (err.status) {
    case 403:
      // Al leer, el aviso es siempre el de acceso; en las escrituras, el detail traducido si se reconoce.
      return {
        kind: 'forbidden',
        message: operation === 'read' ? FORBIDDEN_BY_OPERATION.read : translated(err) ?? FORBIDDEN_BY_OPERATION[operation],
      };
    case 404: {
      const text = detail(err);
      if (/^Patient with id /i.test(text)) return { kind: 'patient_not_found', message: PATIENT_NOT_FOUND_MESSAGE };
      if (/^Encounter with id /i.test(text)) return { kind: 'not_found', message: ENCOUNTER_NOT_FOUND_MESSAGE };
      if (/^Prescription with id /i.test(text)) {
        return { kind: 'prescription_not_found', message: PRESCRIPTION_NOT_FOUND_MESSAGE };
      }
      return { kind: 'other', message: PRESCRIPTION_RESOURCE_NOT_FOUND_MESSAGE };
    }
    case 409: {
      const text = detail(err);
      if (WINDOW_CLOSED_DETAIL.test(text)) return { kind: 'window_closed', message: PRESCRIPTION_WINDOW_CLOSED_MESSAGE };
      // Una receta suelta no tiene encuentro: ahí nunca aplica el 409 de estado.
      if (ENCOUNTER_NOT_OPEN_DETAIL.test(text) && operation !== 'create_standalone') {
        return {
          kind: 'conflict',
          message: operation === 'add_item' ? PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE : PRESCRIPTION_CONFLICT_MESSAGE,
        };
      }
      return { kind: 'concurrency', message: PRESCRIPTION_CONCURRENCY_MESSAGE };
    }
    case 422: return { kind: 'validation', message: translated(err) ?? PRESCRIPTION_VALIDATION_MESSAGE };
    default: return encounterError(err, fallback);
  }
}
