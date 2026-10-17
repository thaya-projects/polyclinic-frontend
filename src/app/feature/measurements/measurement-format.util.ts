import { MEASUREMENT_LIMITS, Measurement } from '../../core/models/measurement.model';
export { formatMeasurementRange, formatMeasurementValue } from '../../core/models/measurement.model';
import { FALLBACK_LOCALE } from '../../core/services/tenant-locale.service';
export * from '../../shared/utils/local-datetime.util';

// Límite inferior de measured_at en el backend (ClinicalInstantGuard.MinInstant): 1900-01-01 UTC.
export const MIN_MEASURED_AT_MS = Date.UTC(MEASUREMENT_LIMITS.minYear, 0, 1);
// Margen de reloj hacia el futuro que tolera el backend.
export const MAX_CLOCK_SKEW_MS = MEASUREMENT_LIMITS.futureToleranceMinutes * 60_000;

// Decimales significativos de un número (70.5 → 1; 1e-7 → 7). El backend acepta hasta 4.
export function decimalPlaces(value: number): number {
  const text = String(value);
  const exp = /e-(\d+)$/.exec(text);
  if (exp) {
    const mantissa = text.split('e')[0];
    return Number(exp[1]) + (mantissa.includes('.') ? mantissa.split('.')[1].length : 0);
  }
  return text.includes('.') ? text.split('.')[1].length : 0;
}

// Fecha y hora local con el locale del tenant.
export function formatMeasuredAt(iso: string | null | undefined, locale: string = FALLBACK_LOCALE): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Mismo orden que el backend: measured_at desc y, ante empate, id asc.
export function compareMeasurements(a: Measurement, b: Measurement): number {
  const diff = Date.parse(b.measured_at) - Date.parse(a.measured_at);
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortMeasurements(list: Measurement[]): Measurement[] {
  return [...list].sort(compareMeasurements);
}
