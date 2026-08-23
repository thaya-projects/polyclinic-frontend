import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  CreateSpecialtyAdminRequest, UpdateSpecialtyAdminRequest, SpecialtyDto,
} from '../models/specialty-admin.model';

let nextSpecialtyId = 100;

const INITIAL_SPECIALTIES: SpecialtyDto[] = [
  { specialtyId: 'spec-cardio',    name: 'Cardiología',    icon: 'heart-rate-monitor', isActive: true, totalDoctors: 1, totalSecretaries: 1 },
  { specialtyId: 'spec-trauma',    name: 'Traumatología',   icon: 'bone',               isActive: true, totalDoctors: 1, totalSecretaries: 1 },
  { specialtyId: 'spec-neuro',     name: 'Neurología',      icon: 'brain',              isActive: true, totalDoctors: 1, totalSecretaries: 0 },
  { specialtyId: 'spec-oftalmo',   name: 'Oftalmología',    icon: 'eye',                isActive: false, totalDoctors: 1, totalSecretaries: 0 },
];

@Injectable({ providedIn: 'root' })
export class SpecialtyAdminService {
  private specialties = signal<SpecialtyDto[]>(INITIAL_SPECIALTIES);

  createSpecialty(req: CreateSpecialtyAdminRequest): Observable<SpecialtyDto> {
    const specialty: SpecialtyDto = {
      specialtyId: `spec-${nextSpecialtyId++}`,
      name: req.name,
      icon: req.icon,
      isActive: true,
      totalDoctors: 0,
      totalSecretaries: 0,
    };
    this.specialties.update(list => [...list, specialty]);
    return of(specialty).pipe(delay(300));
  }

  getSpecialtiesByClinic(_clinicId: string): Observable<SpecialtyDto[]> {
    return of(this.specialties()).pipe(delay(300));
  }

  updateSpecialty(specialtyId: string, req: UpdateSpecialtyAdminRequest): Observable<unknown> {
    this.specialties.update(list =>
      list.map(s => (s.specialtyId === specialtyId ? { ...s, name: req.name, icon: req.icon } : s)),
    );
    return of({}).pipe(delay(300));
  }

  toggleSpecialtyStatus(specialtyId: string, activate: boolean): Observable<unknown> {
    this.specialties.update(list =>
      list.map(s => (s.specialtyId === specialtyId ? { ...s, isActive: activate } : s)),
    );
    return of({}).pipe(delay(300));
  }
}
