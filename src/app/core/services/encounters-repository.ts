import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateEncounterDto, Encounter, EncounterPartyOption, EncounterSummary, EncountersQuery, SignEncounterDto,
  UpdateEncounterDto,
  VoidEncounterDto,
} from '../models/encounter.model';
import { PagedResult } from '../models/paged-result.model';
import { CreateDiagnosisDto, CreatedDiagnosis, DeleteDiagnosisResult, Diagnosis } from '../models/diagnosis.model';
import { HttpEncountersRepository } from './encounters-http.repository';

// Fase 4 T6: abstracción de la fuente de datos de encounters. Las pantallas solo conocen este
// contrato (vía ENCOUNTERS_REPOSITORY), nunca HttpClient ni el mock — así T6 corre con
// MockEncountersRepository y T7 enchufa HttpEncountersRepository sin tocar componentes.
//
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con
// el mismo status que el backend), para que el manejo de 403/404/409/422 sea uno solo.
export interface EncountersRepository {
  // Resumen (sin anamnesis/exam/clinical_data); el detalle completo es getById.
  list(query: EncountersQuery): Observable<PagedResult<EncounterSummary>>;
  getById(id: string): Observable<Encounter>;
  create(dto: CreateEncounterDto): Observable<Encounter>;
  update(id: string, dto: UpdateEncounterDto): Observable<Encounter>;
  sign(id: string, dto: SignEncounterDto): Observable<Encounter>;
  void(id: string, dto: VoidEncounterDto): Observable<Encounter>;

  // El alta exige clinical_record_id: se resuelve desde el paciente (1-1, fase 3).
  resolveClinicalRecordId(patientId: string): Observable<string>;

  // app_user logueado. Crear/editar/firmar/anular solo lo puede el usuario vinculado al
  // profesional del encounter (professional.user_id) — la UI lo usa para habilitar acciones.
  currentUserId(): string | null;
  // Permisos de la sesión ('clinical.void' habilita leer sin ser profesional y anular cualquier encounter).
  currentUserPermissions(): string[];

  // Lookups para selects/filtros y para mostrar nombres en vez de ids. listPatients está acotado
  // (primera página del backend); `q` busca por nombre/documento. getPatient resuelve uno puntual
  // que no esté en esa página (detalle, filas del listado, paciente preseleccionado).
  listPatients(q?: string): Observable<EncounterPartyOption[]>;
  getPatient(id: string): Observable<EncounterPartyOption>;
  listProfessionals(): Observable<(EncounterPartyOption & { active: boolean })[]>;

  // Fase 4 T4/T5: diagnósticos del encounter (sin paginación). El catálogo CIE-10 va aparte
  // (CIE10_CATALOG). Leer: misma regla que las notas (profesional activo o clinical.void; si no 403).
  // Crear/borrar: solo el profesional del encounter, activo (403 / 422) y con el encounter open
  // (409); código CIE-10 repetido en el encounter → 409. Ambos incrementan la version del
  // encounter y devuelven la nueva en `encounter_version`.
  listDiagnoses(encounterId: string): Observable<Diagnosis[]>;
  createDiagnosis(encounterId: string, dto: CreateDiagnosisDto): Observable<CreatedDiagnosis>;
  deleteDiagnosis(encounterId: string, diagnosisId: string): Observable<DeleteDiagnosisResult>;
}

// T7: la implementación HTTP es la default. Para correr contra el mock (demo/tests):
//   providers: [{ provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository }]
//   (MockEncountersRepository vive en src/app/testing/).
export const ENCOUNTERS_REPOSITORY = new InjectionToken<EncountersRepository>('ENCOUNTERS_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpEncountersRepository),
});
