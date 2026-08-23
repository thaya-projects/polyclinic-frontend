import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  RegisterUserRequest, RegisterUserResponse,
  CreateDoctorRequest, CreatePatientRequest, Specialty,
} from '../models/registration.model';

let nextUserId = 100;
let nextSpecialtyId = 100;

const INITIAL_SPECIALTIES: Specialty[] = [
  { id: 'gen-cardio',  name: 'Cardiología',    description: 'Corazón y sistema circulatorio' },
  { id: 'gen-trauma',  name: 'Traumatología',   description: 'Huesos, articulaciones y músculos' },
  { id: 'gen-neuro',   name: 'Neurología',      description: 'Sistema nervioso' },
  { id: 'gen-oftalmo', name: 'Oftalmología',    description: 'Salud visual' },
];

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private specialties = signal<Specialty[]>(INITIAL_SPECIALTIES);

  registerUser(req: RegisterUserRequest): Observable<RegisterUserResponse> {
    const res: RegisterUserResponse = { userId: `usr-${nextUserId++}`, email: req.email };
    return of(res).pipe(delay(500));
  }

  createDoctorProfile(_req: CreateDoctorRequest): Observable<unknown> {
    return of({}).pipe(delay(500));
  }

  createPatientRecord(_req: CreatePatientRequest): Observable<unknown> {
    return of({}).pipe(delay(500));
  }

  getSpecialties(): Observable<Specialty[]> {
    return of(this.specialties()).pipe(delay(300));
  }

  createSpecialty(name: string, description: string): Observable<Specialty> {
    const specialty: Specialty = { id: `gen-${nextSpecialtyId++}`, name, description };
    this.specialties.update(list => [...list, specialty]);
    return of(specialty).pipe(delay(300));
  }
}
