import { HttpErrorResponse } from '@angular/common/http';
import { specificErrorMessage, validationErrorMessage } from './http-error.util';
import { translateServerMessage } from './server-errors.util';

function backendText(err: HttpErrorResponse): string | null {
  const raw = err.error?.detail ?? err.error?.message;
  return typeof raw === 'string' && raw ? translateServerMessage(raw) : null;
}

function baseMaterialsMessage(err: HttpErrorResponse): string | null {
  if (err.status === 401) return 'Tu sesión expiró. Iniciá sesión de nuevo.';
  if (err.status === 403) return 'No tenés permiso para gestionar el inventario de materiales.';
  if (err.status === 404) return 'El material ya no existe.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  return null;
}

// GET /tenants/materials
export function materialsListErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return baseMaterialsMessage(err) ?? backendText(err) ?? 'No se pudo cargar el catálogo de materiales.';
  }
  return 'No se pudo cargar el catálogo de materiales.';
}

// POST /tenants/materials, PATCH /tenants/materials/:id (alta/edición)
export function materialSaveErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    if (err.status === 400 || err.status === 422) {
      return validationErrorMessage(err) ?? 'No se pudo guardar el material: uno de los datos no es válido.';
    }
    if (err.status === 409) return 'Ya existe un material con ese código en tu clínica.';
    return baseMaterialsMessage(err) ?? backendText(err) ?? 'No se pudo guardar el material.';
  }
  return 'No se pudo guardar el material.';
}

// PATCH /tenants/materials/:id (solo activar/desactivar)
export function materialStatusErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const specific = specificErrorMessage(err);
    if (specific) return specific;
    return baseMaterialsMessage(err) ?? backendText(err) ?? 'No se pudo actualizar el estado del material.';
  }
  return 'No se pudo actualizar el estado del material.';
}
