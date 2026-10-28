// Países para los teléfonos (WhatsApp/SMS): el backend guarda E.164 (+<código><número>), así que
// el form arma el número a partir del país elegido + el número local. min/max = dígitos del número
// nacional (sin el código de país), para validar antes de enviar.
export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  min: number;
  max: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴', min: 8, max: 8 },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷', min: 10, max: 11 },
  { iso: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷', min: 10, max: 11 },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱', min: 9, max: 9 },
  { iso: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴', min: 10, max: 10 },
  { iso: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷', min: 8, max: 8 },
  { iso: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨', min: 8, max: 9 },
  { iso: 'SV', name: 'El Salvador', dial: '503', flag: '🇸🇻', min: 8, max: 8 },
  { iso: 'ES', name: 'España', dial: '34', flag: '🇪🇸', min: 9, max: 9 },
  { iso: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸', min: 10, max: 10 },
  { iso: 'GT', name: 'Guatemala', dial: '502', flag: '🇬🇹', min: 8, max: 8 },
  { iso: 'HN', name: 'Honduras', dial: '504', flag: '🇭🇳', min: 8, max: 8 },
  { iso: 'MX', name: 'México', dial: '52', flag: '🇲🇽', min: 10, max: 10 },
  { iso: 'NI', name: 'Nicaragua', dial: '505', flag: '🇳🇮', min: 8, max: 8 },
  { iso: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦', min: 7, max: 8 },
  { iso: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾', min: 9, max: 9 },
  { iso: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪', min: 9, max: 9 },
  { iso: 'DO', name: 'República Dominicana', dial: '1', flag: '🇩🇴', min: 10, max: 10 },
  { iso: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾', min: 8, max: 9 },
  { iso: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪', min: 10, max: 10 },
];

export const DEFAULT_PHONE_COUNTRY = 'BO';

export function phoneCountryByIso(iso: string | null | undefined): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.iso === iso?.toUpperCase()) ??
    PHONE_COUNTRIES.find((c) => c.iso === DEFAULT_PHONE_COUNTRY)!
  );
}

// "+59171234567" -> { country: BO, national: "71234567" }. Prefijo más largo que coincida; ante
// códigos compartidos (+1) gana `preferredIso` si comparte el código. null si no es E.164.
export function splitE164(
  value: string | null | undefined,
  preferredIso?: string | null,
): { country: PhoneCountry; national: string } | null {
  const digits = value?.replace(/[\s\-.()]/g, '') ?? '';
  if (!/^\+\d+$/.test(digits)) return null;
  const rest = digits.slice(1);
  const preferred = phoneCountryByIso(preferredIso);
  const matches = PHONE_COUNTRIES.filter((c) => rest.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length || (a.iso === preferred.iso ? -1 : b.iso === preferred.iso ? 1 : 0),
  );
  const country = matches[0];
  return country ? { country, national: rest.slice(country.dial.length) } : null;
}
