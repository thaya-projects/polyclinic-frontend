export interface CountryOption {
  value: string;
  label: string;
  currency: string;
  timezone: string;
  locale: string;
}

// Fuente única para país + sugerencias regionales (moneda/timezone/locale) —
// la usan el filtro de tenants, el alta y el mock del servicio.
export const COUNTRIES: CountryOption[] = [
  { value: 'BO', label: 'Bolivia',   currency: 'BOB', timezone: 'America/La_Paz', locale: 'es-BO' },
  { value: 'PE', label: 'Perú',      currency: 'PEN', timezone: 'America/Lima', locale: 'es-PE' },
  { value: 'CO', label: 'Colombia',  currency: 'COP', timezone: 'America/Bogota', locale: 'es-CO' },
  { value: 'EC', label: 'Ecuador',   currency: 'USD', timezone: 'America/Guayaquil', locale: 'es-EC' },
  { value: 'CL', label: 'Chile',     currency: 'CLP', timezone: 'America/Santiago', locale: 'es-CL' },
  { value: 'AR', label: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', locale: 'es-AR' },
  { value: 'MX', label: 'México',    currency: 'MXN', timezone: 'America/Mexico_City', locale: 'es-MX' },
];

export function countryLabel(code: string): string {
  return COUNTRIES.find(c => c.value === code)?.label ?? code;
}
