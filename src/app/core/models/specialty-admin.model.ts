export interface CreateSpecialtyAdminRequest {
  clinicId: string;
  name: string;
  icon: string;
}

export interface UpdateSpecialtyAdminRequest {
  name: string;
  icon: string;
}

export interface SpecialtyDto {
  specialtyId: string;
  name: string;
  icon: string;
  isActive: boolean;
  totalDoctors: number;
  totalSecretaries: number;
}
