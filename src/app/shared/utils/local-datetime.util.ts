// Fechas/horas LOCALES del navegador ↔ instantes ISO con offset (el backend rechaza instantes sin
// offset con 422). Sin dependencias de dominio: lo usan el formulario de mediciones y la capa HTTP.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Valor para <input type="datetime-local"> (hora LOCAL, sin zona): "YYYY-MM-DDTHH:mm".
export function toDatetimeLocalValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type LocalInputParse =
  | { ok: true; date: Date }
  | { ok: false; reason: 'invalid' | 'nonexistent' };

// Interpreta "YYYY-MM-DDTHH:mm[:ss]" como hora local (sin depender del parser de Date con strings).
// 'nonexistent': la hora cae en el salto del cambio de horario (DST) — Date la corre en silencio
// (ej. 00:30 → 01:30), así que se detecta comparando lo construido con lo pedido.
export function parseLocalInputDetailed(value: string): LocalInputParse {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return { ok: false, reason: 'invalid' };
  const [y, mo, d, h, mi, s] = match.slice(1).map(v => Number(v ?? 0));
  const date = new Date(y, mo - 1, d, h, mi, s);
  if (Number.isNaN(date.getTime())) return { ok: false, reason: 'invalid' };
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return { ok: false, reason: 'invalid' };
  if (date.getHours() !== h || date.getMinutes() !== mi) return { ok: false, reason: 'nonexistent' };
  return { ok: true, date };
}

export function parseLocalInput(value: string): Date | null {
  const parsed = parseLocalInputDetailed(value);
  return parsed.ok ? parsed.date : null;
}

// Offset de una fecha local como "+hh:mm" / "-hh:mm" (el del instante: respeta el horario de verano).
export function localOffset(date: Date): string {
  // Redondeado: zonas históricas (LMT) tienen offsets con segundos.
  const offsetMinutes = Math.round(-date.getTimezoneOffset());
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Para mostrar: "UTC−03:00" (signo menos tipográfico).
export function offsetLabel(date: Date): string {
  return `UTC${localOffset(date).replace('-', '−')}`;
}

// Date → ISO con el offset local, ej. "2026-10-17T09:30:00-03:00". El backend rechaza fechas sin
// offset (422).
export function toIsoWithOffset(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${localOffset(date)}`;
}

// "YYYY-MM-DDTHH:mm" (hora local del navegador) → ISO con offset local. null si es inválida o no existe.
export function localInputToIsoWithOffset(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseLocalInput(value);
  return date ? toIsoWithOffset(date) : null;
}

// Offset tal como lo exige el backend (ClinicalInstantGuard): "Z" o "±hh:mm".
const OFFSET_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?(Z|[+-]\d{2}:\d{2})$/;

// Instante para los filtros from/to. El backend exige fecha + hora con "Z" o "±hh:mm" (una fecha
// sola o sin offset → 422):
//   - ya en ese formato → se respeta;
//   - fecha/hora local ("YYYY-MM-DD" = 00:00 local, o "YYYY-MM-DDTHH:mm[:ss]") → con el offset local;
//   - otro formato que Date entienda (ej. "+0530") → el mismo instante con el offset local.
// null si no se puede interpretar (y entonces no se manda).
export function toOffsetInstant(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (ISO_DATETIME.test(trimmed)) return Number.isNaN(Date.parse(trimmed)) ? null : trimmed;
  if (!OFFSET_SUFFIX.test(trimmed) && /^\d{4}-\d{2}-\d{2}(T[\d:]+)?$/.test(trimmed)) {
    const local = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00` : trimmed;
    return localInputToIsoWithOffset(local);
  }
  const instant = Date.parse(trimmed);
  return Number.isNaN(instant) ? null : toIsoWithOffset(new Date(instant));
}
