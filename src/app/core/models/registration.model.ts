export interface RegisterUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'Admin' | 'Doctor' | 'Patient' | 'Receptionist';
}

export interface RegisterUserResponse {
  userId: string;
  email: string;
}

export interface CreateDoctorRequest {
  fullName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  specialtyId: string;
}

export interface CreatePatientRequest {
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
}
