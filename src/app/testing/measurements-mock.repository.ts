import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import type { MeasurementsRepository } from '../core/services/measurements-repository';
import { PagedResult } from '../core/models/paged-result.model';
import {
  CUSTOM_MEASUREMENT_TYPE_PATTERN, CreateMeasurementDto, CreatedMeasurement, MEASUREMENT_LIMITS, Measurement, MeasurementType,
  MeasurementsQuery,
} from '../core/models/measurement.model';
import { MOCK_CURRENT_USER_ID, injectClinicalBackend } from './mock-clinical-backend';
import { argumentError } from './cie10-mock.catalog';
import { compareMeasurements, decimalPlaces } from '../feature/measurements/measurement-format.util';

// Catálogo de tipos conocidos (MeasurementType.Known del backend): unidad canónica y rango inclusive.
// Es el ÚNICO lugar del frontend con rangos: la UI los recibe de GET /tenants/measurement-types.
export const MOCK_MEASUREMENT_TYPES: MeasurementType[] = [
  { type: 'weight', unit: 'kg', min: 0.2, max: 700 },
  { type: 'height', unit: 'cm', min: 20, max: 280 },
  { type: 'temperature', unit: '°C', min: 10, max: 46 },
  { type: 'heart_rate', unit: 'bpm', min: 0, max: 350 },
  { type: 'respiratory_rate', unit: 'rpm', min: 0, max: 100 },
  { type: 'systolic_bp', unit: 'mmHg', min: 20, max: 350 },
  { type: 'diastolic_bp', unit: 'mmHg', min: 10, max: 250 },
  { type: 'spo2', unit: '%', min: 0, max: 100 },
  { type: 'glucose', unit: 'mg/dL', min: 10, max: 3000 },
  { type: 'bmi', unit: 'kg/m2', min: 5, max: 150 },
];

// Alias de unidad que el backend acepta sin distinguir mayúsculas (MeasurementTypeDefinition.Aliases)
// y guarda como la canónica. No viajan en GET /measurement-types: la UI siempre manda la canónica.
const UNIT_ALIASES: Record<string, string[]> = {
  temperature: ['ºC', 'C'],
  heart_rate: ['lpm'],
  systolic_bp: ['mm Hg'],
  diastolic_bp: ['mm Hg'],
  bmi: ['kg/m²'],
};

// ClinicalInstantGuard.ParseFilter: fecha + hora (sin fecha sola) y offset "Z" / "±hh:mm".
const FILTER_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?(Z|[+-]\d{2}:\d{2})?$/;
const FILTER_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

const TYPE_FORMAT_MESSAGE =
  "type must start with a letter and contain only lowercase letters, digits or '_' (2-50 characters).";

function seed(): Measurement[] {
  const base = { recorded_by: MOCK_CURRENT_USER_ID, note: null };
  return [
    { ...base, id: 'ms-1', patient_id: 'pat-1', encounter_id: 'enc-1', type: 'weight', value: 68.5, unit: 'kg',
      measured_at: '2026-10-10T14:10:00Z' },
    { ...base, id: 'ms-2', patient_id: 'pat-1', encounter_id: 'enc-1', type: 'heart_rate', value: 72, unit: 'bpm',
      measured_at: '2026-10-10T14:12:00Z' },
    { ...base, id: 'ms-3', patient_id: 'pat-1', encounter_id: null, type: 'temperature', value: 37.8, unit: '°C',
      measured_at: '2026-10-12T08:30:00Z', note: 'Control en domicilio' },
    { ...base, id: 'ms-4', patient_id: 'pat-1', encounter_id: null, type: 'waist_circumference', value: 84, unit: 'cm',
      measured_at: '2026-09-28T09:00:00Z' },
    { ...base, id: 'ms-5', patient_id: 'pat-1', encounter_id: 'enc-3', type: 'systolic_bp', value: 130, unit: 'mmHg',
      measured_at: '2026-10-05T09:10:00Z', recorded_by: 'mock-user-2' },
    { ...base, id: 'ms-6', patient_id: 'pat-2', encounter_id: 'enc-2', type: 'weight', value: 81, unit: 'kg',
      measured_at: '2026-10-08T10:40:00Z' },
  ];
}

const OFFSET_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;
const MAX_CLOCK_SKEW_MS = MEASUREMENT_LIMITS.futureToleranceMinutes * 60_000;
const MIN_INSTANT = Date.UTC(MEASUREMENT_LIMITS.minYear, 0, 1);

function httpError(status: number, detail: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
}

