import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { MOCK_MEASUREMENT_TYPES, MockMeasurementsRepository } from './measurements-mock.repository';
import { MOCK_CURRENT_USER_ID, MockEncountersRepository } from './encounters-mock.repository';
import { MockClinicalBackend } from './mock-clinical-backend';
import { ENCOUNTERS_REPOSITORY } from '../core/services/encounters-repository';
import { MEASUREMENTS_REPOSITORY } from '../core/services/measurements-repository';
import { CreateMeasurementDto } from '../core/models/measurement.model';

async function failure(obs: Observable<unknown>): Promise<{ status: number; detail: string }> {
  try {
    await firstValueFrom(obs);
  } catch (err) {
    const e = err as HttpErrorResponse;
    return { status: e.status, detail: e.error?.detail };
  }
  throw new Error('se esperaba un error');
}

const NOW_ISO_OFFSET = () => new Date(Date.now() - 60_000).toISOString().replace('Z', '+00:00');

// Fidelidad del mock al contrato del backend (mensajes, status y orden de validación).
describe('MockMeasurementsRepository', () => {
  let repo: MockMeasurementsRepository;
  let encounters: MockEncountersRepository;
  let backend: MockClinicalBackend;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: MEASUREMENTS_REPOSITORY, useClass: MockMeasurementsRepository },
      ],
    });
    repo = TestBed.inject(MEASUREMENTS_REPOSITORY) as MockMeasurementsRepository;
    encounters = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    backend = TestBed.inject(MockClinicalBackend);
  });

  const create = (dto: Partial<CreateMeasurementDto>, patientId = 'pat-1') =>
    repo.create(patientId, { type: 'weight', value: 70, ...dto } as CreateMeasurementDto);

  describe('list', () => {
    it('ordena por measured_at desc y pagina (PagedResult)', async () => {
      const page1 = await firstValueFrom(repo.list('pat-1', { page: 1, limit: 3 }));
      expect(page1.total_count).toBe(5);
      expect(page1.total_pages).toBe(2);
      expect(page1.items.map(m => m.id)).toEqual(['ms-3', 'ms-2', 'ms-1']);
      const page2 = await firstValueFrom(repo.list('pat-1', { page: 2, limit: 3 }));
      expect(page2.items.map(m => m.id)).toEqual(['ms-5', 'ms-4']);
    });

    it('filtra por type, encounter_id y rango de fechas', async () => {
      expect((await firstValueFrom(repo.list('pat-1', { type: 'weight', page: 1, limit: 10 }))).items.map(m => m.id))
        .toEqual(['ms-1']);
      expect((await firstValueFrom(repo.list('pat-1', { encounter_id: 'enc-1', page: 1, limit: 10 }))).items.map(m => m.id))
        .toEqual(['ms-2', 'ms-1']);
      const ranged = await firstValueFrom(repo.list('pat-1', {
        from: '2026-10-05T00:00:00Z', to: '2026-10-10T23:59:59Z', page: 1, limit: 10,
      }));
      expect(ranged.items.map(m => m.id)).toEqual(['ms-2', 'ms-1', 'ms-5']);
    });

    it('403 sin profesional activo ni clinical.void; con clinical.void lee', async () => {
      encounters.setCurrentUser('nadie');
      expect((await failure(repo.list('pat-1', { page: 1, limit: 10 }))).status).toBe(403);
      encounters.setCurrentUser('nadie', ['clinical.void']);
      expect((await firstValueFrom(repo.list('pat-1', { page: 1, limit: 10 }))).total_count).toBe(5);
    });

    it('paciente inexistente (u otro tenant) → 404 "Patient with id …"', async () => {
      expect(await failure(repo.list('pat-x', { page: 1, limit: 10 })))
        .toEqual({ status: 404, detail: "Patient with id 'pat-x' was not found." });
    });

    it('type se normaliza (trim + minúsculas) y con formato inválido → 422', async () => {
      expect((await firstValueFrom(repo.list('pat-1', { type: ' Weight ', page: 1, limit: 10 }))).items.map(m => m.id))
        .toEqual(['ms-1']);
      expect((await failure(repo.list('pat-1', { type: '1x', page: 1, limit: 10 }))).detail)
        .toMatch(/^type must start with a letter.*\(Parameter 'type'\)$/);
    });

    it('from/to: fecha sola → 422 (ParseFilter)', async () => {
      expect((await failure(repo.list('pat-1', { to: '2026-10-01', page: 1, limit: 10 }))).detail)
        .toBe("to must be an ISO 8601 date-time (date-only values are not accepted). (Parameter 'to')");
    });

    it('from/to: sin offset → 422; from > to → 422', async () => {
      expect((await failure(repo.list('pat-1', { from: '2026-10-01T00:00:00', page: 1, limit: 10 }))).detail)
        .toMatch(/^from must include a UTC offset/);
      expect(await failure(repo.list('pat-1', {
        from: '2026-10-10T00:00:00Z', to: '2026-10-01T00:00:00Z', page: 1, limit: 10,
      }))).toEqual({ status: 422, detail: "from cannot be later than to. (Parameter 'from')" });
    });

    it('empate de measured_at → id asc', async () => {
      await firstValueFrom(repo.create('pat-2', { type: 'spo2', value: 97, measured_at: '2026-10-08T10:40:00Z' }));
      const ids = (await firstValueFrom(repo.list('pat-2', { page: 1, limit: 10 }))).items.map(m => m.id);
      expect(ids).toEqual(['ms-100', 'ms-6']);
    });
  });

  it('listTypes devuelve el catálogo de tipos conocidos', async () => {
    const types = await firstValueFrom(repo.listTypes());
    expect(types.map(t => t.type)).toEqual([
      'weight', 'height', 'temperature', 'heart_rate', 'respiratory_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'glucose', 'bmi',
    ]);
    expect(types).toEqual(MOCK_MEASUREMENT_TYPES);
  });

  describe('create sin encounter', () => {
    it('cualquier profesional activo; sin unit usa la canónica; recorded_by sale de la sesión; encounter_version null', async () => {
      const created = await firstValueFrom(create({ measured_at: NOW_ISO_OFFSET() }));
      expect(created).toMatchObject({
        patient_id: 'pat-1', encounter_id: null, type: 'weight', value: 70, unit: 'kg',
        recorded_by: MOCK_CURRENT_USER_ID, note: null, encounter_version: null,
      });
      const list = await firstValueFrom(repo.list('pat-1', { page: 1, limit: 10 }));
      expect(list.total_count).toBe(6);
    });

    it('actor sin profesional: el 403 llega ANTES del 404 del encuentro', async () => {
      encounters.setCurrentUser('nadie', ['clinical.void']);
      expect((await failure(create({ encounter_id: 'enc-x' }))).status).toBe(403);
    });

    it('no profesional → 403; profesional inactivo → 422', async () => {
      encounters.setCurrentUser('nadie', ['clinical.void']);
      expect(await failure(create({}))).toEqual({
        status: 403, detail: 'Only a user linked to a professional of the tenant can record measurements.',
      });
      encounters.setCurrentUser(MOCK_CURRENT_USER_ID);
      encounters.setProfessionalActive('prof-1', false);
      expect(await failure(create({}))).toEqual({ status: 422, detail: "Professional with id 'prof-1' is inactive." });
    });

    it('paciente inexistente → 404 antes que el resto', async () => {
      expect((await failure(create({ value: -1 }, 'pat-x'))).status).toBe(404);
    });
  });

  describe('create con encounter_id', () => {
    it('del profesional del encounter, open y del mismo paciente: incrementa la version del encounter', async () => {
      const before = backend.encounter('enc-1')!.version;
      const created = await firstValueFrom(create({ encounter_id: 'enc-1' }));
      expect(created.encounter_id).toBe('enc-1');
      expect(created.encounter_version).toBe(before + 1);
      expect(backend.encounter('enc-1')!.version).toBe(before + 1);
      // Mismo estado que ve el mock de encounters.
      expect((await firstValueFrom(encounters.getById('enc-1'))).version).toBe(before + 1);
    });

    it('encounter inexistente → 404 "Encounter with id …"', async () => {
      expect(await failure(create({ encounter_id: 'enc-x' })))
        .toEqual({ status: 404, detail: "Encounter with id 'enc-x' was not found." });
    });

    it('no es su profesional → 403', async () => {
      expect(await failure(create({ encounter_id: 'enc-3' }))).toEqual({
        status: 403,
        detail: "Only the user linked to the encounter's professional can add measurements to encounter 'enc-3'.",
      });
    });

    it('encounter de otro paciente → 422', async () => {
      expect(await failure(create({ encounter_id: 'enc-2' }, 'pat-1'))).toEqual({
        status: 422, detail: "Encounter 'enc-2' does not belong to patient 'pat-1'.",
      });
    });

    it('encounter no open → 409', async () => {
      expect(await failure(create({ encounter_id: 'enc-2' }, 'pat-2')))
        .toEqual({ status: 409, detail: "Cannot add measurements to an encounter with status 'signed'." });
    });
  });

  describe('validación del body (422 con el sufijo "(Parameter \'x\')")', () => {
    it('tipo conocido: unidad incorrecta (antes que el rango) y valor fuera de rango', async () => {
      expect(await failure(create({ unit: 'lb', value: 900 }))).toEqual({
        status: 422, detail: "unit for type 'weight' must be 'kg' (or omitted). (Parameter 'unit')",
      });
      expect(await failure(create({ value: 900 }))).toEqual({
        status: 422, detail: "value for type 'weight' must be between 0.2 and 700 kg. (Parameter 'value')",
      });
      expect((await firstValueFrom(create({ value: 700 }))).value).toBe(700);
      expect((await firstValueFrom(create({ unit: 'KG' }))).unit).toBe('kg');
    });

    it('otros alias del catálogo (lpm, mm Hg, kg/m²) se guardan como la canónica', async () => {
      expect((await firstValueFrom(create({ type: 'heart_rate', value: 80, unit: 'LPM' }))).unit).toBe('bpm');
      expect((await firstValueFrom(create({ type: 'systolic_bp', value: 120, unit: 'mm Hg' }))).unit).toBe('mmHg');
      expect((await firstValueFrom(create({ type: 'bmi', value: 24, unit: 'kg/m²' }))).unit).toBe('kg/m2');
    });

    it('temperature acepta los alias "ºC" y "C" y guarda la canónica', async () => {
      expect((await firstValueFrom(create({ type: 'temperature', value: 37, unit: 'ºC' }))).unit).toBe('°C');
      expect((await firstValueFrom(create({ type: 'temperature', value: 37, unit: 'C' }))).unit).toBe('°C');
      expect((await failure(create({ type: 'temperature', value: 98, unit: 'F' }))).status).toBe(422);
    });

    it('rangos nuevos del catálogo', async () => {
      expect((await firstValueFrom(create({ type: 'spo2', value: 0 }))).value).toBe(0);
      expect((await firstValueFrom(create({ type: 'glucose', value: 3000 }))).value).toBe(3000);
      expect((await failure(create({ type: 'temperature', value: 46.5 }))).status).toBe(422);
    });

    it('value: requerido, ≤ 4 decimales y < 10^10', async () => {
      expect((await failure(create({ value: undefined }))).detail).toBe("value is required. (Parameter 'value')");
      expect((await failure(create({ value: 70.12345 }))).detail)
        .toBe("value cannot have more than 4 decimal places. (Parameter 'value')");
      expect((await failure(create({ type: 'steps', value: 1e10, unit: 'u' }))).detail)
        .toBe("value must be less than 10^10 in absolute value. (Parameter 'value')");
    });

    it('tipo libre: unit OBLIGATORIA y ≤ 20', async () => {
      expect(await failure(create({ type: 'steps', value: 1200 }))).toEqual({
        status: 422, detail: "unit is required for custom measurement types. (Parameter 'unit')",
      });
      expect((await failure(create({ type: 'steps', value: 1, unit: 'x'.repeat(21) }))).detail)
        .toBe("unit cannot exceed 20 characters. (Parameter 'unit')");
    });

    it('tipo libre con formato válido y unidad libre; formato inválido → 422; type se normaliza', async () => {
      const custom = await firstValueFrom(create({ type: 'waist_circumference', value: 90, unit: 'cm' }));
      expect(custom).toMatchObject({ type: 'waist_circumference', unit: 'cm' });
      expect((await failure(create({ type: '1abc' }))).detail).toMatch(/^type must start with a letter.*\(Parameter 'type'\)$/);
      expect((await firstValueFrom(create({ type: ' Weight ' }))).type).toBe('weight');
    });

    it('measured_at: sin offset, futura (> 5 min) o anterior a 1900 → 422', async () => {
      expect((await failure(create({ measured_at: '2026-10-01T10:00:00' }))).detail).toMatch(/^measured_at must include a UTC offset/);
      const future = new Date(Date.now() + 10 * 60_000).toISOString();
      expect((await failure(create({ measured_at: future }))).detail).toBe("measured_at cannot be in the future. (Parameter 'measured_at')");
      expect((await failure(create({ measured_at: '1899-12-31T00:00:00Z' }))).detail)
        .toBe("measured_at cannot be earlier than 1900-01-01. (Parameter 'measured_at')");
    });

    it('note > 1000 → 422', async () => {
      expect((await failure(create({ note: 'x'.repeat(1001) }))).detail)
        .toBe("note cannot exceed 1000 characters. (Parameter 'note')");
    });
  });
});
