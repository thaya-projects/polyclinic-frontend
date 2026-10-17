import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import type { OdontogramRepository } from '../core/services/odontogram-repository';
import {
  CreateOdontogramDto, Dentition, Odontogram, OdontogramPatientOption,
} from '../core/models/odontogram.model';
import { argumentError } from './cie10-mock.catalog';

export const MOCK_ODONTOGRAM_PATIENTS: OdontogramPatientOption[] = [
  { id: 'pat-1', name: 'Ana Gómez', label: 'Ana Gómez — 30111222' },
  { id: 'pat-2', name: 'Luis Pérez', label: 'Luis Pérez — 28444555' },
  { id: 'pat-3', name: 'Sofía Ruiz', label: 'Sofía Ruiz — 50999888' },
];

// pat-1: current permanente + un snapshot histórico; pat-2: sin odontograma; pat-3: current mixta.
function seed(): Odontogram[] {
  const odontogram = (
    id: string, patientId: string, dentition: Dentition, isCurrent: boolean, date: string,
  ): Odontogram => ({
    id, clinical_record_id: `cr-${patientId}`, patient_id: patientId, encounter_id: null, dentition,
    is_current: isCurrent, snapshot_date: date,
  });
  return [
    odontogram('odo-1', 'pat-1', 'permanente', false, '2025-09-01T13:00:00Z'),
    odontogram('odo-2', 'pat-1', 'permanente', true, '2026-03-10T14:30:00Z'),
    odontogram('odo-3', 'pat-3', 'mixta', true, '2026-05-20T10:00:00Z'),
  ];
}

const DENTITIONS: readonly Dentition[] = ['permanente', 'temporal', 'mixta'];

function httpError(status: number, detail: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
}

// Fase 6 T5: odontogramas en memoria para demo/tests (NO providedIn root). Imita a OdontogramService:
//   getCurrent: paciente inexistente → 404 Patient; sin current → 404 "has no current odontogram".
//   getById: inexistente → 404.
//   create: 404 patient → 422 clinical_record_id faltante → 404 clinical record → 422 de otro
//           paciente → dentition inválida 422 → desplaza el current (is_current = false) y crea el
//           nuevo current con snapshot_date = ahora. dentition ausente = permanente.
//   Módulo "odontogram" apagado (setOdontogramEnabled(false)): toda llamada → 403 sin body, como
//   OdontogramFeatureGuardMiddleware.
//   simulateCurrentConflict(): el próximo create → 409 (otro request ganó la carrera del current).
// Sin delays (los tests no necesitan timers falsos).
@Injectable()
export class MockOdontogramRepository implements OdontogramRepository {
  private odontograms: Odontogram[] = seed();
  private nextId = 100;
  private moduleEnabled = true;
  private conflictNext = false;

  // Helper para tests/demo: prende o apaga el módulo "odontogram" del tenant.
  setOdontogramEnabled(enabled: boolean): void {
    this.moduleEnabled = enabled;
  }

  simulateCurrentConflict(): void {
    this.conflictNext = true;
  }

  odontogramEnabled(): boolean | null {
    return this.moduleEnabled;
  }

  getCurrent(patientId: string): Observable<Odontogram> {
    if (!this.moduleEnabled) return moduleDisabled();
    if (!this.patientExists(patientId)) return patientNotFound(patientId);
    const current = this.odontograms.find(o => o.patient_id === patientId && o.is_current);
    return current ? of({ ...current }) : httpError(404, `Patient '${patientId}' has no current odontogram.`);
  }

  getById(id: string): Observable<Odontogram> {
    if (!this.moduleEnabled) return moduleDisabled();
    const found = this.odontograms.find(o => o.id === id);
    return found ? of({ ...found }) : httpError(404, `Odontogram with id '${id}' was not found.`);
  }

  create(patientId: string, dto: CreateOdontogramDto): Observable<Odontogram> {
    if (!this.moduleEnabled) return moduleDisabled();
    if (!this.patientExists(patientId)) return patientNotFound(patientId);
    const recordId = dto.clinical_record_id;
    if (!recordId) return argumentError('clinical_record_id is required.', 'clinical_record_id');
    const recordPatient = recordId.startsWith('cr-') ? recordId.slice(3) : null;
    if (!recordPatient || !this.patientExists(recordPatient)) {
      return httpError(404, `ClinicalRecord with id '${recordId}' was not found.`);
    }
    if (recordPatient !== patientId) {
      return httpError(422, `Clinical record '${recordId}' does not belong to patient '${patientId}'.`);
    }
    const dentition = dto.dentition ?? 'permanente';
    if (!DENTITIONS.includes(dentition)) {
      return argumentError('dentition must be one of: permanente, temporal, mixta.', 'dentition');
    }
    if (this.conflictNext) {
      this.conflictNext = false;
      return httpError(409,
        `Another odontogram became current for patient '${patientId}' concurrently. Reload and try again.`);
    }

    const created: Odontogram = {
      id: `odo-${this.nextId++}`, clinical_record_id: recordId, patient_id: patientId,
      encounter_id: dto.encounter_id ?? null, dentition, is_current: true, snapshot_date: new Date().toISOString(),
    };
    this.odontograms = [
      ...this.odontograms.map(o => (o.patient_id === patientId && o.is_current ? { ...o, is_current: false } : o)),
      created,
    ];
    return of({ ...created });
  }

  resolveClinicalRecordId(patientId: string): Observable<string> {
    return this.patientExists(patientId) ? of(`cr-${patientId}`) : patientNotFound(patientId);
  }

  getPatient(id: string): Observable<OdontogramPatientOption> {
    const found = MOCK_ODONTOGRAM_PATIENTS.find(p => p.id === id);
    return found ? of({ ...found }) : patientNotFound(id);
  }

  listPatients(q?: string): Observable<OdontogramPatientOption[]> {
    const term = q?.trim().toLowerCase();
    return of(term ? MOCK_ODONTOGRAM_PATIENTS.filter(p => p.label.toLowerCase().includes(term)) : MOCK_ODONTOGRAM_PATIENTS);
  }

  private patientExists(id: string): boolean {
    return MOCK_ODONTOGRAM_PATIENTS.some(p => p.id === id);
  }
}

function patientNotFound(id: string): Observable<never> {
  return httpError(404, `Patient with id '${id}' was not found.`);
}

// El middleware corta antes de ExceptionHandlingMiddleware: 403 sin ProblemDetails.
function moduleDisabled(): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 403, error: null }));
}
