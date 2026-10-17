import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/invoices/:id/items(...) — 401/403/404/409 (factura ya no es
// borrador)/422 según el ticket.
function baseInvoiceItemsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'La facturación no está habilitada para esta clínica.';
  if (err.status === 404) return 'La factura (o el item) ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/invoices/:id/items
export function invoiceItemsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseInvoiceItemsMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar los items de la factura.');
  }
  return 'No se pudieron cargar los items de la factura.';
}

// POST/PATCH/DELETE .../items(/:itemId) — 409 significa que la factura
// ya no está en borrador (regla del schema: "no editar items").
export function invoiceItemSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return 'Esta factura ya no es un borrador — no se pueden editar sus items.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return baseInvoiceItemsMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo guardar el item.');
  }
  return 'No se pudo guardar el item.';
}
