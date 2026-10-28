import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

// T16: mensajes específicos para cada código de error que pueden devolver
// /tenants/roles y /tenants/users/:userId/roles. Nada de "Ocurrió un error
// inesperado" sin explicación — cada acción tiene su propio fallback,
// contextualizado a lo que se estaba haciendo.

// 401/403/404/0 son comunes a toda acción de este módulo; cada función
// específica solo agrega lo que le es propio (409, 422) y su fallback final.
function baseRolesModuleMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) {
    return 'No tenés permisos para gestionar roles de esta clínica. Verificá que iniciaste sesión con una cuenta de la clínica (no de Super Admin).';
  }
  if (err.status === 404) {
    return 'No se encontró: el rol, el usuario o la sucursal pueden pertenecer a otra clínica, o ya no existir.';
  }
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// ProblemDetails ({ detail }) del backend; { message } queda por compatibilidad.
function backendText(err: HttpErrorResponse): string | null {
  const raw = err.error?.detail ?? err.error?.message;
  return typeof raw === 'string' && raw ? translateServerMessage(raw) : null;
}

export const ROLE_CODE_TAKEN_MESSAGE = 'Ya existe un rol con ese código en tu clínica. Elegí un código distinto.';

// GET /tenants/roles
export function rolesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseRolesModuleMessage(err) ?? backendText(err) ?? 'No se pudo cargar el listado de roles.';
  }
  return 'No se pudo cargar el listado de roles.';
}

// POST /tenants/roles, PATCH /tenants/roles/:id
export function roleSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return ROLE_CODE_TAKEN_MESSAGE;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar el rol: uno de los datos no es válido.';
    }
    return baseRolesModuleMessage(err) ?? backendText(err) ?? 'No se pudo guardar el rol.';
  }
  return 'No se pudo guardar el rol.';
}

// DELETE /tenants/roles/:id — 409 significa que hay user_role asociados a
// ese rol; el backend no lo deja borrar mientras esté en uso.
export function roleDeleteErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'No se puede eliminar: hay usuarios con este rol asignado.';
    return baseRolesModuleMessage(err) ?? backendText(err) ?? 'No se pudo eliminar el rol.';
  }
  return 'No se pudo eliminar el rol.';
}

// GET /tenants/users/:userId/roles
export function userRolesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseRolesModuleMessage(err) ?? backendText(err) ?? 'No se pudieron cargar los roles del usuario.';
  }
  return 'No se pudieron cargar los roles del usuario.';
}

// PUT /tenants/users/:userId/roles
export function userRolesSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'Ese usuario ya tiene asignado uno de esos roles en esa sucursal.';
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar la asignación de roles: una de las asignaciones no es válida.';
    }
    return baseRolesModuleMessage(err) ?? backendText(err) ?? 'No se pudo guardar la asignación de roles.';
  }
  return 'No se pudo guardar la asignación de roles.';
}
