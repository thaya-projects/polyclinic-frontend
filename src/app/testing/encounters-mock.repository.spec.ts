import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MockEncountersRepository } from './encounters-mock.repository';
import { MockCie10Catalog } from './cie10-mock.catalog';
import { VoidEncounterDto } from '../core/models/encounter.model';

async function errorOf(p: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await p;
  } catch (err) {
    return err as HttpErrorResponse;
  }
  throw new Error('se esperaba un error');
}

// El mock debe imitar el contrato final del backend (lo usan las pantallas en demo y tests).
describe('MockEncountersRepository', () => {
  let repo: MockEncountersRepository;

  beforeEach(() => (repo = new MockEncountersRepository()));

  it('el listado devuelve el resumen (sin anamnesis/exam/clinical_data)', async () => {
    const page = await firstValueFrom(repo.list({ page: 1, limit: 10 }));
    expect(Object.keys(page.items[0]).sort()).toEqual([
      'appointment_id', 'chief_complaint', 'created_at', 'encounter_date', 'id', 'patient_id', 'professional_id',
      'signed_at', 'specialty_id', 'status', 'version', 'voided_at',
    ]);
  });

  it('lecturas: 403 sin profesional activo ni clinical.void', async () => {
    repo.setCurrentUser('nadie');
    expect((await errorOf(firstValueFrom(repo.list({ page: 1, limit: 10 })))).status).toBe(403);
    expect((await errorOf(firstValueFrom(repo.getById('enc-1')))).status).toBe(403);
  });

  it('void: un usuario no autorizado recibe 403 aunque mande el body vacío', async () => {
    repo.setCurrentUser('nadie');
    const err = await errorOf(firstValueFrom(repo.void('enc-1', {} as VoidEncounterDto)));
    expect(err.status).toBe(403);
  });

  it('void administrativo (clinical.void): anula el encounter de otro profesional, aunque esté inactivo', async () => {
    repo.setCurrentUser('admin', ['clinical.void']);
    repo.setProfessionalActive('prof-2', false);
    const voided = await firstValueFrom(repo.void('enc-3', { reason: 'Error de carga', version: 1 }));
    expect(voided.status).toBe('voided');
    expect(voided.voided_by).toBe('admin');
  });

  it('alta con especialidad inactiva → 422', async () => {
    const err = await errorOf(firstValueFrom(repo.create({
      patient_id: 'pat-1', clinical_record_id: 'cr-pat-1', professional_id: 'prof-1', specialty_id: 'spec-2',
    })));
    expect(err.status).toBe(422);
    expect(err.error.detail).toContain('specialties are inactive');
  });
});

