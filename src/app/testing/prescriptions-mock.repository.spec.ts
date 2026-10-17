import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { MockPrescriptionsRepository, PRESCRIPTION_BACKEND_MESSAGES } from './prescriptions-mock.repository';
import { MockEncountersRepository } from './encounters-mock.repository';
import { MockClinicalBackend } from './mock-clinical-backend';
import { ENCOUNTERS_REPOSITORY } from '../core/services/encounters-repository';
import { PRESCRIPTIONS_REPOSITORY } from '../core/services/prescriptions-repository';
import { PRESCRIPTION_LIMITS } from '../core/models/prescription.model';

async function failure(obs: Observable<unknown>): Promise<{ status: number; detail: string }> {
  try {
    await firstValueFrom(obs);
  } catch (err) {
    const e = err as HttpErrorResponse;
    return { status: e.status, detail: e.error?.detail };
  }
  throw new Error('se esperaba un error');
}

// Fidelidad del mock al contrato del backend (forma de los DTO, status, mensajes y orden de validación).
describe('MockPrescriptionsRepository', () => {
  let repo: MockPrescriptionsRepository;
  let encounters: MockEncountersRepository;
  let backend: MockClinicalBackend;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: PRESCRIPTIONS_REPOSITORY, useClass: MockPrescriptionsRepository },
      ],
    });
    repo = TestBed.inject(PRESCRIPTIONS_REPOSITORY) as MockPrescriptionsRepository;
    encounters = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    backend = TestBed.inject(MockClinicalBackend);
  });

  describe('lecturas', () => {
    it('listByEncounter: array issued_at asc con la forma de PrescriptionDTO', async () => {
      await firstValueFrom(repo.createForEncounter('enc-1', { items: [{ medication: 'Omeprazol' }] }));
      const list = await firstValueFrom(repo.listByEncounter('enc-1'));
      expect(list.map(p => p.id)).toEqual(['rx-1', 'rx-100']);
      expect(Object.keys(list[0]).sort())
        .toEqual(['encounter_id', 'id', 'issued_at', 'items', 'notes', 'patient_id', 'professional_id']);
      expect(Object.keys(list[0].items[0]).sort())
        .toEqual(['dose', 'duration', 'frequency', 'id', 'instructions', 'medication', 'prescription_id', 'presentation']);
    });

    it('listByPatient: PagedResult issued_at desc, con y sin encuentro', async () => {
      const page1 = await firstValueFrom(repo.listByPatient('pat-1', { page: 1, limit: 3 }));
      expect(page1.total_count).toBe(4);
      expect(page1.total_pages).toBe(2);
      expect(page1.items.map(p => p.id)).toEqual(['rx-2', 'rx-1', 'rx-4']);
      const page2 = await firstValueFrom(repo.listByPatient('pat-1', { page: 2, limit: 3 }));
      expect(page2.items.map(p => p.id)).toEqual(['rx-3']);
      expect(page1.items.map(p => p.encounter_id)).toEqual([null, 'enc-1', 'enc-3']);
    });

    it('403 sin profesional activo ni clinical.void; con clinical.void lee', async () => {
      encounters.setCurrentUser('nadie');
      expect((await failure(repo.listByPatient('pat-1', { page: 1, limit: 10 }))).status).toBe(403);
      expect((await failure(repo.listByEncounter('enc-1'))).status).toBe(403);
      encounters.setCurrentUser('nadie', ['clinical.void']);
      expect((await firstValueFrom(repo.listByEncounter('enc-1'))).length).toBe(1);
    });

    it('paciente / encuentro inexistente (u otro tenant) → 404 con el detail del backend', async () => {
      expect(await failure(repo.listByPatient('pat-x', { page: 1, limit: 10 })))
        .toEqual({ status: 404, detail: "Patient with id 'pat-x' was not found." });
      expect(await failure(repo.listByEncounter('enc-x')))
        .toEqual({ status: 404, detail: "Encounter with id 'enc-x' was not found." });
    });
  });

  describe('createForEncounter', () => {
    it('201 PrescriptionDTO + encounter_version; ids/issued_at/professional/patient los pone el backend', async () => {
      const created = await firstValueFrom(repo.createForEncounter('enc-1', {
        notes: '  Tomar con agua  ', items: [{ medication: ' Ibuprofeno ', dose: '' }, { medication: 'Paracetamol', frequency: 'Cada 6 h' }],
      }));
      expect(created.encounter_version).toBe(2);
      expect(backend.encounter('enc-1')?.version).toBe(2);
      expect(created).toMatchObject({ patient_id: 'pat-1', professional_id: 'prof-1', encounter_id: 'enc-1', notes: 'Tomar con agua' });
      expect(created.items.map(i => [i.medication, i.dose, i.frequency])).toEqual([['Ibuprofeno', null, null], ['Paracetamol', null, 'Cada 6 h']]);
      expect(created.items.every(i => i.prescription_id === created.id)).toBe(true);
      expect(Date.now() - Date.parse(created.issued_at)).toBeLessThan(5_000);
    });

    it('orden: 404 → no es su profesional 403 → inactivo 422 → no open 409 → validación', async () => {
      expect((await failure(repo.createForEncounter('enc-x', {}))).status).toBe(404);
      expect(await failure(repo.createForEncounter('enc-3', {})))
        .toEqual({ status: 403, detail: PRESCRIPTION_BACKEND_MESSAGES.encounterForbidden('enc-3') });
      encounters.setProfessionalActive('prof-1', false);
      expect(await failure(repo.createForEncounter('enc-2', { items: [{ medication: '' }] })))
        .toEqual({ status: 422, detail: "Professional with id 'prof-1' is inactive." });
      encounters.setProfessionalActive('prof-1', true);
      expect(await failure(repo.createForEncounter('enc-2', { items: [{ medication: '' }] })))
        .toEqual({ status: 409, detail: PRESCRIPTION_BACKEND_MESSAGES.encounterNotOpen('signed') });
      expect(await failure(repo.createForEncounter('enc-1', { items: [{ medication: '  ' }] })))
        .toEqual({ status: 422, detail: "items[0].medication is required. (Parameter 'items[0].medication')" });
      expect(backend.encounter('enc-1')?.version).toBe(1);
    });

    it('límites: notes ≤ 2000, campos del ítem, máximo 50 ítems y sin \\0', async () => {
      expect((await failure(repo.createForEncounter('enc-1', { notes: 'x'.repeat(2001) }))).detail)
        .toBe("notes cannot exceed 2000 characters. (Parameter 'notes')");
      expect((await failure(repo.createForEncounter('enc-1', { items: [{ medication: 'x'.repeat(201) }] }))).detail)
        .toBe("items[0].medication cannot exceed 200 characters. (Parameter 'items[0].medication')");
      expect((await failure(repo.createForEncounter('enc-1', { items: [{ medication: 'A' }, { medication: 'B', duration: 'x'.repeat(201) }] }))).detail)
        .toBe("items[1].duration cannot exceed 200 characters. (Parameter 'items[1].duration')");
      expect((await failure(repo.createForEncounter('enc-1', { items: [{ medication: 'A', instructions: 'x'.repeat(1001) }] }))).detail)
        .toBe("items[0].instructions cannot exceed 1000 characters. (Parameter 'items[0].instructions')");
      expect((await failure(repo.createForEncounter('enc-1', { items: [{ medication: 'A\0' }] }))).detail)
        .toBe("items[0].medication cannot contain the null character (U+0000). (Parameter 'items[0].medication')");
      expect((await failure(repo.createStandalone('pat-1', { items: [{ medication: 'A' }, null as never] }))))
        .toEqual({ status: 422, detail: "items[1] cannot be null. (Parameter 'items')" });
      const items = Array.from({ length: PRESCRIPTION_LIMITS.maxItems + 1 }, (_, i) => ({ medication: `M${i}` }));
      expect(await failure(repo.createForEncounter('enc-1', { items }))).toEqual({ status: 422, detail: PRESCRIPTION_BACKEND_MESSAGES.maxItems });
    });
  });

  describe('createStandalone', () => {
    it('201 sin encuentro, encounter_version null, a nombre del profesional del usuario', async () => {
      const created = await firstValueFrom(repo.createStandalone('pat-2', { items: [{ medication: 'Loratadina' }] }));
      expect(created).toMatchObject({ patient_id: 'pat-2', professional_id: 'prof-1', encounter_id: null, encounter_version: null });
    });

    it('404 paciente → sin profesional 403 → inactivo 422', async () => {
      expect((await failure(repo.createStandalone('pat-x', {}))).status).toBe(404);
      encounters.setCurrentUser('nadie', ['clinical.void']);
      expect(await failure(repo.createStandalone('pat-1', {})))
        .toEqual({ status: 403, detail: PRESCRIPTION_BACKEND_MESSAGES.standaloneForbidden });
      encounters.setCurrentUser('mock-user-1');
      encounters.setProfessionalActive('prof-1', false);
      expect((await failure(repo.createStandalone('pat-1', {}))).status).toBe(422);
    });
  });

  describe('addItem', () => {
    it('en receta de encuentro open: 201 PrescriptionItemDTO + encounter_version; varios ítems', async () => {
      const first = await firstValueFrom(repo.addItem('rx-1', { medication: 'Omeprazol' }));
      const second = await firstValueFrom(repo.addItem('rx-1', { medication: 'Loratadina', dose: '10 mg' }));
      expect(first).toMatchObject({ prescription_id: 'rx-1', medication: 'Omeprazol', presentation: null, encounter_version: 2 });
      expect(second.encounter_version).toBe(3);
      const [rx] = await firstValueFrom(repo.listByEncounter('enc-1'));
      expect(rx.items.map(i => i.medication)).toEqual(['Ibuprofeno', 'Paracetamol', 'Omeprazol', 'Loratadina']);
    });

    it('suelta dentro de las 24 h: 201 con encounter_version null; fuera → 409 con el texto del contrato', async () => {
      expect((await firstValueFrom(repo.addItem('rx-2', { medication: 'Ibuprofeno' }))).encounter_version).toBeNull();
      expect(await failure(repo.addItem('rx-3', { medication: 'Ibuprofeno' })))
        .toEqual({ status: 409, detail: 'Items can only be added within 24 hours of issuing a standalone prescription.' });
      repo.setIssuedAt('rx-2', new Date(Date.now() - 24 * 3600_000 - 1000).toISOString());
      expect((await failure(repo.addItem('rx-2', { medication: 'Ibuprofeno' }))).status).toBe(409);
    });

    it('borde de la ventana: exactamente 24 h se acepta; un ms más → 409', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
        repo.setIssuedAt('rx-2', '2026-10-16T12:00:00.000Z');
        expect((await firstValueFrom(repo.addItem('rx-2', { medication: 'A' }))).medication).toBe('A');
        vi.setSystemTime(new Date('2026-10-17T12:00:00.001Z'));
        expect((await failure(repo.addItem('rx-2', { medication: 'B' }))).status).toBe(409);
      } finally {
        vi.useRealTimers();
      }
    });

    it('ítem nulo al agregar: 422 "item cannot be null."', async () => {
      expect(await failure(repo.addItem('rx-2', null as never)))
        .toEqual({ status: 422, detail: "item cannot be null. (Parameter 'item')" });
    });

    it('orden: 404 receta → otro profesional 403 → inactivo 422 → encuentro no open 409 → medication 422 → máximo 50', async () => {
      expect(await failure(repo.addItem('rx-x', { medication: 'A' })))
        .toEqual({ status: 404, detail: "Prescription with id 'rx-x' was not found." });
      expect(await failure(repo.addItem('rx-4', { medication: '' })))
        .toEqual({ status: 403, detail: PRESCRIPTION_BACKEND_MESSAGES.itemForbidden('rx-4') });
      encounters.setProfessionalActive('prof-1', false);
      expect((await failure(repo.addItem('rx-5', { medication: '' }))).status).toBe(422);
      encounters.setProfessionalActive('prof-1', true);
      expect(await failure(repo.addItem('rx-5', { medication: '' })))
        .toEqual({ status: 409, detail: PRESCRIPTION_BACKEND_MESSAGES.itemEncounterNotOpen('signed') });
      expect((await failure(repo.addItem('rx-1', { medication: '' }))).detail).toBe("medication is required. (Parameter 'medication')");
      for (let i = 2; i < PRESCRIPTION_LIMITS.maxItems; i++) await firstValueFrom(repo.addItem('rx-1', { medication: `M${i}` }));
      expect(await failure(repo.addItem('rx-1', { medication: 'Uno más' })))
        .toEqual({ status: 422, detail: PRESCRIPTION_BACKEND_MESSAGES.maxItems });
    });
  });
});
