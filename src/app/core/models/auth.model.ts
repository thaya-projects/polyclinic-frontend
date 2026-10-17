import { SessionRoleCode } from './role.model';
import { TenantStatus } from './tenant.model';

// Snake_case a propósito: T14 conecta esto contra el DTO real del backend
// (ver T1). Por ahora (T13) es solo el contrato del formulario.
export interface LoginDto {
  tenant_slug: string;
  email: string;
  password: string;
}

// POST /auth/superadmin/login (T19) — sin tenant_slug, un super admin no
// pertenece a ningún tenant.
export interface SuperAdminLoginDto {
  email: string;
  password: string;
}

// Un usuario de clínica puede tener más de un rol (ej. admin + profesional).
export interface SessionRole {
  code: SessionRoleCode;
}

// Usuario logueado, tal como viene dentro de la respuesta de login/refresh
// y de GET /auth/me. is_superadmin es la fuente de verdad para distinguir
// staff de la plataforma de usuarios de clínica — roles[] solo aplica a
// estos últimos (un super admin no pertenece a ningún tenant, así que
// normalmente viene vacío).
export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  is_superadmin: boolean;
  roles: SessionRole[];
  // Códigos de permiso del usuario (AuthUserDTO.Permissions, en login y GET /auth/me). Opcional:
  // sesiones guardadas antes de tiparlo pueden no traerlo. Ej.: 'clinical.void'.
  permissions?: string[];
}

// Tenant al que pertenece el usuario logueado — ausente para un super admin.
export interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  // AuthTenantDTO también trae country_code y locale (ej. 'es-BO'): formato de números/fechas
  // clínicas. Opcionales: sesiones guardadas antes de tiparlos pueden no traerlos.
  country_code?: string;
  locale?: string;
}

// Respuesta del backend al loguear (o refrescar) — se tolera cualquier
// campo extra que venga además de tokens/usuario/tenant.
export interface AuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  user?: SessionUser;
  tenant?: SessionTenant;
  [key: string]: unknown;
}

// GET /auth/me (T16) — sin tokens, solo el estado fresco del usuario. Sin
// tenant para un super admin. subscription_status queda guardado para uso
// futuro (fuera de alcance de T16 usarlo en UI).
export interface MeResponseDto {
  user: SessionUser;
  tenant?: SessionTenant;
  subscription_status?: TenantStatus;
}
