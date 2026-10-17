import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { MOCK_TOOTH_CONDITION_USER_ID, MockToothConditionsRepository } from './tooth-conditions-mock.repository';
import { ToothSurface } from '../core/models/tooth-condition.model';

async function errorOf(p: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await p;
  } catch (err) {
    return err as HttpErrorResponse;
  }
  throw new Error('se esperaba un error');
}

// El mock debe imitar el contrato esperado del backend (lo usan la pantalla en demo y tests).
describe('MockToothConditionsRepository', () => {
  let repo: MockToothConditionsRepository;

  beforeEach(() => (repo = new MockToothConditionsRepository()));

  it('list: solo las del odontograma, por created_at, con la forma del DTO', async () => {
    const list = await firstValueFrom(repo.list('odo-2'));
    expect(list.map(i => i.tooth_fdi)).toEqual([16, 36, 46]);
    expect(list.every(i => i.odontogram_id === 'odo-2')).toBe(true);
    expect(Object.keys(list[0]).sort()).toEqual([
      'condition_id', 'created_at', 'created_by', 'id', 'note', 'odontogram_id', 'state', 'surface', 'tooth_fdi',
    ]);
    expect(await firstValueFrom(repo.list('odo-1'))).toEqual([]);
  });

  it('create: defaults surface whole y state existente; note vacía = null; created_by del token', async () => {
    const created = await firstValueFrom(repo.create('odo-2', { tooth_fdi: 11, condition_id: 'dc-1', note: '   ' }));
    expect(created).toEqual(expect.objectContaining({
      odontogram_id: 'odo-2', tooth_fdi: 11, surface: 'whole', condition_id: 'dc-1', state: 'existente', note: null,
      created_by: MOCK_TOOTH_CONDITION_USER_ID,
    }));
    expect(await firstValueFrom(repo.list('odo-2'))).toContainEqual(created);
  });

  it('create: tooth_fdi según la dentición del odontograma → 422', async () => {
    // odo-2 permanente: 51 (temporal) y 19 (inexistente) no van.
    for (const fdi of [51, 19, 10]) {
      const err = await errorOf(firstValueFrom(repo.create('odo-2', { tooth_fdi: fdi, condition_id: 'dc-1' })));
      expect(err.status).toBe(422);
      expect(err.error.detail).toBe(`Tooth ${fdi} is not valid for dentition 'permanente'.`);
    }
    // odo-3 mixta: ambas.
    await expect(firstValueFrom(repo.create('odo-3', { tooth_fdi: 85, condition_id: 'dc-1' }))).resolves.toBeTruthy();
    await expect(firstValueFrom(repo.create('odo-3', { tooth_fdi: 48, condition_id: 'dc-1' }))).resolves.toBeTruthy();
    // temporal registrado: 56 no existe.
    repo.registerOdontogram('odo-t', 'temporal');
    expect((await errorOf(firstValueFrom(repo.create('odo-t', { tooth_fdi: 56, condition_id: 'dc-1' })))).status).toBe(422);
    expect((await errorOf(firstValueFrom(repo.create('odo-t', { tooth_fdi: 11, condition_id: 'dc-1' })))).status).toBe(422);
  });

  it('create: condition_id requerido y surface / state del enum → 422', async () => {
    const cases: Parameters<MockToothConditionsRepository['create']>[1][] = [
      { tooth_fdi: 11, condition_id: '' },
      { tooth_fdi: 11, condition_id: 'dc-1', surface: 'frontal' as ToothSurface },
      { tooth_fdi: 11, condition_id: 'dc-1', state: 'terminado' as never },
    ];
    for (const dto of cases) {
      expect((await errorOf(firstValueFrom(repo.create('odo-2', dto)))).status).toBe(422);
    }
  });

  it('update: PATCH parcial; note null la quita; tooth_fdi no cambia', async () => {
    const updated = await firstValueFrom(repo.update('odo-2', 'tc-2', { state: 'planificado', note: null }));
    expect(updated).toEqual(expect.objectContaining({
      id: 'tc-2', tooth_fdi: 36, surface: 'whole', condition_id: 'dc-3', state: 'planificado', note: null,
    }));
  });

  it('update / remove: inexistente o de otro odontograma → 404', async () => {
    expect((await errorOf(firstValueFrom(repo.update('odo-2', 'nope', { state: 'realizado' })))).status).toBe(404);
    expect((await errorOf(firstValueFrom(repo.update('odo-3', 'tc-1', { state: 'realizado' })))).status).toBe(404);
    expect((await errorOf(firstValueFrom(repo.remove('odo-3', 'tc-1')))).status).toBe(404);
  });

  it('remove: la quita del listado', async () => {
    await firstValueFrom(repo.remove('odo-2', 'tc-1'));
    expect((await firstValueFrom(repo.list('odo-2'))).map(i => i.id)).toEqual(['tc-2', 'tc-3']);
  });

  it('módulo odontogram apagado: toda llamada → 403 sin body', async () => {
    repo.setOdontogramEnabled(false);
    expect(repo.odontogramEnabled()).toBe(false);
    const calls: Observable<unknown>[] = [
      repo.list('odo-2'), repo.create('odo-2', { tooth_fdi: 11, condition_id: 'dc-1' }),
      repo.update('odo-2', 'tc-1', { state: 'realizado' }), repo.remove('odo-2', 'tc-1'),
    ];
    for (const call of calls) {
      const err = await errorOf(firstValueFrom(call));
      expect(err.status).toBe(403);
      expect(err.error).toBeNull();
    }
  });
});
