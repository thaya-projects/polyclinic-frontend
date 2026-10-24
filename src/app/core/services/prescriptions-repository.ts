import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/paged-result.model';
import {
  CreatePrescriptionDto, CreatePrescriptionItemDto, CreatedPrescription, CreatedPrescriptionItem, Prescription,
  PrescriptionsQuery,
} from '../models/prescription.model';
import { PrescriptionsApi } from './prescriptions-api';

// Fase 4 Recetas T4/T5: abstracción de la fuente de datos de recetas (repositorio PROPIO). Las
// pantallas solo conocen este contrato; la UI corre con MockPrescriptionsRepository y en producción
// con PrescriptionsApi (HTTP). Los errores viajan como HttpErrorResponse en ambas implementaciones
// (el mock los fabrica con el mismo status y detail que el backend).
//
// Reglas del backend:
//   leer: profesional activo o clinical.void (si no, 403). Paciente/encuentro/receta de otro tenant → 404.
//   crear en un encuentro: solo el profesional del encuentro (403), activo (422), encuentro open
//     (409). Incrementa la version del encuentro (viaja en encounter_version).
//   crear suelta: cualquier profesional activo del tenant (no profesional 403, inactivo 422).
//   agregar ítem: solo el usuario del profesional que prescribió (403), activo (422). Con encuentro:
//     open (409) y se incrementa su version. Suelta: solo dentro de las 24 h desde issued_at (409).
//   medication obligatorio (≤ 200); presentation/dose/frequency/duration ≤ 200; instructions ≤ 1000;
//   notes ≤ 2000; máximo 50 ítems por receta; sin \0 (422).
//   No hay edición ni borrado.
export interface PrescriptionsRepository {
  // Recetas de un encuentro, issued_at asc, sin paginación.
  listByEncounter(encounterId: string): Observable<Prescription[]>;
  // Todas las recetas del paciente (con y sin encuentro), issued_at desc, paginado.
  listByPatient(patientId: string, query: PrescriptionsQuery): Observable<PagedResult<Prescription>>;
  createForEncounter(encounterId: string, dto: CreatePrescriptionDto): Observable<CreatedPrescription>;
  createStandalone(patientId: string, dto: CreatePrescriptionDto): Observable<CreatedPrescription>;
  addItem(prescriptionId: string, dto: CreatePrescriptionItemDto): Observable<CreatedPrescriptionItem>;
}

// HTTP por defecto. Para demo/tests:
//   providers: [{ provide: PRESCRIPTIONS_REPOSITORY, useClass: MockPrescriptionsRepository }]
//   (src/app/testing/prescriptions-mock.repository.ts; comparte sesión/encounters con
//   MockEncountersRepository a través de MockClinicalBackend).
export const PRESCRIPTIONS_REPOSITORY = new InjectionToken<PrescriptionsRepository>('PRESCRIPTIONS_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(PrescriptionsApi),
});
