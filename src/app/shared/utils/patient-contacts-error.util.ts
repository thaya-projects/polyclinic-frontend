import { HttpErrorResponse } from '@angular/common/http';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/patients/:id/contacts (solo 401/404 según el ticket).
function baseContactsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'El contacto o el paciente ya no existen.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/patients/:id/contacts
export function contactsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseContactsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar los contactos.')
    );
  }
  return 'No se pudieron cargar los contactos.';
}

// POST/PATCH /tenants/patients/:id/contacts(/:contactId)
export function contactSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseContactsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar el contacto.')
    );
  }
  return 'No se pudo guardar el contacto.';
}

// DELETE /tenants/patients/:id/contacts/:contactId
export function contactRemoveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (
      baseContactsMessage(err) ??
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo eliminar el contacto.')
    );
  }
  return 'No se pudo eliminar el contacto.';
}
