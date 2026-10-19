import { HttpErrorResponse } from '@angular/common/http';

// T5: solo lectura (GET /tenants/inbound-messages) — 401/404.
export function inboundMessagesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
    if (err.status === 404) return 'No se encontró el recurso solicitado.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar los mensajes entrantes.';
  }
  return 'No se pudieron cargar los mensajes entrantes.';
}