// Fase 4 T3: signos vitales en memoria para demo y tests (NO providedIn root: se provee a mano con
// { provide: MEASUREMENTS_REPOSITORY, useClass: MockMeasurementsRepository }). Comparte estado con
// MockEncountersRepository a través de MockClinicalBackend (sesión, profesionales, pacientes y
// encounters: la version de un encounter sube con cada medición asociada). Imita mensajes (en
// inglés, como el ProblemDetails real) y ORDEN de validación del backend:
//   list: 403 (ni profesional activo ni clinical.void) → 404 paciente → type (se normaliza: trim +
//         minúsculas; formato inválido 422) → from/to (fecha sola, sin offset o inválida 422;
//         from > to 422); filtros
//         type/encounter_id/from/to (inclusive); orden measured_at desc, id asc; PagedResult.
//   create: 404 paciente → actor sin profesional activo del tenant (no vinculado 403, inactivo 422)
//           — ANTES del 404 del encounter → 404 encounter (si viene) → con encounter: no es su
//           profesional (403) → encounter de otro paciente (422) → encounter no open (409) →
//           type (422) → unit (422, antes que el rango; tipo libre: obligatoria y ≤ 20) → value:
//           requerido, ≤ 4 decimales, < 10^10, rango del catálogo (422) → measured_at (422) → note (422).
//   Las ArgumentException llevan el sufijo " (Parameter 'x')" (argumentError).
//   Tipo conocido: unit vacía → la canónica; la canónica o un alias, sin distinguir mayúsculas
//   (temperature "ºC"/"C", heart_rate "lpm", mmHg "mm Hg", bmi "kg/m²") → se guarda la canónica;
//   otra → 422.
// Sin delays (los tests no necesitan timers falsos).
@Injectable()
export class MockMeasurementsRepository implements MeasurementsRepository {
  private readonly backend = injectClinicalBackend();
  private measurements: Measurement[] = seed();
  private nextId = 100;

  listTypes(): Observable<MeasurementType[]> {
    return of(MOCK_MEASUREMENT_TYPES.map(t => ({ ...t })));
  }

  list(patientId: string, query: MeasurementsQuery): Observable<PagedResult<Measurement>> {
    if (!this.backend.canReadClinical()) return httpError(403, 'Forbidden.');
    if (!this.backend.patientExists(patientId)) return httpError(404, `Patient with id '${patientId}' was not found.`);
    const type = query.type?.trim() ? query.type.trim().toLowerCase() : null;
    if (type && !CUSTOM_MEASUREMENT_TYPE_PATTERN.test(type)) return argumentError(TYPE_FORMAT_MESSAGE, 'type');
    for (const field of ['from', 'to'] as const) {
      const value = query[field]?.trim();
      if (!value) continue;
      if (!FILTER_DATETIME.test(value)) {
        return argumentError(`${field} must be an ISO 8601 date-time (date-only values are not accepted).`, field);
      }
      if (!FILTER_OFFSET.test(value)) {
        return argumentError(`${field} must include a UTC offset (e.g. '2026-01-01T10:00:00Z' or '...-04:00').`, field);
      }
      if (Number.isNaN(Date.parse(value))) return argumentError(`${field} is not a valid date-time.`, field);
    }
    const from = query.from ? Date.parse(query.from) : null;
    const to = query.to ? Date.parse(query.to) : null;
    if (from !== null && to !== null && from > to) return argumentError('from cannot be later than to.', 'from');
    const filtered = this.measurements
      .filter(m => m.patient_id === patientId)
      .filter(m => !type || m.type === type)
      .filter(m => !query.encounter_id || m.encounter_id === query.encounter_id)
      .filter(m => from === null || Date.parse(m.measured_at) >= from)
      .filter(m => to === null || Date.parse(m.measured_at) <= to)
      .sort(compareMeasurements);
    const start = (query.page - 1) * query.limit;
    return of({
      items: filtered.slice(start, start + query.limit).map(m => ({ ...m })),
      total_count: filtered.length,
      current_page: query.page,
      page_size: query.limit,
      total_pages: Math.ceil(filtered.length / query.limit),
    });
  }

