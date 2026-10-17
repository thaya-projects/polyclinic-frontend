import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import type { EncountersRepository } from '../core/services/encounters-repository';
import {
  CLINICAL_VOID_PERMISSION, CreateEncounterDto, Encounter, EncounterPartyOption, EncounterSummary, EncountersQuery,
  ENCOUNTER_LIMITS, SignEncounterDto, UpdateEncounterDto, VoidEncounterDto,
} from '../core/models/encounter.model';
import { PagedResult } from '../core/models/paged-result.model';
import {
  CreateDiagnosisDto, CreatedDiagnosis, DIAGNOSIS_LIMITS, DeleteDiagnosisResult, Diagnosis,
} from '../core/models/diagnosis.model';
import { CIE10_CODE_FORMAT, CIE10_CODE_MAX_LENGTH, MOCK_CIE10, argumentError } from './cie10-mock.catalog';
import { MOCK_PATIENTS, ProfessionalOption, injectClinicalBackend } from './mock-clinical-backend';

// Sesión, profesionales, pacientes y encounters viven en MockClinicalBackend (compartido con
// MockMeasurementsRepository); acá se re-exporta lo que ya usaban los tests.
export { MOCK_CURRENT_USER_ID } from './mock-clinical-backend';

function httpError(status: number, detail: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
}

function seedDiagnoses(): Diagnosis[] {
  return [
    {
      id: 'dx-1', encounter_id: 'enc-1', cie10_code: 'R51', description: 'Cefalea', is_definitive: false,
      created_at: '2026-10-10T14:20:00Z',
    },
    {
      id: 'dx-2', encounter_id: 'enc-2', cie10_code: 'Z00.0', description: 'Examen médico general', is_definitive: true,
      created_at: '2026-10-08T10:50:00Z',
    },
    {
      id: 'dx-3', encounter_id: 'enc-2', cie10_code: null, description: 'Sobrepeso leve, control en 6 meses',
      is_definitive: true, created_at: '2026-10-08T10:55:00Z',
    },
  ];
}

// Diagnosis.AddOperation / RemoveOperation del backend (completan los mensajes de 403/409).
const ADD_DIAGNOSES = 'add diagnoses to';
const REMOVE_DIAGNOSES = 'remove diagnoses from';

const MOCK_SPECIALTIES: { id: string; active: boolean }[] = [
  { id: 'spec-1', active: true },
  { id: 'spec-2', active: false },
];

// Fase 4 T6: fuente de datos en memoria para demo y tests (NO providedIn root: se provee a mano
// con { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository }). Imita al backend,
// mensajes incluidos (en inglés, como el ProblemDetails real), y su ORDEN de validación:
//   lecturas (list/getById): 403 si el usuario no es profesional activo ni tiene clinical.void.
//     list devuelve el RESUMEN (sin anamnesis/exam/clinical_data).
//   create: ids requeridos (422) → paciente/historia/profesional/especialidad (404; especialidad
//           inactiva 422) → usuario ≠ profesional (403) → profesional inactivo (422) → historia de otro
//           paciente (422) → largos (422)
//   update/sign: 404 → 403 → inactivo (422) → version requerida (422) → version vieja (409) → estado
//                (409) (update además: clinical_data null / largos → 422)
//   diagnósticos (DiagnosisService): list 403 (misma regla que las lecturas) → 404;
//     create: 404 → 403 → inactivo (422) → no open (409) → formato de código (422) → código fuera
//             del catálogo (422) → description (422) → código repetido en el encounter (409);
//     delete: 404 encounter → 403 → inactivo (422) → 404 diagnosis → no open (409).
//     Alta y baja incrementan la version del encounter y la devuelven en encounter_version.
//   El catálogo CIE-10 es MockCie10Catalog (cie10-mock.catalog.ts).
// Las ArgumentException del backend llevan el sufijo " (Parameter 'x')" en el detail (argumentError).
//   void: 404 → autorización (con clinical.void se saltea: anulación administrativa de cualquier
//         profesional, incluso inactivo o sin user; si no, 403 → inactivo 422) → reason (422) →
//         version requerida (422) → version vieja (409) → ya anulado (409)
// Cada escritura OK incrementa version. Sin delays (los tests no necesitan timers falsos).
@Injectable()
export class MockEncountersRepository implements EncountersRepository {
  private backend = injectClinicalBackend();
  private diagnoses: Diagnosis[] = seedDiagnoses();
  private nextId = 100;

  // Estado del "backend" compartido (ver MockClinicalBackend).
  private get encounters(): Encounter[] { return this.backend.encounters; }
  private set encounters(value: Encounter[]) { this.backend.encounters = value; }
  private get professionals(): ProfessionalOption[] { return this.backend.professionals; }
  private set professionals(value: ProfessionalOption[]) { this.backend.professionals = value; }
  private get userId(): string | null { return this.backend.userId; }
  private set userId(value: string | null) { this.backend.userId = value; }
  private get permissions(): string[] { return this.backend.permissions; }
  private set permissions(value: string[]) { this.backend.permissions = value; }

