import { Injectable, inject } from '@angular/core';
import { CLINICAL_VOID_PERMISSION, Encounter, EncounterPartyOption } from '../core/models/encounter.model';

export const MOCK_CURRENT_USER_ID = 'mock-user-1';

export type ProfessionalOption = EncounterPartyOption & { active: boolean };

export const MOCK_PATIENTS: EncounterPartyOption[] = [
  { id: 'pat-1', name: 'Ana Gómez', label: 'Ana Gómez — 30111222' },
  { id: 'pat-2', name: 'Luis Pérez', label: 'Luis Pérez — 28444555' },
];

function seedProfessionals(): ProfessionalOption[] {
  return [
    { id: 'prof-1', name: 'Dra. Laura Méndez', label: 'Dra. Laura Méndez', user_id: MOCK_CURRENT_USER_ID, active: true },
    { id: 'prof-2', name: 'Dr. Carlos Ruiz', label: 'Dr. Carlos Ruiz', user_id: 'mock-user-2', active: true },
  ];
}

function seedEncounters(): Encounter[] {
  const base = {
    appointment_id: null, specialty_id: null, form_template_id: null, clinical_data: {},
    signed_at: null, signed_by: null, voided_at: null, voided_by: null, void_reason: null, version: 1,
  };
  return [
    {
      ...base, id: 'enc-1', clinical_record_id: 'cr-pat-1', patient_id: 'pat-1', professional_id: 'prof-1',
      encounter_date: '2026-10-10T14:00:00Z', created_at: '2026-10-10T14:00:00Z', status: 'open',
      chief_complaint: 'Cefalea de 3 días', anamnesis: 'Refiere dolor frontal...', exam: 'TA 120/80',
    },
    {
      ...base, id: 'enc-2', clinical_record_id: 'cr-pat-2', patient_id: 'pat-2', professional_id: 'prof-1',
      encounter_date: '2026-10-08T10:30:00Z', created_at: '2026-10-08T10:30:00Z', status: 'signed',
      chief_complaint: 'Control anual', anamnesis: 'Sin novedades.', exam: 'Normal.',
      signed_at: '2026-10-08T11:00:00Z', signed_by: MOCK_CURRENT_USER_ID, version: 2,
    },
    {
      // De otro profesional: el usuario del mock lo ve de solo lectura.
      ...base, id: 'enc-3', clinical_record_id: 'cr-pat-1', patient_id: 'pat-1', professional_id: 'prof-2',
      encounter_date: '2026-10-05T09:00:00Z', created_at: '2026-10-05T09:00:00Z', status: 'open',
      chief_complaint: 'Dolor lumbar', anamnesis: null, exam: null,
    },
  ];
}

// Fase 4: estado en memoria del "backend" clínico, compartido por los mocks de encounters y de
// signos vitales (como la base real): sesión (usuario + permisos), profesionales, pacientes y
// encounters. Así una medición asociada incrementa la version del mismo encounter que ve
// MockEncountersRepository, sin ampliar la API pública de ese mock.
// providedIn root: TestBed lo recrea en cada test; el código productivo nunca lo importa.
@Injectable({ providedIn: 'root' })
export class MockClinicalBackend {
  encounters: Encounter[] = seedEncounters();
  professionals: ProfessionalOption[] = seedProfessionals();
  userId: string | null = MOCK_CURRENT_USER_ID;
  permissions: string[] = [];

  // Policy ClinicalRead: profesional activo vinculado al usuario, o clinical.void.
  canReadClinical(): boolean {
    if (this.permissions.includes(CLINICAL_VOID_PERMISSION)) return true;
    return this.professionals.some(p => p.user_id !== null && p.user_id === this.userId && p.active);
  }

  // Profesional vinculado al usuario de la sesión (activo o no), como el backend lo resuelve del token.
  linkedProfessional(): ProfessionalOption | undefined {
    return this.professionals.find(p => p.user_id !== null && p.user_id === this.userId);
  }

  professionalById(id: string): ProfessionalOption | undefined {
    return this.professionals.find(p => p.id === id);
  }

  patientExists(id: string): boolean {
    return MOCK_PATIENTS.some(p => p.id === id);
  }

  encounter(id: string): Encounter | undefined {
    const found = this.encounters.find(e => e.id === id);
    return found ? { ...found } : undefined;
  }

  // Alta de un hijo clínico (medición): incrementa la version del encounter y la devuelve.
  bumpEncounterVersion(id: string): number {
    const found = this.encounters.find(e => e.id === id);
    if (!found) throw new Error(`Encounter ${id} no existe en el mock.`);
    const version = found.version + 1;
    this.encounters = this.encounters.map(e => (e.id === id ? { ...e, version } : e));
    return version;
  }
}

// El de la inyección (compartido por los mocks del mismo injector) o, fuera de un contexto de
// inyección (un `new MockEncountersRepository()` en un test unitario), uno propio.
export function injectClinicalBackend(): MockClinicalBackend {
  try {
    return inject(MockClinicalBackend);
  } catch {
    return new MockClinicalBackend();
  }
}
