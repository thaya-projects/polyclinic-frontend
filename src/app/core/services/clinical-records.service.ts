import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { ClinicalRecord, ClinicalRecordDto } from '../models/clinical-record.model';
import { ClinicalRecordApi } from './clinical-record-api';
import { clinicalRecordLoadErrorMessage } from '../../shared/utils/clinical-record-error.util';

@Injectable({ providedIn: 'root' })
export class ClinicalRecordsService {
  private api = inject(ClinicalRecordApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<ClinicalRecord[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  findByPatientId(patientId: string): ClinicalRecord | null {
    return this.records().find(r => r.patient_id === patientId) ?? null;
  }

  // GET /tenants/patients/:id/clinical-record — no corre en SSR: depende
  // del token del navegador. Un 404 acá puede significar "todavía no tiene
  // historia clínica" tanto como un error real; en cualquier caso el form
  // queda vacío y listo para completarse (ver clinical-record-error.util).
  loadForPatient(patientId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.get(patientId).subscribe({
      next: record => {
        this.upsertLocal({ ...record, patient_id: patientId });
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(clinicalRecordLoadErrorMessage(err));
      },
    });
  }

  // PATCH /tenants/patients/:id/clinical-record — no hay POST en el
  // alcance del ticket; se asume que el backend crea el registro si
  // todavía no existía (upsert) la primera vez que se guarda.
  save(patientId: string, dto: ClinicalRecordDto): Observable<ClinicalRecord> {
    return this.api.update(patientId, dto).pipe(tap(record => this.upsertLocal({ ...record, patient_id: patientId })));
  }

  private upsertLocal(record: ClinicalRecord): void {
    this.records.update(list => {
      const exists = list.some(r => r.patient_id === record.patient_id);
      return exists ? list.map(r => (r.patient_id === record.patient_id ? record : r)) : [...list, record];
    });
  }
}
