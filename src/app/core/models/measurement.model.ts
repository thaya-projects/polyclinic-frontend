// Fase 4 T3/T4: signos vitales / mediciones del paciente. Espeja MeasurementDTO (snake_case) de
// /tenants/patients/:patientId/measurements. tenant_id no viaja nunca; recorded_by (app_user) lo
// resuelve el backend desde el token: el frontend jamás lo manda en un body.
export interface Measurement {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  type: string;
  value: number;
  unit: string | null;
  measured_at: string;
  recorded_by: string | null;
  note: string | null;
}

// POST → 201 MeasurementDTO + encounter_version. Si la medición va asociada a un encounter, su
// version se incrementa y viaja acá (el detalle la aplica en memoria, igual que con diagnósticos);
// sin encounter, null.
export type CreatedMeasurement = Measurement & { encounter_version: number | null };

// Body del POST. Ausente/null en unit = la canónica del tipo conocido. measured_at ISO CON offset
// (ausente = ahora en el server). Nunca tenant_id ni recorded_by.
export interface CreateMeasurementDto {
  type: string;
  value: number;
  unit?: string | null;
  measured_at?: string | null;
  encounter_id?: string | null;
  note?: string | null;
}

// GET /tenants/patients/:patientId/measurements?type=&encounter_id=&from=&to=&page=&limit=
// (PagedResult, ordenado por measured_at desc y, ante empate, id asc). from/to inclusive, instantes
// ISO con offset o Z (sin offset → 422; MeasurementsApi completa el offset local si falta);
// from > to → 422. type se normaliza (trim + minúsculas) y se valida igual que en el alta.
export interface MeasurementsQuery {
  type?: string;
  encounter_id?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

// Ítem de GET /tenants/measurement-types: catálogo de tipos conocidos con su unidad canónica y
// rango permitido (inclusive).
export interface MeasurementType {
  type: string;
  unit: string;
  min: number;
  max: number;
}

// Tipos libres (no catalogados): minúsculas, dígitos y guion bajo, empieza con letra, 2..50.
export const CUSTOM_MEASUREMENT_TYPE_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

export const MEASUREMENT_LIMITS = {
  note: 1000,
  // ClinicalMeasurement: unidad libre ≤ 20; valor con ≤ 4 decimales y |valor| < 10^10.
  unit: 20,
  decimals: 4,
  maxAbsoluteValue: 10_000_000_000,
  // measured_at: no más de 5 minutos en el futuro ni anterior a 1900.
  futureToleranceMinutes: 5,
  minYear: 1900,
} as const;

// Etiquetas en español de los tipos conocidos. Un tipo libre se muestra con su código.
export const MEASUREMENT_TYPE_LABEL: Record<string, string> = {
  weight: 'Peso',
  height: 'Talla',
  temperature: 'Temperatura',
  heart_rate: 'Frecuencia cardíaca',
  respiratory_rate: 'Frecuencia respiratoria',
  systolic_bp: 'Presión sistólica',
  diastolic_bp: 'Presión diastólica',
  spo2: 'Saturación de O₂',
  glucose: 'Glucemia',
  bmi: 'IMC',
};

export function measurementTypeLabel(type: string): string {
  return MEASUREMENT_TYPE_LABEL[type] ?? type;
}

// Número con el locale del tenant (hasta 4 decimales, los que guarda el backend). Lo usan el
// listado, el rango del formulario y los mensajes traducidos del 422 (mismo formato en todos).
export function formatMeasurementValue(value: number, locale = 'es'): string {
  return value.toLocaleString(locale, { maximumFractionDigits: MEASUREMENT_LIMITS.decimals });
}

// "0,2 – 700 kg" (rango del catálogo).
export function formatMeasurementRange(min: number, max: number, unit: string, locale = 'es'): string {
  return `${formatMeasurementValue(min, locale)} – ${formatMeasurementValue(max, locale)} ${unit}`.trim();
}