  // Helpers para tests/demo: identidad y permisos de la "sesión".
  setCurrentUser(userId: string | null, permissions: string[] = []): void {
    this.userId = userId;
    this.permissions = [...permissions];
  }

  // Helper para tests/demo: desactiva o reactiva un profesional.
  setProfessionalActive(professionalId: string, active: boolean): void {
    this.professionals = this.professionals.map(p => (p.id === professionalId ? { ...p, active } : p));
  }

  currentUserId(): string | null {
    return this.userId;
  }

  currentUserPermissions(): string[] {
    return [...this.permissions];
  }

  list(query: EncountersQuery): Observable<PagedResult<EncounterSummary>> {
    if (!this.canRead()) return httpError(403, 'Forbidden.');
    const filtered = this.encounters
      .filter(e => !query.patient_id || e.patient_id === query.patient_id)
      .filter(e => !query.professional_id || e.professional_id === query.professional_id)
      .filter(e => !query.status || e.status === query.status)
      .sort((a, b) => b.encounter_date.localeCompare(a.encounter_date));
    const start = (query.page - 1) * query.limit;
    return of({
      items: filtered.slice(start, start + query.limit).map(toSummary),
      total_count: filtered.length,
      current_page: query.page,
      page_size: query.limit,
      total_pages: Math.ceil(filtered.length / query.limit),
    });
  }

  getById(id: string): Observable<Encounter> {
    if (!this.canRead()) return httpError(403, 'Forbidden.');
    const found = this.find(id);
    return found ? of({ ...found }) : httpError(404, `Encounter with id '${id}' was not found.`);
  }

  create(dto: CreateEncounterDto): Observable<Encounter> {
    for (const field of ['patient_id', 'clinical_record_id', 'professional_id'] as const) {
      if (!dto[field]) return argumentError(`${field} is required.`, field);
    }
    if (!MOCK_PATIENTS.some(p => p.id === dto.patient_id)) {
      return httpError(404, `Patient with id '${dto.patient_id}' was not found.`);
    }
    const recordPatient = this.patientOfClinicalRecord(dto.clinical_record_id);
    if (!recordPatient) return httpError(404, `ClinicalRecord with id '${dto.clinical_record_id}' was not found.`);
    const professional = this.professionals.find(p => p.id === dto.professional_id);
    if (!professional) return httpError(404, `Professional with id '${dto.professional_id}' was not found.`);
    if (dto.specialty_id) {
      const specialty = MOCK_SPECIALTIES.find(sp => sp.id === dto.specialty_id);
      if (!specialty) return httpError(404, `Specialty with id '${dto.specialty_id}' was not found.`);
      if (!specialty.active) {
        return httpError(422, `The following specialties are inactive and cannot be assigned: ${dto.specialty_id}.`);
      }
    }
    const guard = this.guardProfessional(professional, 'create', null);
    if (guard) return guard;
    if (recordPatient !== dto.patient_id) {
      return httpError(422, `Clinical record '${dto.clinical_record_id}' does not belong to patient '${dto.patient_id}'.`);
    }
    const invalid = this.validateNote(dto);
    if (invalid) return invalid;

    const now = new Date().toISOString();
    const encounter: Encounter = {
      id: `enc-${this.nextId++}`,
      clinical_record_id: dto.clinical_record_id,
      patient_id: dto.patient_id,
      professional_id: dto.professional_id,
      appointment_id: dto.appointment_id ?? null,
      specialty_id: dto.specialty_id ?? null,
      form_template_id: dto.form_template_id ?? null,
      encounter_date: dto.encounter_date ?? now,
      chief_complaint: dto.chief_complaint ?? null,
      anamnesis: dto.anamnesis ?? null,
      exam: dto.exam ?? null,
      clinical_data: dto.clinical_data ?? {},
      status: 'open',
      signed_at: null, signed_by: null, voided_at: null, voided_by: null, void_reason: null,
      created_at: now,
      version: 1,
    };
    this.encounters = [encounter, ...this.encounters];
    return of({ ...encounter });
  }

  update(id: string, dto: UpdateEncounterDto): Observable<Encounter> {
    const found = this.find(id);
    if (!found) return httpError(404, `Encounter with id '${id}' was not found.`);
    const guard = this.authorizeChange(found, 'update')
      ?? this.checkVersion(found, dto?.version) ?? this.ensureOpen(found, 'update');
    if (guard) return guard;
    if ('clinical_data' in dto && dto.clinical_data === null) return argumentError('clinical_data cannot be null.', 'clinical_data');
    const invalid = this.validateNote(dto);
    if (invalid) return invalid;
    const { version: _version, ...fields } = dto;
    return of(this.replace({ ...found, ...fields, version: found.version + 1 }));
  }

