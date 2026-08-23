import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { SystemDashboardDto, ClinicDashboardDto } from '../models/dashboard.model';

const SYSTEM_DASHBOARD: SystemDashboardDto = {
  totalClinics: 8,
  activeClinics: 7,
  totalDoctors: 34,
  activeDoctors: 29,
  totalPatients: 1842,
  consultationsToday: 57,
  videoConsultationsToday: 21,
  pendingPayments: 6,
  pendingFeeApprovals: 3,
  recentClinics: [
    { clinicId: 'clinic-1', name: 'Clínica MedConnect', city: 'La Paz',       createdAt: '2026-08-19T00:00:00Z' },
    { clinicId: 'clinic-2', name: 'Clínica San Rafael',  city: 'Santa Cruz',  createdAt: '2026-08-14T00:00:00Z' },
    { clinicId: 'clinic-3', name: 'Centro Vital',        city: 'Cochabamba', createdAt: '2026-08-05T00:00:00Z' },
    { clinicId: 'clinic-4', name: 'Clínica del Valle',   city: 'Sucre',      createdAt: '2026-07-28T00:00:00Z' },
  ],
};

const CLINIC_DASHBOARD: ClinicDashboardDto = {
  clinicId: 'clinic-1',
  clinicName: 'Clínica MedConnect',
  city: 'La Paz',
  totalDoctors: 4,
  activeDoctors: 3,
  totalSpecialties: 4,
  totalPatients: 312,
  newPatientsThisMonth: 24,
  consultationsToday: 12,
  videoConsultationsToday: 5,
  pendingConsultations: 3,
  confirmedConsultations: 9,
  pendingPaymentsCount: 2,
  pendingPaymentsAmount: 850,
  pendingFeeApprovals: 1,
  doctorSummary: [
    { doctorName: 'Dr. Roberto Vargas', specialtyName: 'Cardiología',    consultationsToday: 5, feesApproved: true,  consultationFee: 250, videoFee: 200 },
    { doctorName: 'Dra. Carmen Solís',  specialtyName: 'Traumatología',   consultationsToday: 4, feesApproved: true,  consultationFee: 220, videoFee: 180 },
    { doctorName: 'Dr. Marco Huanca',   specialtyName: 'Neurología',      consultationsToday: 3, feesApproved: false, consultationFee: 260, videoFee: 210 },
  ],
};

@Injectable({ providedIn: 'root' })
export class DashboardAdminService {
  getSystemDashboard(): Observable<SystemDashboardDto> {
    return of(SYSTEM_DASHBOARD).pipe(delay(400));
  }

  getClinicDashboard(_clinicId: string): Observable<ClinicDashboardDto> {
    return of(CLINIC_DASHBOARD).pipe(delay(400));
  }
}
