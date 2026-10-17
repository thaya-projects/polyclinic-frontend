import { FALLBACK_LOCALE } from '../../core/services/tenant-locale.service';
import { Prescription } from '../../core/models/prescription.model';

// Fecha y hora local de emisión con el locale del tenant.
export function formatIssuedAt(iso: string | null | undefined, locale: string = FALLBACK_LOCALE): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function byId(a: Prescription, b: Prescription): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Recetas de un encuentro: issued_at asc (empate: id asc), como el backend.
export function comparePrescriptionsAsc(a: Prescription, b: Prescription): number {
  return Date.parse(a.issued_at) - Date.parse(b.issued_at) || byId(a, b);
}

// Recetas del paciente: issued_at desc (empate: id asc), como el backend.
export function comparePrescriptionsDesc(a: Prescription, b: Prescription): number {
  return Date.parse(b.issued_at) - Date.parse(a.issued_at) || byId(a, b);
}
