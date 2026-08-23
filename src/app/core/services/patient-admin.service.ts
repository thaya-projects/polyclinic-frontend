import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  PatientAdminSummary, PatientAdminDetail, UpdatePatientAdminRequest,
} from '../models/patient-admin.model';
import { PagedResult } from '../models/clinic.model';

const INITIAL_PATIENTS: PatientAdminSummary[] = [
  { patientId: 'p1', fullName: 'Rosa Mamani Quispe', ci: '4521893', age: 42, gender: 'Female', municipality: 'La Paz',      department: 'La Paz',      isRural: false, hasUserAccount: true,  isActive: true, totalConsultations: 12, lastConsultationDate: '2026-08-19T00:00:00Z' },
  { patientId: 'p2', fullName: 'Andrés Condori',      ci: '7823401', age: 35, gender: 'Male',   municipality: 'El Alto',     department: 'La Paz',      isRural: false, hasUserAccount: true,  isActive: true, totalConsultations: 5,  lastConsultationDate: '2026-08-20T00:00:00Z' },
  { patientId: 'p3', fullName: 'Pedro Torrez',        ci: '6234781', age: 58, gender: 'Male',   municipality: 'Viacha',      department: 'La Paz',      isRural: true,  hasUserAccount: false, isActive: true, totalConsultations: 8,  lastConsultationDate: '2026-08-22T00:00:00Z' },
  { patientId: 'p4', fullName: 'María García',        ci: '5109234', age: 29, gender: 'Female', municipality: 'Santa Cruz', department: 'Santa Cruz', isRural: false, hasUserAccount: true,  isActive: true, totalConsultations: 3,  lastConsultationDate: '2026-08-21T00:00:00Z' },
  { patientId: 'p5', fullName: 'Juan Flores',         ci: '3847201', age: 67, gender: 'Male',   municipality: 'Sacaba',      department: 'Cochabamba', isRural: true,  hasUserAccount: false, isActive: true, totalConsultations: 15, lastConsultationDate: '2026-08-19T00:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class PatientAdminService {
  private patients = signal<PatientAdminSummary[]>(INITIAL_PATIENTS);

  getPatientsByClinic(
    _clinicId: string,
    search?: string,
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<PatientAdminSummary>> {
    const term = search?.toLowerCase().trim();
    const all = term
      ? this.patients().filter(p => p.fullName.toLowerCase().includes(term) || p.ci.includes(term))
      : this.patients();
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    const result: PagedResult<PatientAdminSummary> = {
      items,
      totalCount: all.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
      hasNextPage: start + pageSize < all.length,
      hasPreviousPage: page > 1,
    };
    return of(result).pipe(delay(300));
  }

  getPatientById(patientId: string): Observable<PatientAdminDetail> {
    const p = this.patients().find(x => x.patientId === patientId);
    const detail: PatientAdminDetail = {
      patientId: p?.patientId ?? patientId,
      fullName: p?.fullName ?? 'Paciente desconocido',
      ci: p?.ci ?? '',
      dateOfBirth: '1984-03-10',
      age: p?.age ?? 0,
      gender: p?.gender ?? 'Other',
      phone: '+591 700 00000',
      municipality: p?.municipality ?? '',
      department: p?.department ?? '',
      isRural: p?.isRural ?? false,
      hasUserAccount: p?.hasUserAccount ?? false,
      isActive: p?.isActive ?? false,
      createdAt: '2026-01-10T00:00:00Z',
      linkedEmail: p?.hasUserAccount ? `${p.fullName.split(' ')[0].toLowerCase()}@medconnect.com` : null,
      totalConsultations: p?.totalConsultations ?? 0,
      lastConsultationDate: p?.lastConsultationDate ?? null,
      lastDoctorName: 'Dr. Roberto Vargas',
      activePrescriptions: 1,
    };
    return of(detail).pipe(delay(300));
  }

  updatePatient(patientId: string, req: UpdatePatientAdminRequest): Observable<unknown> {
    this.patients.update(list =>
      list.map(p => (p.patientId === patientId ? { ...p, fullName: req.fullName, ci: req.nationalId } : p)),
    );
    return of({}).pipe(delay(300));
  }

  togglePatientStatus(patientId: string, activate: boolean): Observable<unknown> {
    this.patients.update(list => list.map(p => (p.patientId === patientId ? { ...p, isActive: activate } : p)));
    return of({}).pipe(delay(300));
  }
}
