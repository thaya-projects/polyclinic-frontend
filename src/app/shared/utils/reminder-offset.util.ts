export type OffsetUnit = 'minutes' | 'hours' | 'days';
export type OffsetDirection = 'before' | 'after';

const UNIT_TO_MINUTES: Record<OffsetUnit, number> = { minutes: 1, hours: 60, days: 1440 };

export const OFFSET_UNITS: OffsetUnit[] = ['minutes', 'hours', 'days'];

export const OFFSET_UNIT_LABELS: Record<OffsetUnit, string> = {
  minutes: 'Minutos',
  hours: 'Horas',
  days: 'Días',
};

// Criterio de aceptación: "24 horas antes" se guarda como
// offset_minutes = -1440.
export function toOffsetMinutes(value: number, unit: OffsetUnit, direction: OffsetDirection): number {
  const magnitude = Math.round(value) * UNIT_TO_MINUTES[unit];
  return direction === 'before' ? -magnitude : magnitude;
}

// Conversión inversa para precargar el form al editar una regla ya
// existente — elige la unidad más grande que divide exacto al valor
// absoluto, para que "-1440" vuelva a mostrarse como "24 horas", no
// "1440 minutos".
export function fromOffsetMinutes(offsetMinutes: number): { value: number; unit: OffsetUnit; direction: OffsetDirection } {
  const direction: OffsetDirection = offsetMinutes < 0 ? 'before' : 'after';
  const magnitude = Math.abs(offsetMinutes);

  if (magnitude !== 0 && magnitude % UNIT_TO_MINUTES.days === 0) {
    return { value: magnitude / UNIT_TO_MINUTES.days, unit: 'days', direction };
  }
  if (magnitude !== 0 && magnitude % UNIT_TO_MINUTES.hours === 0) {
    return { value: magnitude / UNIT_TO_MINUTES.hours, unit: 'hours', direction };
  }
  return { value: magnitude, unit: 'minutes', direction };
}

export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'Al momento del evento';
  const { value, unit, direction } = fromOffsetMinutes(offsetMinutes);
  const unitLabel =
    unit === 'minutes' ? (value === 1 ? 'minuto' : 'minutos') : unit === 'hours' ? (value === 1 ? 'hora' : 'horas') : value === 1 ? 'día' : 'días';
  const directionLabel = direction === 'before' ? 'antes' : 'después';
  return `${value} ${unitLabel} ${directionLabel}`;
}
