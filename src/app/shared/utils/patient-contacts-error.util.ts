import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/patients/:id/contacts (401/404 según el ticket, más 400/422 de validación).
function baseContactsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El contacto o el paciente ya no existen.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/patients/:id/contacts
export function contactsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseContactsMessage(err) ?? 'No se pudieron cargar los contactos.';
  }
  return 'No se pudieron cargar los contactos.';
}

// POST/PATCH /tenants/patients/:id/contacts(/:contactId). 400/422: el campo y el motivo que
// informa el backend (ProblemDetails `detail`/`field`), nunca un "revisá los datos" genérico.
export function contactSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar el contacto: hay un dato inválido.';
    }
    return baseContactsMessage(err) ?? 'No se pudo guardar el contacto.';
  }
  return 'No se pudo guardar el contacto.';
}

// DELETE /tenants/patients/:id/contacts/:contactId
export function contactRemoveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    return baseContactsMessage(err) ?? 'No se pudo eliminar el contacto.';
  }
  return 'No se pudo eliminar el contacto.';
}
