import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MockEncountersRepository } from './encounters-mock.repository';
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
