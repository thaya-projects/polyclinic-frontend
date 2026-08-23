export interface PatientAdminSummary {
  patientId: string;
  fullName: string;
  ci: string;
  age: number;
  gender: string;
  municipality: string;
  department: string;
  isRural: boolean;
  hasUserAccount: boolean;
  isActive: boolean;
  totalConsultations: number;
  lastConsultationDate: string | null;
}

export interface PatientAdminDetail {
  patientId: string;
  fullName: string;
  ci: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  phone: string | null;
  municipality: string;
  department: string;
  isRural: boolean;
  hasUserAccount: boolean;
  isActive: boolean;
  createdAt: string;
  linkedEmail: string | null;
  totalConsultations: number;
  lastConsultationDate: string | null;
  lastDoctorName: string | null;
  activePrescriptions: number;
}

export interface UpdatePatientAdminRequest {
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  municipality: string;
  department: string;
  isRural: boolean;
}
