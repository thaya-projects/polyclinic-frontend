import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/invoices(...) — 401/403 (feature invoicing apagado)/404/422
// según el ticket.
function baseInvoicesMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'La facturación no está habilitada para esta clínica.';
  if (err.status === 404) return 'La factura ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/invoices
export function invoicesListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseInvoicesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudieron cargar las facturas.');
  }
  return 'No se pudieron cargar las facturas.';
}

// GET /tenants/invoices/:id
export function invoiceDetailErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseInvoicesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudo cargar la factura.');
  }
  return 'No se pudo cargar la factura.';
}

// POST /tenants/invoices, PATCH /tenants/invoices/:id — 409 significa que
// la factura ya no está en borrador (no se puede editar).
export function invoiceSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'Esta factura ya no es un borrador — no se puede editar.';
    if (err.status === 400 || err.status === 422) return validationErrorMessage(err) ?? 'El servidor rechazó los datos de la factura.';
    return baseInvoicesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudo guardar la factura.');
  }
  return 'No se pudo guardar la factura.';
}

// POST /tenants/invoices/:id/issue
export function invoiceIssueErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'La factura ya no se puede emitir en su estado actual.';
    return baseInvoicesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudo emitir la factura.');
  }
  return 'No se pudo emitir la factura.';
}

// POST /tenants/invoices/:id/void
export function invoiceVoidErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    // El motivo concreto del backend (regla de negocio o campo) antes que el texto por status.
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 409) return 'La factura ya no se puede anular en su estado actual.';
    return baseInvoicesMessage(err) ?? (validationErrorMessage(err) ?? 'No se pudo anular la factura.');
  }
  return 'No se pudo anular la factura.';
}
