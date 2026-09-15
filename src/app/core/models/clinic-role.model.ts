// Tabla `role` (T1): code, name, permissions, tenant_id.
// tenant_id null => rol de sistema (no editable, compartido por todos los
// tenants); tenant_id con valor => rol propio de ese tenant (editable, T13).
export interface ClinicRole {
  id: string;
  code: string;
  name: string;
  permissions: string[];
  tenant_id: string | null;
}

export function isSystemRole(role: ClinicRole): boolean {
  return role.tenant_id === null;
}

// Body de POST/PATCH /tenants/roles (T15) — a propósito sin tenant_id: el
// backend lo resuelve del tenant autenticado, nunca se manda en el body.
export interface RoleDto {
  code: string;
  name: string;
  permissions: string[];
}
