export interface SystemDashboardDto {
  totalClinics: number;
  activeClinics: number;
  totalDoctors: number;
  activeDoctors: number;
  totalPatients: number;
  consultationsToday: number;
  videoConsultationsToday: number;
  pendingPayments: number;
  pendingFeeApprovals: number;
  recentClinics: RecentClinicDto[];
}

export interface RecentClinicDto {
  clinicId: string;
  name: string;
  city: string;
  createdAt: string;
}

export interface ClinicDashboardDto {
  clinicId: string;
  clinicName: string;
  city: string;
  totalDoctors: number;
  activeDoctors: number;
  totalSpecialties: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  consultationsToday: number;
  videoConsultationsToday: number;
  pendingConsultations: number;
  confirmedConsultations: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  pendingFeeApprovals: number;
  doctorSummary: DoctorDashboardItemDto[];
}

export interface DoctorDashboardItemDto {
  doctorName: string;
  specialtyName: string;
  consultationsToday: number;
  feesApproved: boolean;
  consultationFee: number;
  videoFee: number;
}
