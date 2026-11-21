import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

function backendText(err: HttpErrorResponse): string | null {
  const raw = err.error?.detail ?? err.error?.message;
  return typeof raw === 'string' && raw ? translateServerMessage(raw) : null;
}

function baseUnitsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'No tenés permiso para gestionar el catálogo de unidades de medida.';
  if (err.status === 404) return 'La unidad de medida ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/units-of-measure
export function unitsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseUnitsMessage(err) ?? backendText(err) ?? 'No se pudo cargar el catálogo de unidades de medida.';
  }
  return 'No se pudo cargar el catálogo de unidades de medida.';
}

// POST /tenants/units-of-measure, PATCH /tenants/units-of-measure/:id (alta/edición)
export function unitSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar la unidad: uno de los datos no es válido.';
    }
    if (err.status === 409) return 'Ya existe una unidad de medida con ese código en tu clínica.';
    return baseUnitsMessage(err) ?? backendText(err) ?? 'No se pudo guardar la unidad de medida.';
  }
  return 'No se pudo guardar la unidad de medida.';
}

// PATCH /tenants/units-of-measure/:id (solo activar/desactivar)
export function unitStatusErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    return baseUnitsMessage(err) ?? backendText(err) ?? 'No se pudo actualizar el estado de la unidad.';
  }
  return 'No se pudo actualizar el estado de la unidad.';
}
