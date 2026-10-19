import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/notification-templates — 401/404/409 (unique tenant_id+
// channel+code)/422.
function baseTemplatesMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 404) return 'La plantilla ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

export function notificationTemplatesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseTemplatesMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar las plantillas.');
  }
  return 'No se pudieron cargar las plantillas.';
}

// POST/PATCH — 409 significa que ya existe una plantilla con ese mismo
// canal+código para la clínica (unique(tenant_id, channel, code)).
export function notificationTemplateSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return 'Ya existe una plantilla con ese código para este canal.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return baseTemplatesMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar la plantilla.');
  }
  return 'No se pudo guardar la plantilla.';
}
