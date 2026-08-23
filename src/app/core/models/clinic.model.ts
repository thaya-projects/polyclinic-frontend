export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateClinicRequest {
  name: string;
  slug: string;
  city: string;
  phone: string;
  timeZone: string;
}

export interface CreateClinicResponse {
  clinicId: string;
  name: string;
  slug: string;
}

export interface UpdateClinicRequest {
  name: string;
  city: string;
  phone: string;
  minutesBeforeAttachment: number;
  timeZone: string;
}

export interface ClinicSummary {
  clinicId: string;
  name: string;
  slug: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  totalDoctors: number;
  totalPatients: number;
}

export interface ClinicDetail {
  clinicId: string;
  name: string;
  slug: string;
  city: string;
  phone: string;
  timeZone: string;
  isActive: boolean;
  minutesBeforeAttachment: number;
  createdAt: string;
  specialties: { name: string; icon: string }[];
}
