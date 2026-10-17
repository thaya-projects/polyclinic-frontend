import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorMessage } from './http-error.util';

// T5: mensajes específicos para los códigos que puede devolver
// /tenants/invoices/:id/payments — 401/403/404/409 (monto mayor al
// saldo, o factura no está en emitida/parcial)/422 según el ticket.
function basePaymentsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'La facturación no está habilitada para esta clínica.';
  if (err.status === 404) return 'La factura ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/invoices/:id/payments
export function paymentsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return basePaymentsMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudieron cargar los pagos.');
  }
  return 'No se pudieron cargar los pagos.';
}

// POST /tenants/invoices/:id/payments — 409 significa que el monto supera
// el saldo pendiente (la validación de cliente ya lo evita en el caso
// normal; esto cubre una condición de carrera con el saldo real).
export function paymentSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return 'El monto supera el saldo pendiente de la factura.';
    if (err.status === 422) return validationErrorMessage(err) ?? 'Revisá los datos ingresados e intentá de nuevo.';
    return basePaymentsMessage(err) ?? (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo registrar el pago.');
  }
  return 'No se pudo registrar el pago.';
}
