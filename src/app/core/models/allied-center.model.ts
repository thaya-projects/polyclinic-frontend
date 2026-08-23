export type AlliedCenterType =
  | 'Laboratory'
  | 'Imaging'
  | 'Pharmacy'
  | 'Rehabilitation'
  | 'Other';

export interface CreateAlliedCenterRequest {
  clinicId: string;
  name: string;
  type: AlliedCenterType;
  city: string;
  phone: string;
}

export interface UpdateAlliedCenterRequest {
  name: string;
  city: string;
  phone: string;
}

export interface AlliedCenterDto {
  alliedCenterId: string;
  name: string;
  type: AlliedCenterType;
  city: string;
  phone: string;
  isActive: boolean;
  totalTechnicians: number;
}
