export type UserRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'Doctor'
  | 'SupportDoctor'
  | 'Secretary'
  | 'Patient'
  | 'ExternalTechnician';

export interface CreateDoctorAdminRequest {
  clinicId: string;
  specialtyId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  licenseNumber: string;
  bio?: string;
  consultationFee: number;
  videoFee: number;
  followUpValidityDays: number;
}

export interface CreateSecretaryAdminRequest {
  clinicId: string;
  specialtyId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface CreateSupportDoctorRequest {
  clinicId: string;
  specialtyId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  licenseNumber: string;
}

export interface CreateExternalTechnicianRequest {
  alliedCenterId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserSummary {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  specialtyName: string | null;
}

export interface UserDetail {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  clinicName: string | null;
  specialtyName: string | null;
  licenseNumber: string | null;
  consultationFee: number | null;
  videoFee: number | null;
  feesApproved: boolean | null;
  followUpValidityDays: number | null;
  alliedCenterName: string | null;
}

export interface ToggleStatusRequest { activate: boolean; }
export interface ResetPasswordRequest { newPassword: string; }
