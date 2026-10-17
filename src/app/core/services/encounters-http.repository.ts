import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { EncountersApi } from './encounters-api';
import { DiagnosesApi } from './diagnoses-api';
import { ClinicalRecordApi } from './clinical-record-api';
import { PatientsApi } from './patients-api';
import { ProfessionalsApi } from './professionals-api';
import { AuthStore } from './auth-store.service';
import type { EncountersRepository } from './encounters-repository';
import {
  CreateEncounterDto, Encounter, EncounterPartyOption, EncounterSummary, EncountersQuery, SignEncounterDto,
  UpdateEncounterDto,
  VoidEncounterDto,
} from '../models/encounter.model';
import { PagedResult } from '../models/paged-result.model';
import { Patient } from '../models/patient.model';
import { CreateDiagnosisDto, CreatedDiagnosis, DeleteDiagnosisResult, Diagnosis } from '../models/diagnosis.model';

// Tope de /tenants/patients (MaxPageSize del backend) — alcanza para el select del alta.
const PATIENT_OPTIONS_LIMIT = 100;

// Fase 4 T7: implementación real contra el backend (default de ENCOUNTERS_REPOSITORY).
@Injectable({ providedIn: 'root' })
export class HttpEncountersRepository implements EncountersRepository {
  private api = inject(EncountersApi);
  private diagnosesApi = inject(DiagnosesApi);
  private clinicalRecordApi = inject(ClinicalRecordApi);
  private patientsApi = inject(PatientsApi);
  private professionalsApi = inject(ProfessionalsApi);
  private authStore = inject(AuthStore);

  list(query: EncountersQuery): Observable<PagedResult<EncounterSummary>> {
    return this.api.list(query);
  }

  getById(id: string): Observable<Encounter> {
    return this.api.getById(id);
  }

  create(dto: CreateEncounterDto): Observable<Encounter> {
    return this.api.create(dto);
  }

  update(id: string, dto: UpdateEncounterDto): Observable<Encounter> {
    return this.api.update(id, dto);
  }

  sign(id: string, dto: SignEncounterDto): Observable<Encounter> {
    return this.api.sign(id, dto);
  }

  void(id: string, dto: VoidEncounterDto): Observable<Encounter> {
    return this.api.void(id, dto);
  }

  currentUserId(): string | null {
    return this.authStore.user()?.id ?? null;
  }

  currentUserPermissions(): string[] {
    return this.authStore.user()?.permissions ?? [];
  }

  // GET /tenants/patients/:id/clinical-record → id. Todo paciente tiene su record (fase 3 lo crea
  // junto con el paciente); si no aparece, se trata como 404.
  resolveClinicalRecordId(patientId: string): Observable<string> {
    return this.clinicalRecordApi.get(patientId).pipe(
      map(record => {
        if (!record.id) throw new Error('El paciente no tiene historia clínica.');
        return record.id;
      }),
    );
  }

  // GET /tenants/patients?q=&page=1&limit=100 — el backend busca por nombre/documento con `q`.
  listPatients(q?: string): Observable<EncounterPartyOption[]> {
    const term = q?.trim();
    return this.patientsApi.getAll({ page: 1, limit: PATIENT_OPTIONS_LIMIT, q: term || undefined }).pipe(
      map(res => res.items.map(toPatientOption)),
    );
  }

  getPatient(id: string): Observable<EncounterPartyOption> {
    return this.patientsApi.getById(id).pipe(map(toPatientOption));
  }

  listProfessionals(): Observable<(EncounterPartyOption & { active: boolean })[]> {
    return this.professionalsApi.list().pipe(
      map(list => list.map(p => ({
        id: p.id, name: p.full_name, label: p.full_name, user_id: p.user_id, active: p.is_active,
      }))),
    );
  }

  listDiagnoses(encounterId: string): Observable<Diagnosis[]> {
    return this.diagnosesApi.list(encounterId);
  }

  createDiagnosis(encounterId: string, dto: CreateDiagnosisDto): Observable<CreatedDiagnosis> {
    return this.diagnosesApi.create(encounterId, dto);
  }

  deleteDiagnosis(encounterId: string, diagnosisId: string): Observable<DeleteDiagnosisResult> {
    return this.diagnosesApi.delete(encounterId, diagnosisId);
  }
}

function toPatientOption(p: Patient): EncounterPartyOption {
  const name = `${p.first_name} ${p.last_name}`.trim();
  return { id: p.id, name, label: p.document_number ? `${name} — ${p.document_number}` : name };
}
