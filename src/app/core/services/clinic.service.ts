import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  CreateClinicRequest, CreateClinicResponse, UpdateClinicRequest,
  ClinicSummary, ClinicDetail, PagedResult,
} from '../models/clinic.model';

let nextClinicId = 100;

const INITIAL_CLINICS: ClinicSummary[] = [
  { clinicId: 'clinic-1', name: 'Clínica MedConnect', slug: 'medconnect',  city: 'La Paz',      isActive: true, createdAt: '2026-01-05T00:00:00Z', totalDoctors: 4, totalPatients: 312 },
  { clinicId: 'clinic-2', name: 'Clínica San Rafael',  slug: 'san-rafael',  city: 'Santa Cruz',  isActive: true, createdAt: '2026-02-12T00:00:00Z', totalDoctors: 6, totalPatients: 540 },
  { clinicId: 'clinic-3', name: 'Centro Vital',        slug: 'centro-vital', city: 'Cochabamba', isActive: true, createdAt: '2026-03-20T00:00:00Z', totalDoctors: 3, totalPatients: 198 },
  { clinicId: 'clinic-4', name: 'Clínica del Valle',   slug: 'del-valle',   city: 'Sucre',       isActive: false, createdAt: '2026-04-01T00:00:00Z', totalDoctors: 2, totalPatients: 87 },
];

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private clinics = signal<ClinicSummary[]>(INITIAL_CLINICS);

  createClinic(req: CreateClinicRequest): Observable<CreateClinicResponse> {
    const clinicId = `clinic-${nextClinicId++}`;
    this.clinics.update(list => [
      ...list,
      { clinicId, name: req.name, slug: req.slug, city: req.city, isActive: true, createdAt: new Date().toISOString(), totalDoctors: 0, totalPatients: 0 },
    ]);
    return of({ clinicId, name: req.name, slug: req.slug }).pipe(delay(400));
  }

  getClinics(page = 1, pageSize = 20): Observable<PagedResult<ClinicSummary>> {
    const all = this.clinics();
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    const result: PagedResult<ClinicSummary> = {
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

  getClinicById(clinicId: string): Observable<ClinicDetail> {
    const c = this.clinics().find(x => x.clinicId === clinicId);
    const detail: ClinicDetail = {
      clinicId: c?.clinicId ?? clinicId,
      name: c?.name ?? 'Clínica desconocida',
      slug: c?.slug ?? '',
      city: c?.city ?? '',
      phone: '+591 700 00000',
      timeZone: 'America/La_Paz',
      isActive: c?.isActive ?? false,
      minutesBeforeAttachment: 30,
      createdAt: c?.createdAt ?? new Date().toISOString(),
      specialties: [
        { name: 'Cardiología', icon: 'heart-rate-monitor' },
        { name: 'Traumatología', icon: 'bone' },
      ],
    };
    return of(detail).pipe(delay(300));
  }

  updateClinic(clinicId: string, req: UpdateClinicRequest): Observable<unknown> {
    this.clinics.update(list =>
      list.map(c => (c.clinicId === clinicId ? { ...c, name: req.name, city: req.city } : c)),
    );
    return of({}).pipe(delay(300));
  }

  toggleClinicStatus(clinicId: string, activate: boolean): Observable<unknown> {
    this.clinics.update(list => list.map(c => (c.clinicId === clinicId ? { ...c, isActive: activate } : c)));
    return of({}).pipe(delay(300));
  }
}
