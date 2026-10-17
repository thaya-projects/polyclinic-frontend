import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OdontogramApi } from './odontogram-api';
import { ClinicalRecordApi } from './clinical-record-api';
import { PatientsApi } from './patients-api';
import { FeaturesService } from './features.service';
import type { OdontogramRepository } from './odontogram-repository';
import { CreateOdontogramDto, Odontogram, OdontogramPatientOption } from '../models/odontogram.model';
import { Patient } from '../models/patient.model';

// Resultados del selector de paciente (primera página del backend; se afina buscando).
const PATIENT_OPTIONS_LIMIT = 20;

// Fase 6 T6: implementación real contra el backend (default de ODONTOGRAM_REPOSITORY).
@Injectable({ providedIn: 'root' })
export class HttpOdontogramRepository implements OdontogramRepository {
  private api = inject(OdontogramApi);
  private clinicalRecordApi = inject(ClinicalRecordApi);
  private patientsApi = inject(PatientsApi);
  private features = inject(FeaturesService);

  getCurrent(patientId: string): Observable<Odontogram> {
    return this.api.getCurrent(patientId);
  }

  getById(id: string): Observable<Odontogram> {
    return this.api.getById(id);
  }

  create(patientId: string, dto: CreateOdontogramDto): Observable<Odontogram> {
    return this.api.create(patientId, dto);
  }

  // GET /tenants/patients/:id/clinical-record (1-1 con el paciente, mismo camino que encounters).
  resolveClinicalRecordId(patientId: string): Observable<string> {
    return this.clinicalRecordApi.get(patientId).pipe(
      map(record => {
        if (!record.id) throw new Error('El paciente no tiene historia clínica.');
        return record.id;
      }),
    );
  }

  getPatient(id: string): Observable<OdontogramPatientOption> {
    return this.patientsApi.getById(id).pipe(map(toPatientOption));
  }

  // GET /tenants/patients?q=&page=1&limit=20 — el backend busca por nombre/documento con `q`.
  listPatients(q?: string): Observable<OdontogramPatientOption[]> {
    const term = q?.trim();
    return this.patientsApi.getAll({ page: 1, limit: PATIENT_OPTIONS_LIMIT, q: term || undefined }).pipe(
      map(res => res.items.map(toPatientOption)),
    );
  }

  // GET /tenants/me/features (lo carga el Shell). null mientras no haya respuesta.
  odontogramEnabled(): boolean | null {
    return this.features.loaded() ? this.features.enabled('odontogram') : null;
  }
}

function toPatientOption(p: Patient): OdontogramPatientOption {
  const name = `${p.first_name} ${p.last_name}`.trim();
  return { id: p.id, name, label: p.document_number ? `${name} — ${p.document_number}` : name };
}