describe('MockEncountersRepository: diagnósticos', () => {
  let repo: MockEncountersRepository;

  beforeEach(() => (repo = new MockEncountersRepository()));

  it('cie10_code sin description: completa la description desde el catálogo e incrementa la version', async () => {
    const created = await firstValueFrom(repo.createDiagnosis('enc-1', { cie10_code: ' j06.9 ' }));
    expect(created.cie10_code).toBe('J06.9');
    expect(created.description).toBe('Infección aguda de las vías respiratorias superiores, no especificada');
    expect(created.is_definitive).toBe(false);
    expect(created.encounter_version).toBe(2);
    expect((await firstValueFrom(repo.getById('enc-1'))).version).toBe(2);
    const { encounter_version: _v, ...diagnosis } = created;
    expect(await firstValueFrom(repo.listDiagnoses('enc-1'))).toContainEqual(diagnosis);
  });

  it('delete: 200 con la version nueva del encounter', async () => {
    expect(await firstValueFrom(repo.deleteDiagnosis('enc-1', 'dx-1'))).toEqual({ encounter_version: 2 });
    expect(await firstValueFrom(repo.listDiagnoses('enc-1'))).toEqual([]);
  });

  it('validaciones 422 con los textos del backend (sufijo de ArgumentException incluido)', async () => {
    const detail = async (dto: object) =>
      (await errorOf(firstValueFrom(repo.createDiagnosis('enc-1', dto)))).error.detail;
    expect(await detail({})).toBe("description is required when cie10_code is not provided. (Parameter 'description')");
    expect(await detail({ cie10_code: 'ZZZ' })).toBe("cie10_code 'ZZZ' is not a valid ICD-10 code. (Parameter 'cie10_code')");
    expect(await detail({ cie10_code: 'X99.9' })).toBe("cie10_code 'X99.9' does not exist in the CIE-10 catalog.");
    expect(await detail({ description: 'x'.repeat(1001) }))
      .toBe("description cannot exceed 1000 characters. (Parameter 'description')");
  });

  it('código repetido en el mismo encounter → 409 (después de validar la description)', async () => {
    const err = await errorOf(firstValueFrom(repo.createDiagnosis('enc-1', { cie10_code: 'R51' })));
    expect(err.status).toBe(409);
    expect(err.error.detail).toBe("Encounter 'enc-1' already has a diagnosis with cie10_code 'R51'.");
    const long = await errorOf(firstValueFrom(repo.createDiagnosis('enc-1', { cie10_code: 'R51', description: 'x'.repeat(1001) })));
    expect(long.status).toBe(422);
  });

  it('crear: 403 si no es el profesional, 409 si no está open, 422 si el profesional está inactivo', async () => {
    expect((await errorOf(firstValueFrom(repo.createDiagnosis('enc-3', { description: 'x' })))).status).toBe(403);
    expect((await errorOf(firstValueFrom(repo.createDiagnosis('enc-2', { description: 'x' })))).status).toBe(409);
    repo.setProfessionalActive('prof-1', false);
    expect((await errorOf(firstValueFrom(repo.createDiagnosis('enc-1', { description: 'x' })))).status).toBe(422);
  });

  it('delete: orden 404 encounter → 403 → 404 diagnosis → 409', async () => {
    expect((await errorOf(firstValueFrom(repo.deleteDiagnosis('nope', 'dx-1')))).status).toBe(404);
    expect((await errorOf(firstValueFrom(repo.deleteDiagnosis('enc-3', 'no-existe')))).status).toBe(403);
    // enc-2 está firmado: un id inexistente da 404 antes que el 409 de estado.
    const missing = await errorOf(firstValueFrom(repo.deleteDiagnosis('enc-2', 'no-existe')));
    expect(missing.status).toBe(404);
    expect(missing.error.detail).toMatch(/^Diagnosis with id/);
    expect((await errorOf(firstValueFrom(repo.deleteDiagnosis('enc-2', 'dx-2')))).status).toBe(409);
  });

  it('leer: 403 sin profesional activo ni clinical.void; con clinical.void sí; 404 encounter inexistente', async () => {
    repo.setCurrentUser('nadie');
    expect((await errorOf(firstValueFrom(repo.listDiagnoses('enc-1')))).status).toBe(403);
    repo.setCurrentUser('nadie', ['clinical.void']);
    expect((await firstValueFrom(repo.listDiagnoses('enc-2'))).length).toBe(2);
    expect((await errorOf(firstValueFrom(repo.listDiagnoses('nope')))).status).toBe(404);
  });

  it('los 422 de encounters también llevan el sufijo (Parameter)', async () => {
    const err = await errorOf(firstValueFrom(repo.void('enc-1', { reason: ' ', version: 1 })));
    expect(err.error.detail).toBe("reason is required. (Parameter 'reason')");
  });
});

describe('MockCie10Catalog', () => {
  const catalog = new MockCie10Catalog();

  it('q fuera de 2..100 → 422 con el texto del backend', async () => {
    expect((await errorOf(firstValueFrom(catalog.search('m')))).error.detail)
      .toBe("q must have at least 2 characters. (Parameter 'q')");
    expect((await errorOf(firstValueFrom(catalog.search('x'.repeat(101))))).error.detail)
      .toBe("q cannot exceed 100 characters. (Parameter 'q')");
  });

  it('orden: código exacto, prefijo, descripción (cada grupo por código); sin tildes', async () => {
    expect((await firstValueFrom(catalog.search('migrana'))).map(c => c.code)).toEqual(['G43.9']);
    expect((await firstValueFrom(catalog.search('j0'))).map(c => c.code)).toEqual(['J00', 'J02.9', 'J03.9', 'J06.9']);
    // "r51" exacto primero; "R51" no tiene prefijos ni descripciones con "r51".
    expect((await firstValueFrom(catalog.search('R51'))).map(c => c.code)).toEqual(['R51']);
    // "cefalea": R51 y G44.2 por descripción, ordenados por código.
    expect((await firstValueFrom(catalog.search('cefalea'))).map(c => c.code)).toEqual(['G44.2', 'R51']);
    // "J00": exacto antes que los demás que lo contengan en la descripción (ninguno) — y prefijos.
    expect((await firstValueFrom(catalog.search('J0'))).at(0)?.code).toBe('J00');
  });

  it('exacto antes que prefijo', async () => {
    expect((await firstValueFrom(catalog.search('R50.9'))).map(c => c.code)).toEqual(['R50.9']);
    expect((await firstValueFrom(catalog.search('r5'))).map(c => c.code)).toEqual(['R50.9', 'R51']);
  });

  it('limit acotado', async () => {
    expect((await firstValueFrom(catalog.search('no', 2))).length).toBe(2);
  });
});
