import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import type { PrescriptionsRepository } from '../core/services/prescriptions-repository';
import { PagedResult } from '../core/models/paged-result.model';
import {
  CreatePrescriptionDto, CreatePrescriptionItemDto, CreatedPrescription, CreatedPrescriptionItem, PRESCRIPTION_LIMITS,
  PRESCRIPTION_ITEM_SHORT_FIELDS, Prescription, PrescriptionItem, PrescriptionsQuery,
} from '../core/models/prescription.model';
import { Encounter } from '../core/models/encounter.model';
import { injectClinicalBackend } from './mock-clinical-backend';
import { argumentError } from './cie10-mock.catalog';
import { comparePrescriptionsAsc, comparePrescriptionsDesc } from '../feature/prescriptions/prescription-format.util';

// Textos del backend que imita el mock (los mismos que devuelve Polyclinic.Api).
export const PRESCRIPTION_BACKEND_MESSAGES = {
  windowClosed: 'Items can only be added within 24 hours of issuing a standalone prescription.',
  encounterForbidden: (encounterId: string) =>
    `Only the user linked to the encounter's professional can add prescriptions to encounter '${encounterId}'.`,
  itemForbidden: (prescriptionId: string) =>
    `Only the user linked to the prescribing professional can add items to prescription '${prescriptionId}'.`,
  standaloneForbidden: 'Only a user linked to a professional of the tenant can issue prescriptions.',
  encounterNotOpen: (status: string) => `Cannot add prescriptions to an encounter with status '${status}'.`,
  itemEncounterNotOpen: (status: string) => `Cannot add prescription items to an encounter with status '${status}'.`,
  maxItems: `A prescription cannot have more than ${PRESCRIPTION_LIMITS.maxItems} items.`,
  concurrency: 'The resource was modified by another request. Reload and try again.',
  itemNull: (index: number) => `items[${index}] cannot be null.`,
  singleItemNull: 'item cannot be null.',
  requestBodyNullChar: 'Request body cannot contain the null character (U+0000).',
  textNullChar: 'Text values cannot contain the null character (U+0000).',
} as const;

const HOUR = 60 * 60 * 1000;

// Recetas sembradas. Usuario del mock = prof-1 (enc-1 open, enc-2 signed); enc-3 es de prof-2.
// rx-2 es suelta y reciente (dentro de las 24 h, relativo a "ahora"); rx-3 es suelta y vieja.
function seed(): Prescription[] {
  const item = (id: string, prescriptionId: string, medication: string, extra: Partial<PrescriptionItem> = {}): PrescriptionItem => ({
    id, prescription_id: prescriptionId, medication, presentation: null, dose: null, frequency: null, duration: null,
    instructions: null, ...extra,
  });
  return [
    {
      id: 'rx-1', patient_id: 'pat-1', professional_id: 'prof-1', encounter_id: 'enc-1',
      issued_at: '2026-10-10T14:20:00Z', notes: 'Control en 7 días.',
      items: [
        item('rxi-1', 'rx-1', 'Ibuprofeno', {
          presentation: 'Comprimidos 400 mg', dose: '1 comprimido', frequency: 'Cada 8 h', duration: '5 días',
          instructions: 'Tomar con las comidas.',
        }),
        item('rxi-2', 'rx-1', 'Paracetamol', { presentation: 'Comprimidos 500 mg', frequency: 'Cada 6 h si hay dolor' }),
      ],
    },
    {
      id: 'rx-2', patient_id: 'pat-1', professional_id: 'prof-1', encounter_id: null,
      issued_at: new Date(Date.now() - 2 * HOUR).toISOString(), notes: null,
      items: [item('rxi-3', 'rx-2', 'Amoxicilina', { presentation: 'Cápsulas 500 mg', dose: '1 cápsula', frequency: 'Cada 8 h', duration: '7 días' })],
    },
    {
      id: 'rx-3', patient_id: 'pat-1', professional_id: 'prof-1', encounter_id: null,
      issued_at: '2026-09-20T09:00:00Z', notes: 'Receta de continuidad.',
      items: [item('rxi-4', 'rx-3', 'Enalapril', { presentation: 'Comprimidos 10 mg', frequency: 'Cada 12 h' })],
    },
    {
      id: 'rx-4', patient_id: 'pat-1', professional_id: 'prof-2', encounter_id: 'enc-3',
      issued_at: '2026-10-05T09:15:00Z', notes: null,
      items: [item('rxi-5', 'rx-4', 'Diclofenac', { presentation: 'Gel 1 %', instructions: 'Aplicar en zona lumbar.' })],
    },
    {
      id: 'rx-5', patient_id: 'pat-2', professional_id: 'prof-1', encounter_id: 'enc-2',
      issued_at: '2026-10-08T10:50:00Z', notes: null,
      items: [item('rxi-6', 'rx-5', 'Atorvastatina', { presentation: 'Comprimidos 20 mg', frequency: 'Una vez al día' })],
    },
  ];
}

function httpError(status: number, detail: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
}

