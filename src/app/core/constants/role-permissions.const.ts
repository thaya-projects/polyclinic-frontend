export interface PermissionOption {
  code: string;
  label: string;
}

// T13: prohibido mostrar o permitir seleccionar permisos de otros módulos
// (odontograma, citas, facturación, etc.) desde el form de rol — acá solo
// van los definidos para el módulo de roles/usuarios.
export const ROLE_MODULE_PERMISSIONS: PermissionOption[] = [
  { code: 'roles.manage', label: 'Gestionar roles' },
  { code: 'users.manage', label: 'Gestionar usuarios' },
];
