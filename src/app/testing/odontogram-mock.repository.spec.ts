import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { MockOdontogramRepository } from './odontogram-mock.repository';

async function errorOf(p: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await p;
  } catch (err) {
    return err as HttpErrorResponse;
  }
  throw new Error('se esperaba un error');
}

// El mock debe imitar el contrato del backend (lo usan la pantalla en demo y tests).
describe('MockOdontogramRepository', () => {
  let repo: MockOdontogramRepository;

  beforeEach(() => (repo = new MockOdontogramRepository()));

  it('getCurrent: devuelve el current con la forma de OdontogramDTO (sin tenant_id)', async () => {
    const current = await firstValueFrom(repo.getCurrent('pat-1'));
    expect(current).toEqual(expect.objectContaining({ id: 'odo-2', patient_id: 'pat-1', dentition: 'permanente', is_current: true }));
    expect(Object.keys(current).sort()).toEqual(
      ['clinical_record_id', 'dentition', 'encounter_id', 'id', 'is_current', 'patient_id', 'snapshot_date']);
  });

  it('getCurrent: sin current → 404 "has no current odontogram"; paciente inexistente → 404 Patient', async () => {
    const none = await errorOf(firstValueFrom(repo.getCurrent('pat-2')));
    expect(none.status).toBe(404);
    expect(none.error.detail).toContain('has no current odontogram');
    const missing = await errorOf(firstValueFrom(repo.getCurrent('nope')));
    expect(missing.error.detail).toBe("Patient with id 'nope' was not found.");
  });

  it('getById: históricos incluidos; inexistente → 404', async () => {
    expect((await firstValueFrom(repo.getById('odo-1'))).is_current).toBe(false);
    expect((await errorOf(firstValueFrom(repo.getById('nope')))).status).toBe(404);
  });

  it('create: nuevo current y el anterior queda como histórico; dentition por defecto permanente', async () => {
    const created = await firstValueFrom(repo.create('pat-1', { clinical_record_id: 'cr-pat-1', encounter_id: 'enc-1' }));
    expect(created).toEqual(expect.objectContaining({
      patient_id: 'pat-1', clinical_record_id: 'cr-pat-1', encounter_id: 'enc-1', dentition: 'permanente', is_current: true,
    }));
    expect((await firstValueFrom(repo.getCurrent('pat-1'))).id).toBe(created.id);
    const previous = await firstValueFrom(repo.getById('odo-2'));
    expect(previous.is_current).toBe(false);
    expect(previous.snapshot_date).toBe('2026-03-10T14:30:00Z');
  });

  it('create: validaciones con los status/textos del backend', async () => {
    const missing = await errorOf(firstValueFrom(repo.create('pat-1', { clinical_record_id: '' })));
    expect(missing.status).toBe(422);
    expect(missing.error.detail).toBe("clinical_record_id is required. (Parameter 'clinical_record_id')");
    expect((await errorOf(firstValueFrom(repo.create('pat-1', { clinical_record_id: 'cr-x' })))).status).toBe(404);
    expect((await errorOf(firstValueFrom(repo.create('pat-1', { clinical_record_id: 'cr-pat-2' })))).status).toBe(422);
    expect((await errorOf(firstValueFrom(repo.create('nope', { clinical_record_id: 'cr-pat-1' })))).status).toBe(404);
  });

  it('simulateCurrentConflict: el próximo create → 409 y no cambia el current', async () => {
    repo.simulateCurrentConflict();
    const err = await errorOf(firstValueFrom(repo.create('pat-1', { clinical_record_id: 'cr-pat-1' })));
    expect(err.status).toBe(409);
    expect((await firstValueFrom(repo.getCurrent('pat-1'))).id).toBe('odo-2');
  });

  it('módulo odontogram apagado: toda llamada → 403 sin body', async () => {
    repo.setOdontogramEnabled(false);
    expect(repo.odontogramEnabled()).toBe(false);
    const calls: Observable<unknown>[] = [
      repo.getCurrent('pat-1'), repo.getById('odo-1'), repo.create('pat-1', { clinical_record_id: 'cr-pat-1' }),
    ];
    for (const call of calls) {
      const err = await errorOf(firstValueFrom(call));
      expect(err.status).toBe(403);
      expect(err.error).toBeNull();
    }
  });
});
