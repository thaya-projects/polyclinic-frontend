import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T4: todos los endpoints de reportes/auditoría son GET de solo lectura
// con el mismo set de códigos (401/403/422) — un solo util genérico en
// vez de 8 casi idénticos (a diferencia de otras fases, acá no hay
// semántica distinta por recurso: ningún 409/404 posible en un GET puro).
export function reportsErrorMessage(err: unknown, resourceLabel: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
    if (err.status === 403) return 'No tenés permiso para ver este reporte.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'Los filtros ingresados no son válidos.';
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return typeof err.error?.message === 'string' ? err.error.message : `No se pudo cargar ${resourceLabel}.`;
  }
  return `No se pudo cargar ${resourceLabel}.`;
}