  create(patientId: string, dto: CreateMeasurementDto): Observable<CreatedMeasurement> {
    if (!this.backend.patientExists(patientId)) return httpError(404, `Patient with id '${patientId}' was not found.`);

    // El actor tiene que ser profesional activo del tenant, haya o no encounter (antes de buscarlo).
    const linked = this.backend.linkedProfessional();
    if (!linked) return httpError(403, 'Only a user linked to a professional of the tenant can record measurements.');
    if (!linked.active) return httpError(422, `Professional with id '${linked.id}' is inactive.`);

    const encounterId = dto?.encounter_id || null;
    const encounter = encounterId ? this.backend.encounter(encounterId) : undefined;
    if (encounterId && !encounter) return httpError(404, `Encounter with id '${encounterId}' was not found.`);
    if (encounter) {
      const professional = this.backend.professionalById(encounter.professional_id);
      if (!professional?.user_id || professional.user_id !== this.backend.userId) {
        return httpError(403,
          `Only the user linked to the encounter's professional can add measurements to encounter '${encounter.id}'.`);
      }
      if (!professional.active) return httpError(422, `Professional with id '${professional.id}' is inactive.`);
      if (encounter.patient_id !== patientId) {
        return httpError(422, `Encounter '${encounter.id}' does not belong to patient '${patientId}'.`);
      }
      if (encounter.status !== 'open') {
        return httpError(409, `Cannot add measurements to an encounter with status '${encounter.status}'.`);
      }
    }

    const rawType = (dto?.type ?? '').trim();
    if (!rawType) return argumentError('type is required.', 'type');
    const type = rawType.toLowerCase();
    if (!CUSTOM_MEASUREMENT_TYPE_PATTERN.test(type)) return argumentError(TYPE_FORMAT_MESSAGE, 'type');
    const known = MOCK_MEASUREMENT_TYPES.find(t => t.type === type);
    let unit = dto?.unit?.trim() || null;
    if (known) {
      const accepted = [known.unit, ...(UNIT_ALIASES[type] ?? [])].map(u => u.toLowerCase());
      if (unit !== null && !accepted.includes(unit.toLowerCase())) {
        return argumentError(`unit for type '${type}' must be '${known.unit}' (or omitted).`, 'unit');
      }
      unit = known.unit;
    } else {
      if (unit === null) return argumentError('unit is required for custom measurement types.', 'unit');
      if (unit.length > MEASUREMENT_LIMITS.unit) {
        return argumentError(`unit cannot exceed ${MEASUREMENT_LIMITS.unit} characters.`, 'unit');
      }
      if (unit.includes('\0')) return argumentError('unit cannot contain the null character (U+0000).', 'unit');
    }
    const value = dto?.value;
    if (typeof value !== 'number' || !Number.isFinite(value)) return argumentError('value is required.', 'value');
    if (decimalPlaces(value) > MEASUREMENT_LIMITS.decimals) {
      return argumentError(`value cannot have more than ${MEASUREMENT_LIMITS.decimals} decimal places.`, 'value');
    }
    if (Math.abs(value) >= MEASUREMENT_LIMITS.maxAbsoluteValue) {
      return argumentError('value must be less than 10^10 in absolute value.', 'value');
    }
    if (known && (value < known.min || value > known.max)) {
      return argumentError(
        `value for type '${type}' must be between ${known.min} and ${known.max} ${known.unit}.`, 'value');
    }

    let measuredAt = new Date().toISOString();
    if (dto?.measured_at) {
      if (!OFFSET_SUFFIX.test(dto.measured_at.trim())) {
        return argumentError("measured_at must include a UTC offset (e.g. '2026-01-01T10:00:00Z' or '...-04:00').", 'measured_at');
      }
      const instant = Date.parse(dto.measured_at);
      if (Number.isNaN(instant)) return argumentError('measured_at is required.', 'measured_at');
      if (instant < MIN_INSTANT) return argumentError('measured_at cannot be earlier than 1900-01-01.', 'measured_at');
      if (instant > Date.now() + MAX_CLOCK_SKEW_MS) return argumentError('measured_at cannot be in the future.', 'measured_at');
      measuredAt = new Date(instant).toISOString();
    }

    const note = dto?.note?.trim() || null;
    if (note && note.length > MEASUREMENT_LIMITS.note) {
      return argumentError(`note cannot exceed ${MEASUREMENT_LIMITS.note} characters.`, 'note');
    }
    if (note?.includes('\0')) return argumentError('note cannot contain the null character (U+0000).', 'note');

    const measurement: Measurement = {
      id: `ms-${this.nextId++}`,
      patient_id: patientId,
      encounter_id: encounter?.id ?? null,
      type,
      value,
      unit,
      measured_at: measuredAt,
      recorded_by: this.backend.userId,
      note,
    };
    this.measurements = [...this.measurements, measurement];
    const encounterVersion = encounter ? this.backend.bumpEncounterVersion(encounter.id) : null;
    return of({ ...measurement, encounter_version: encounterVersion });
  }
}
