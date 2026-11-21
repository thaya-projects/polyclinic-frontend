import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

function backendText(err: HttpErrorResponse): string | null {
  const raw = err.error?.detail ?? err.error?.message;
  return typeof raw === 'string' && raw ? translateServerMessage(raw) : null;
}

function baseStockMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'No tenés permiso para gestionar el stock.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/stock/summary
export function stockSummaryErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseStockMessage(err) ?? backendText(err) ?? 'No se pudo cargar el stock.';
  }
  return 'No se pudo cargar el stock.';
}

// POST /tenants/stock/movements
export function stockMovementSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo registrar el movimiento: uno de los datos no es válido.';
    }
    if (err.status === 409) return 'No hay stock suficiente para esta operación.';
    return baseStockMessage(err) ?? backendText(err) ?? 'No se pudo registrar el movimiento.';
  }
  return 'No se pudo registrar el movimiento.';
}

// POST /tenants/stock/transfer
export function stockTransferErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo transferir el stock: uno de los datos no es válido.';
    }
    if (err.status === 409) return 'No hay stock suficiente en la sucursal de origen para esta transferencia.';
    return baseStockMessage(err) ?? backendText(err) ?? 'No se pudo transferir el stock.';
  }
  return 'No se pudo transferir el stock.';
}
