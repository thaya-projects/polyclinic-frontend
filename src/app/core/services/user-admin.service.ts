import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  CreateDoctorAdminRequest, CreateSecretaryAdminRequest, CreateSupportDoctorRequest,
  CreateExternalTechnicianRequest, UserSummary, UserDetail,
} from '../models/user-admin.model';
import { PagedResult } from '../models/clinic.model';

let nextUserId = 100;

// Mismos nombres de especialidad que specialty-admin.service.ts (spec-cardio, spec-trauma, ...)
const SPECIALTY_NAME_BY_ID: Record<string, string> = {
  'spec-cardio':  'Cardiología',
  'spec-trauma':  'Traumatología',
  'spec-neuro':   'Neurología',
  'spec-oftalmo': 'Oftalmología',
};

const INITIAL_USERS: UserSummary[] = [
  { userId: 'usr-1', fullName: 'Dr. Roberto Vargas',  email: 'roberto.vargas@medconnect.com',  role: 'Doctor',             isActive: true,  createdAt: '2026-01-12T08:00:00Z', lastLogin: '2026-08-22T14:20:00Z', specialtyName: 'Cardiología' },
  { userId: 'usr-2', fullName: 'Dra. Carmen Solís',   email: 'carmen.solis@medconnect.com',    role: 'Doctor',             isActive: true,  createdAt: '2026-01-15T08:00:00Z', lastLogin: '2026-08-21T09:05:00Z', specialtyName: 'Traumatología' },
  { userId: 'usr-3', fullName: 'Dr. Marco Huanca',    email: 'marco.huanca@medconnect.com',    role: 'Doctor',             isActive: true,  createdAt: '2026-02-01T08:00:00Z', lastLogin: '2026-08-20T11:40:00Z', specialtyName: 'Neurología' },
  { userId: 'usr-4', fullName: 'Dra. Fátima Rojas',   email: 'fatima.rojas@medconnect.com',    role: 'Doctor',             isActive: false, createdAt: '2026-02-10T08:00:00Z', lastLogin: null,                   specialtyName: 'Oftalmología' },
  { userId: 'usr-5', fullName: 'Lucía Fernández',     email: 'lucia.fernandez@medconnect.com', role: 'Secretary',          isActive: true,  createdAt: '2026-01-20T08:00:00Z', lastLogin: '2026-08-22T08:00:00Z', specialtyName: null },
  { userId: 'usr-6', fullName: 'Paola Mendoza',       email: 'paola.mendoza@medconnect.com',   role: 'Secretary',          isActive: true,  createdAt: '2026-03-05T08:00:00Z', lastLogin: '2026-08-19T13:15:00Z', specialtyName: null },
  { userId: 'usr-7', fullName: 'Dr. Iván Choque',     email: 'ivan.choque@medconnect.com',     role: 'SupportDoctor',      isActive: true,  createdAt: '2026-03-10T08:00:00Z', lastLogin: '2026-08-18T16:00:00Z', specialtyName: 'Cardiología' },
  { userId: 'usr-8', fullName: 'Daniela Quiroga',     email: 'daniela.quiroga@medconnect.com', role: 'ExternalTechnician', isActive: true,  createdAt: '2026-04-02T08:00:00Z', lastLogin: '2026-08-15T10:30:00Z', specialtyName: null },
];

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private users = signal<UserSummary[]>(INITIAL_USERS);

  private addUser(fullName: string, email: string, role: string, specialtyId?: string): Observable<UserSummary> {
    const user: UserSummary = {
      userId: `usr-${nextUserId++}`,
      fullName,
      email,
      role: role as UserSummary['role'],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      specialtyName: specialtyId ? SPECIALTY_NAME_BY_ID[specialtyId] ?? null : null,
    };
    this.users.update(list => [user, ...list]);
    return of(user).pipe(delay(400));
  }

  createDoctor(req: CreateDoctorAdminRequest): Observable<unknown> {
    return this.addUser(`${req.firstName} ${req.lastName}`, req.email, 'Doctor', req.specialtyId);
  }

  createSecretary(req: CreateSecretaryAdminRequest): Observable<unknown> {
    return this.addUser(`${req.firstName} ${req.lastName}`, req.email, 'Secretary', req.specialtyId);
  }

  createSupportDoctor(req: CreateSupportDoctorRequest): Observable<unknown> {
    return this.addUser(`${req.firstName} ${req.lastName}`, req.email, 'SupportDoctor', req.specialtyId);
  }

  createExternalTechnician(req: CreateExternalTechnicianRequest): Observable<unknown> {
    return this.addUser(`${req.firstName} ${req.lastName}`, req.email, 'ExternalTechnician');
  }

  getUsersByClinic(
    _clinicId: string,
    role?: string,
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<UserSummary>> {
    const filtered = role ? this.users().filter(u => u.role === role) : this.users();
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    const result: PagedResult<UserSummary> = {
      items,
      totalCount: filtered.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      hasNextPage: start + pageSize < filtered.length,
      hasPreviousPage: page > 1,
    };
    return of(result).pipe(delay(300));
  }

  getUserById(userId: string): Observable<UserDetail> {
    const u = this.users().find(x => x.userId === userId);
    const detail: UserDetail = {
      userId: u?.userId ?? userId,
      fullName: u?.fullName ?? 'Usuario desconocido',
      email: u?.email ?? '',
      role: u?.role ?? 'Doctor',
      isActive: u?.isActive ?? false,
      createdAt: u?.createdAt ?? new Date().toISOString(),
      lastLogin: u?.lastLogin ?? null,
      clinicName: 'Clínica MedConnect',
      specialtyName: u?.specialtyName ?? null,
      licenseNumber: null,
      consultationFee: null,
      videoFee: null,
      feesApproved: null,
      followUpValidityDays: null,
      alliedCenterName: null,
    };
    return of(detail).pipe(delay(300));
  }

  toggleUserStatus(userId: string, activate: boolean): Observable<unknown> {
    this.users.update(list => list.map(u => (u.userId === userId ? { ...u, isActive: activate } : u)));
    return of({}).pipe(delay(300));
  }

  resetPassword(_userId: string, _newPassword: string): Observable<unknown> {
    return of({}).pipe(delay(300));
  }
}