function clone(p: Prescription): Prescription {
  return { ...p, items: p.items.map(i => ({ ...i })) };
}

// Normaliza un texto opcional como el backend: trim; vacío → null.
function optional(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

// Fase 4 Recetas T4: recetas en memoria para demo y tests (NO providedIn root: se provee a mano con
// { provide: PRESCRIPTIONS_REPOSITORY, useClass: MockPrescriptionsRepository }). Comparte estado con
// MockEncountersRepository a través de MockClinicalBackend (sesión, profesionales, pacientes y
// encounters: la version de un encounter sube con cada receta o ítem asociado). Imita los mensajes
// (en inglés, como el ProblemDetails real) y el ORDEN de validación esperado del backend:
//   listByEncounter: 403 (ni profesional activo ni clinical.void) → 404 encounter → issued_at asc.
//   listByPatient: 403 → 404 paciente → issued_at desc (empate: id asc), PagedResult.
//   createForEncounter: 404 encounter → no es su profesional (403) → inactivo (422) → no open (409)
//     → notes / ítems (422) → alta + version del encounter.
//   createStandalone: 404 paciente → sin profesional vinculado (403) → inactivo (422) → notes / ítems.
//   addItem: 404 receta → no es el usuario del profesional que prescribió (403) → inactivo (422) →
//     con encuentro: no open (409); suelta: pasaron MÁS de 24 h (409; exactamente 24 h se acepta) →
//     ítem (422) → máximo 50 (422) → alta (+ version del encounter si tiene).
//   Las ArgumentException llevan el sufijo " (Parameter 'x')" (argumentError). En el alta, los
//   errores de cada ítem llevan el prefijo "items[i]." y un ítem nulo da "items[i] cannot be null.".
// Sin delays (los tests no necesitan timers falsos).
@Injectable()
export class MockPrescriptionsRepository implements PrescriptionsRepository {
  private readonly backend = injectClinicalBackend();
  private prescriptions: Prescription[] = seed();
  private nextId = 100;

  // Helper para tests/demo: corre issued_at de una receta (ej. para vencer la ventana de 24 h).
  setIssuedAt(prescriptionId: string, issuedAt: string): void {
    this.prescriptions = this.prescriptions.map(p => (p.id === prescriptionId ? { ...p, issued_at: issuedAt } : p));
  }

  listByEncounter(encounterId: string): Observable<Prescription[]> {
    if (!this.backend.canReadClinical()) return httpError(403, 'Forbidden.');
    if (!this.backend.encounter(encounterId)) return httpError(404, `Encounter with id '${encounterId}' was not found.`);
    return of(this.prescriptions.filter(p => p.encounter_id === encounterId).sort(comparePrescriptionsAsc).map(clone));
  }

  listByPatient(patientId: string, query: PrescriptionsQuery): Observable<PagedResult<Prescription>> {
    if (!this.backend.canReadClinical()) return httpError(403, 'Forbidden.');
    if (!this.backend.patientExists(patientId)) return httpError(404, `Patient with id '${patientId}' was not found.`);
    const filtered = this.prescriptions.filter(p => p.patient_id === patientId).sort(comparePrescriptionsDesc);
    const start = (query.page - 1) * query.limit;
    return of({
      items: filtered.slice(start, start + query.limit).map(clone),
      total_count: filtered.length,
      current_page: query.page,
      page_size: query.limit,
      total_pages: Math.ceil(filtered.length / query.limit),
    });
  }

  createForEncounter(encounterId: string, dto: CreatePrescriptionDto): Observable<CreatedPrescription> {
    const encounter = this.backend.encounter(encounterId);
    if (!encounter) return httpError(404, `Encounter with id '${encounterId}' was not found.`);
    const professional = this.backend.professionalById(encounter.professional_id);
    if (!professional?.user_id || professional.user_id !== this.backend.userId) {
      return httpError(403, PRESCRIPTION_BACKEND_MESSAGES.encounterForbidden(encounter.id));
    }
    if (!professional.active) return httpError(422, `Professional with id '${professional.id}' is inactive.`);
    if (encounter.status !== 'open') return httpError(409, PRESCRIPTION_BACKEND_MESSAGES.encounterNotOpen(encounter.status));
    return this.insert(encounter.patient_id, professional.id, encounter, dto);
  }

  createStandalone(patientId: string, dto: CreatePrescriptionDto): Observable<CreatedPrescription> {
    if (!this.backend.patientExists(patientId)) return httpError(404, `Patient with id '${patientId}' was not found.`);
    const linked = this.backend.linkedProfessional();
    if (!linked) return httpError(403, PRESCRIPTION_BACKEND_MESSAGES.standaloneForbidden);
    if (!linked.active) return httpError(422, `Professional with id '${linked.id}' is inactive.`);
    return this.insert(patientId, linked.id, null, dto);
  }

  addItem(prescriptionId: string, dto: CreatePrescriptionItemDto): Observable<CreatedPrescriptionItem> {
    const prescription = this.prescriptions.find(p => p.id === prescriptionId);
    if (!prescription) return httpError(404, `Prescription with id '${prescriptionId}' was not found.`);
    const professional = this.backend.professionalById(prescription.professional_id);
    if (!professional?.user_id || professional.user_id !== this.backend.userId) {
      return httpError(403, PRESCRIPTION_BACKEND_MESSAGES.itemForbidden(prescription.id));
    }
    if (!professional.active) return httpError(422, `Professional with id '${professional.id}' is inactive.`);
    const encounter = prescription.encounter_id ? this.backend.encounter(prescription.encounter_id) : undefined;
    if (encounter && encounter.status !== 'open') {
      return httpError(409, PRESCRIPTION_BACKEND_MESSAGES.itemEncounterNotOpen(encounter.status));
    }
    if (!prescription.encounter_id && Date.now() - Date.parse(prescription.issued_at) > PRESCRIPTION_LIMITS.standaloneItemWindowMs) {
      return httpError(409, PRESCRIPTION_BACKEND_MESSAGES.windowClosed);
    }
    if (dto === null || dto === undefined) return argumentError(PRESCRIPTION_BACKEND_MESSAGES.singleItemNull, 'item');
    const invalid = this.validateItem(dto);
    if (invalid) return invalid;
    if (prescription.items.length >= PRESCRIPTION_LIMITS.maxItems) return httpError(422, PRESCRIPTION_BACKEND_MESSAGES.maxItems);

    const item = this.buildItem(prescription.id, dto);
    this.prescriptions = this.prescriptions.map(p => (p.id === prescription.id ? { ...p, items: [...p.items, item] } : p));
    const encounterVersion = encounter ? this.backend.bumpEncounterVersion(encounter.id) : null;
    return of({ ...item, encounter_version: encounterVersion });
  }

  private insert(
    patientId: string, professionalId: string, encounter: Encounter | null, dto: CreatePrescriptionDto,
  ): Observable<CreatedPrescription> {
    const notes = optional(dto?.notes);
    if (notes && notes.length > PRESCRIPTION_LIMITS.notes) {
      return argumentError(`notes cannot exceed ${PRESCRIPTION_LIMITS.notes} characters.`, 'notes');
    }
    if (notes?.includes('\0')) return argumentError('notes cannot contain the null character (U+0000).', 'notes');
    const items = dto?.items ?? [];
    if (items.length > PRESCRIPTION_LIMITS.maxItems) return httpError(422, PRESCRIPTION_BACKEND_MESSAGES.maxItems);
    for (const [index, item] of items.entries()) {
      if (item === null || item === undefined) return argumentError(PRESCRIPTION_BACKEND_MESSAGES.itemNull(index), 'items');
      const invalid = this.validateItem(item, `items[${index}].`);
      if (invalid) return invalid;
    }
    const id = `rx-${this.nextId++}`;
    const prescription: Prescription = {
      id,
      patient_id: patientId,
      professional_id: professionalId,
      encounter_id: encounter?.id ?? null,
      issued_at: new Date().toISOString(),
      notes,
      items: items.map(i => this.buildItem(id, i)),
    };
    this.prescriptions = [...this.prescriptions, prescription];
    const encounterVersion = encounter ? this.backend.bumpEncounterVersion(encounter.id) : null;
    return of({ ...clone(prescription), encounter_version: encounterVersion });
  }

  // `prefix`: "items[i]." en el alta (el backend nombra así el ítem); vacío al agregar uno suelto.
  private validateItem(dto: CreatePrescriptionItemDto, prefix = ''): Observable<never> | null {
    const medication = (dto?.medication ?? '').trim();
    if (!medication) return argumentError(`${prefix}medication is required.`, `${prefix}medication`);
    const fields: [keyof CreatePrescriptionItemDto, number][] = [
      ['medication', PRESCRIPTION_LIMITS.medication],
      ...PRESCRIPTION_ITEM_SHORT_FIELDS.map(f => [f, PRESCRIPTION_LIMITS[f]] as [keyof CreatePrescriptionItemDto, number]),
      ['instructions', PRESCRIPTION_LIMITS.instructions],
    ];
    for (const [field, max] of fields) {
      const value = optional(dto?.[field]);
      if (value && value.length > max) {
        return argumentError(`${prefix}${field} cannot exceed ${max} characters.`, `${prefix}${field}`);
      }
      if (value?.includes('\0')) {
        return argumentError(`${prefix}${field} cannot contain the null character (U+0000).`, `${prefix}${field}`);
      }
    }
    return null;
  }

  private buildItem(prescriptionId: string, dto: CreatePrescriptionItemDto): PrescriptionItem {
    return {
      id: `rxi-${this.nextId++}`,
      prescription_id: prescriptionId,
      medication: (dto.medication ?? '').trim(),
      presentation: optional(dto.presentation),
      dose: optional(dto.dose),
      frequency: optional(dto.frequency),
      duration: optional(dto.duration),
      instructions: optional(dto.instructions),
    };
  }
}
