export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RefreshRequest {
  userId: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  fullName: string;
  role: string;
  clinicId: string | null;
}
