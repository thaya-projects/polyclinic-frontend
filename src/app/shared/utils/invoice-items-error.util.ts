import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

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
    return baseInvoiceItemsMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudieron cargar los items de la factura.');
  }
  return 'No se pudieron cargar los items de la factura.';
}

// POST/PATCH/DELETE .../items(/:itemId) — 409 significa que la factura
// ya no está en borrador (regla del schema: "no editar items").
export function invoiceItemSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'Esta factura ya no es un borrador — no se pueden editar sus items.';
    if (err.status === 400 || err.status === 422) return validationErrorMessage(err) ?? 'El servidor rechazó los datos del item.';
    return baseInvoiceItemsMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudo guardar el item.');
  }
  return 'No se pudo guardar el item.';
}
