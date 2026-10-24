import { HttpErrorResponse } from '@angular/common/http';

// Este endpoint devuelve ProblemDetails ({ status, title, detail }), no { message }.
function problemDetail(err: HttpErrorResponse): string | null {
  const body = err.error;
  return body && typeof body.detail === 'string' ? body.detail : null;
}

function baseProfessionalsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'No tenés permisos para gestionar profesionales de esta clínica.';
  if (err.status === 404) return 'El profesional ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// POST /tenants/professionals, PATCH /tenants/professionals/:id
export function professionalSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const base = baseProfessionalsMessage(err);
    if (base) return base;

    if (err.status === 422) {
      const detail = problemDetail(err);
      if (detail?.includes('Email is required')) {
        return 'Para crear una cuenta de acceso, el correo es obligatorio.';
      }
      if (detail?.includes('Cannot combine')) {
        return 'No podés vincular un usuario existente y crear una cuenta nueva al mismo tiempo.';
      }
      return detail ?? 'Revisá los datos ingresados e intentá de nuevo.';
    }

    if (err.status === 409) {
      const detail = problemDetail(err);
      if (detail?.includes('app user with email')) {
        return 'Ya existe una cuenta de usuario con ese correo.';
      }
      return 'Ese usuario ya está vinculado a otro profesional.';
    }

    return problemDetail(err) ?? 'No se pudo guardar el profesional.';
  }
  return 'No se pudo guardar el profesional.';
}
