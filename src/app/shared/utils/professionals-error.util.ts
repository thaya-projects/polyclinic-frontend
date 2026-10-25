import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

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

export const PROFESSIONAL_EMAIL_TAKEN_MESSAGE = 'Ya existe una cuenta de usuario con ese correo.';

// 409 del alta con create_login_account: el correo ya tiene un app_user (se marca en el input).
export function isProfessionalEmailTaken(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 409
    && !!problemDetail(err)?.includes('app user with email');
}

// POST /tenants/professionals, PATCH /tenants/professionals/:id
export function professionalSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    const base = baseProfessionalsMessage(err);
    if (base) return base;

    if (err.status === 400 || err.status === 422) {
      const detail = problemDetail(err);
      if (detail?.includes('Email is required')) {
        return 'Para crear una cuenta de acceso, el correo es obligatorio.';
      }
      if (detail?.includes('Cannot combine')) {
        return 'No podés vincular un usuario existente y crear una cuenta nueva al mismo tiempo.';
      }
      return validationErrorMessage(err) ?? 'No se pudo guardar el profesional: uno de los datos no es válido.';
    }

    if (err.status === 409) {
      if (isProfessionalEmailTaken(err)) return PROFESSIONAL_EMAIL_TAKEN_MESSAGE;
      return 'Ese usuario ya está vinculado a otro profesional.';
    }

    const detail = problemDetail(err);
    return detail ? translateServerMessage(detail) : 'No se pudo guardar el profesional.';
  }
  return 'No se pudo guardar el profesional.';
}