  sign(id: string, dto: SignEncounterDto): Observable<Encounter> {
    const found = this.find(id);
    if (!found) return httpError(404, `Encounter with id '${id}' was not found.`);
    const guard = this.authorizeChange(found, 'sign')
      ?? this.checkVersion(found, dto?.version) ?? this.ensureOpen(found, 'sign');
    if (guard) return guard;
    return of(this.replace({
      ...found, status: 'signed', signed_at: new Date().toISOString(), signed_by: this.userId,
      version: found.version + 1,
    }));
  }

  void(id: string, dto: VoidEncounterDto): Observable<Encounter> {
    const found = this.find(id);
    if (!found) return httpError(404, `Encounter with id '${id}' was not found.`);
    // Anulación administrativa: clinical.void saltea la regla del profesional (incluso inactivo/sin user).
    const administrative = this.permissions.includes(CLINICAL_VOID_PERMISSION);
    if (!administrative) {
      const auth = this.authorizeChange(found, 'void');
      if (auth) return auth;
    }
    const reason = (dto?.reason ?? '').trim();
    if (!reason) return argumentError('reason is required.', 'reason');
    if (reason.length > ENCOUNTER_LIMITS.void_reason) {
      return argumentError(`reason cannot exceed ${ENCOUNTER_LIMITS.void_reason} characters.`, 'reason');
    }
    const versionError = this.checkVersion(found, dto.version);
    if (versionError) return versionError;
    if (found.status === 'voided') return httpError(409, "Cannot void an encounter with status 'voided'.");
    return of(this.replace({
      ...found, status: 'voided', voided_at: new Date().toISOString(), voided_by: this.userId,
      void_reason: reason, version: found.version + 1,
    }));
  }

  resolveClinicalRecordId(patientId: string): Observable<string> {
    return MOCK_PATIENTS.some(p => p.id === patientId)
      ? of(`cr-${patientId}`)
      : httpError(404, `Patient with id '${patientId}' was not found.`);
  }

  listPatients(q?: string): Observable<EncounterPartyOption[]> {
    const term = q?.trim().toLowerCase();
    return of(term ? MOCK_PATIENTS.filter(p => p.label.toLowerCase().includes(term)) : MOCK_PATIENTS);
  }

  getPatient(id: string): Observable<EncounterPartyOption> {
    const found = MOCK_PATIENTS.find(p => p.id === id);
    return found ? of(found) : httpError(404, `Patient with id '${id}' was not found.`);
  }

  listProfessionals(): Observable<ProfessionalOption[]> {
    return of(this.professionals);
  }

  listDiagnoses(encounterId: string): Observable<Diagnosis[]> {
    if (!this.canRead()) return httpError(403, 'Forbidden.');
    if (!this.find(encounterId)) return httpError(404, `Encounter with id '${encounterId}' was not found.`);
    return of(this.diagnoses
      .filter(d => d.encounter_id === encounterId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(d => ({ ...d })));
  }

  createDiagnosis(encounterId: string, dto: CreateDiagnosisDto): Observable<CreatedDiagnosis> {
    const found = this.find(encounterId);
    if (!found) return httpError(404, `Encounter with id '${encounterId}' was not found.`);
    const guard = this.authorizeChange(found, ADD_DIAGNOSES) ?? this.ensureOpen(found, ADD_DIAGNOSES);
    if (guard) return guard;

    const rawCode = dto?.cie10_code?.trim().toUpperCase() || null;
    let catalogDescription: string | null = null;
    if (rawCode) {
      if (rawCode.length > CIE10_CODE_MAX_LENGTH || !CIE10_CODE_FORMAT.test(rawCode)) {
        return argumentError(`cie10_code '${rawCode}' is not a valid ICD-10 code.`, 'cie10_code');
      }
      const entry = MOCK_CIE10.find(c => c.code === rawCode);
      if (!entry) return httpError(422, `cie10_code '${rawCode}' does not exist in the CIE-10 catalog.`);
      catalogDescription = entry.description;
    }
    const description = dto?.description?.trim() || catalogDescription;
    if (!description) {
      return argumentError('description is required when cie10_code is not provided.', 'description');
    }
    if (description.length > DIAGNOSIS_LIMITS.description) {
      return argumentError(`description cannot exceed ${DIAGNOSIS_LIMITS.description} characters.`, 'description');
    }
    if (description.includes('\0')) {
      return argumentError('description cannot contain the null character (U+0000).', 'description');
    }
    // DiagnosisDuplicateCodeException (después de validar el body, como DiagnosisService).
    if (rawCode && this.diagnoses.some(d => d.encounter_id === encounterId && d.cie10_code === rawCode)) {
      return httpError(409, `Encounter '${encounterId}' already has a diagnosis with cie10_code '${rawCode}'.`);
    }
    const diagnosis: Diagnosis = {
      id: `dx-${this.nextId++}`,
      encounter_id: encounterId,
      cie10_code: rawCode,
      description,
      is_definitive: dto?.is_definitive ?? false,
      created_at: new Date().toISOString(),
    };
    this.diagnoses = [...this.diagnoses, diagnosis];
    const updated = this.replace({ ...found, version: found.version + 1 });
    return of({ ...diagnosis, encounter_version: updated.version });
  }

  deleteDiagnosis(encounterId: string, diagnosisId: string): Observable<DeleteDiagnosisResult> {
    const found = this.find(encounterId);
    if (!found) return httpError(404, `Encounter with id '${encounterId}' was not found.`);
    const auth = this.authorizeChange(found, REMOVE_DIAGNOSES);
    if (auth) return auth;
    if (!this.diagnoses.some(d => d.id === diagnosisId && d.encounter_id === encounterId)) {
      return httpError(404, `Diagnosis with id '${diagnosisId}' was not found.`);
    }
    const notOpen = this.ensureOpen(found, REMOVE_DIAGNOSES);
    if (notOpen) return notOpen;
    this.diagnoses = this.diagnoses.filter(d => d.id !== diagnosisId);
    const updated = this.replace({ ...found, version: found.version + 1 });
    return of({ encounter_version: updated.version });
  }

  private find(id: string): Encounter | undefined {
    return this.encounters.find(e => e.id === id);
  }

  private replace(updated: Encounter): Encounter {
    this.encounters = this.encounters.map(e => (e.id === updated.id ? updated : e));
    return { ...updated };
  }

  private patientOfClinicalRecord(clinicalRecordId: string): string | null {
    const patientId = clinicalRecordId.startsWith('cr-') ? clinicalRecordId.slice(3) : null;
    return patientId && MOCK_PATIENTS.some(p => p.id === patientId) ? patientId : null;
  }

  // Lecturas: profesional activo vinculado al usuario, o clinical.void.
  private canRead(): boolean {
    return this.backend.canReadClinical();
  }

  // 403 (no es el usuario del profesional) → 422 (profesional inactivo).
  private guardProfessional(professional: ProfessionalOption, operation: string, encounterId: string | null): Observable<never> | null {
    if (!professional.user_id || professional.user_id !== this.userId) {
      return httpError(403, encounterId
        ? `Only the user linked to the encounter's professional can ${operation} encounter '${encounterId}'.`
        : `Only the user linked to the professional can ${operation} an encounter.`);
    }
    if (!professional.active) return httpError(422, `Professional with id '${professional.id}' is inactive.`);
    return null;
  }

  private authorizeChange(encounter: Encounter, operation: string): Observable<never> | null {
    const professional = this.professionals.find(p => p.id === encounter.professional_id);
    if (!professional) return httpError(404, `Professional with id '${encounter.professional_id}' was not found.`);
    return this.guardProfessional(professional, operation, encounter.id);
  }

  // 422 sin version → 409 version vieja.
  private checkVersion(encounter: Encounter, version: number | undefined): Observable<never> | null {
    if (typeof version !== 'number') return argumentError('version is required.', 'version');
    if (version !== encounter.version) {
      return httpError(409, 'The resource was modified by another request. Reload and try again.');
    }
    return null;
  }

  private ensureOpen(encounter: Encounter, operation: string): Observable<never> | null {
    return encounter.status === 'open'
      ? null
      : httpError(409, `Cannot ${operation} an encounter with status '${encounter.status}'.`);
  }

  private validateNote(dto: Pick<UpdateEncounterDto, 'chief_complaint' | 'anamnesis' | 'exam'>): Observable<never> | null {
    for (const field of ['chief_complaint', 'anamnesis', 'exam'] as const) {
      if ((dto[field]?.length ?? 0) > ENCOUNTER_LIMITS[field]) {
        return argumentError(`${field} cannot exceed ${ENCOUNTER_LIMITS[field]} characters.`, field);
      }
    }
    return null;
  }
}

function toSummary(e: Encounter): EncounterSummary {
  return {
    id: e.id, patient_id: e.patient_id, professional_id: e.professional_id, appointment_id: e.appointment_id,
    specialty_id: e.specialty_id, encounter_date: e.encounter_date, status: e.status,
    chief_complaint: e.chief_complaint, signed_at: e.signed_at, voided_at: e.voided_at,
    created_at: e.created_at, version: e.version,
  };
}
