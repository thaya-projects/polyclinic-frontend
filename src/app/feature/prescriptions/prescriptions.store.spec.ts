import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, Subject, of, throwError } from 'rxjs';
import { PrescriptionsStore } from './prescriptions.store';
import { PRESCRIPTIONS_REPOSITORY, PrescriptionsRepository } from '../../core/services/prescriptions-repository';
import { ENCOUNTERS_REPOSITORY } from '../../core/services/encounters-repository';
import {
  CreatedPrescription, CreatedPrescriptionItem, Prescription, PrescriptionItem, PrescriptionsQuery,
} from '../../core/models/prescription.model';
import { Encounter } from '../../core/models/encounter.model';
import { PagedResult } from '../../core/models/paged-result.model';
import { ToastService } from '../../core/services/toast.service';
import {
  PRESCRIPTION_CONCURRENCY_MESSAGE, PRESCRIPTION_CONFLICT_MESSAGE, PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE,
  PRESCRIPTION_NOT_FOUND_MESSAGE, PRESCRIPTION_WINDOW_CLOSED_MESSAGE,
} from '../../shared/utils/prescriptions-error.util';

function rx(id: string, issuedAt: string, extra: Partial<Prescription> = {}): Prescription {
  return { id, patient_id: 'p1', professional_id: 'prof-1', encounter_id: null, issued_at: issuedAt, notes: null, items: [], ...extra };
}

function item(id: string, prescriptionId: string, medication = 'Ibuprofeno'): PrescriptionItem {
  return { id, prescription_id: prescriptionId, medication, presentation: null, dose: null, frequency: null, duration: null, instructions: null };
}

function paged(items: Prescription[], total: number, query: PrescriptionsQuery): PagedResult<Prescription> {
  return { items, total_count: total, current_page: query.page, page_size: query.limit, total_pages: Math.ceil(total / query.limit) };
}

const CONCURRENCY_DETAIL = 'The resource was modified by another request. Reload and try again.';
const UNIQUE_DETAIL = "Unique constraint 'IX_prescription_items_position' on table 'prescription_items' was violated.";

const http = (status: number, detail?: string) => throwError(() => new HttpErrorResponse({ status, error: detail ? { detail } : null }));

// Unidad del store con repositorios falsos (respuestas controladas).
describe('PrescriptionsStore', () => {
  let store: PrescriptionsStore;
  let repo: Record<keyof PrescriptionsRepository, ReturnType<typeof vi.fn>>;
  let getById: ReturnType<typeof vi.fn>;

  const PAGE_1 = [rx('a', '2026-10-10T12:00:00Z', { encounter_id: 'e1' }), rx('b', '2026-10-09T12:00:00Z'), rx('c', '2026-10-08T12:00:00Z')];
  const PAGE_2 = [rx('d', '2026-10-07T12:00:00Z'), rx('e', '2026-10-06T12:00:00Z')];

  beforeEach(() => {
    repo = {
      listByEncounter: vi.fn(() => of([rx('x', '2026-10-10T10:00:00Z', { encounter_id: 'e1' }), rx('w', '2026-10-10T09:00:00Z', { encounter_id: 'e1' })])),
      listByPatient: vi.fn((_p: string, q: PrescriptionsQuery) => of(paged(q.page === 1 ? PAGE_1 : PAGE_2, 5, q))),
      createForEncounter: vi.fn(() => EMPTY),
      createStandalone: vi.fn(() => EMPTY),
      addItem: vi.fn(() => EMPTY),
    };
    getById = vi.fn((id: string) => of({ id, status: 'open' } as Encounter));
    TestBed.configureTestingModule({
      providers: [
        PrescriptionsStore,
        { provide: PRESCRIPTIONS_REPOSITORY, useValue: repo as unknown as PrescriptionsRepository },
        { provide: ENCOUNTERS_REPOSITORY, useValue: { getById } },
      ],
    });
    store = TestBed.inject(PrescriptionsStore);
  });

  const ids = () => store.items().map(p => p.id);

  describe('ámbito del paciente', () => {
    beforeEach(() => {
      store.setStatusOwner('prof-1');
      store.setScope({ patientId: 'p1', encounterId: null }, 3);
    });

    it('carga la página 1 (issued_at desc) y consulta el estado de los encuentros de las recetas', () => {
      expect(ids()).toEqual(['a', 'b', 'c']);
      expect(store.total()).toBe(5);
      expect(getById).toHaveBeenCalledTimes(1);
      expect(store.encounterStatuses()).toEqual({ e1: 'open' });
    });

    it('receta suelta nueva: va con createStandalone, aparece arriba sin recargar, sin encounterVersion$', () => {
      const versions: unknown[] = [];
      store.encounterVersion$.subscribe(v => versions.push(v));
      repo.createStandalone.mockReturnValue(of({ ...rx('n', '2026-10-17T10:00:00Z'), encounter_version: null } as CreatedPrescription));
      repo.listByPatient.mockClear();
      store.create({ notes: 'x' });
      expect(repo.createStandalone).toHaveBeenCalledWith('p1', { notes: 'x' });
      expect(repo.createForEncounter).not.toHaveBeenCalled();
      expect(ids()).toEqual(['n', 'a', 'b']);
      expect(store.total()).toBe(6);
      expect(repo.listByPatient).not.toHaveBeenCalled();
      expect(store.createdSeq()).toBe(1);
      expect(versions).toEqual([]);
    });

    it('página > 1: tras emitir vuelve a la página 1 (ahí aparece la receta nueva)', () => {
      store.setPage(2);
      repo.listByPatient.mockClear();
      repo.createStandalone.mockReturnValue(of({ ...rx('n', '2026-10-17T10:00:00Z'), encounter_version: null }));
      store.create({});
      expect(store.page()).toBe(1);
      expect(repo.listByPatient).toHaveBeenCalledTimes(1);
      expect(repo.listByPatient).toHaveBeenCalledWith('p1', { page: 1, limit: 3 });
    });

    it('estado de encuentros: solo para recetas del profesional actual (sin N+1 por recetas ajenas)', () => {
      repo.listByPatient.mockReturnValue(of(paged([
        rx('a', '2026-10-10T12:00:00Z', { encounter_id: 'e1' }),
        rx('f', '2026-10-09T12:00:00Z', { encounter_id: 'e2', professional_id: 'prof-2' }),
        rx('g', '2026-10-08T12:00:00Z', { encounter_id: 'e3', professional_id: 'prof-3' }),
      ], 3, { page: 1, limit: 3 })));
      getById.mockClear();
      store.load();
      expect(getById).not.toHaveBeenCalled(); // e1 ya se conocía
      expect(store.encounterStatuses()).toEqual({ e1: 'open' });

      // Sin profesional vinculado/activo no se consulta nada; al aparecer uno, solo sus encuentros.
      store.setStatusOwner(null);
      store.setScope({ patientId: 'p2', encounterId: null }, 3);
      expect(getById).not.toHaveBeenCalled();
      store.setStatusOwner('prof-2');
      expect(getById.mock.calls.map(c => c[0])).toEqual(['e2']);
    });

    it('agregar ítem: se agrega al final de su receta sin recargar; varios ítems; dedupe por id', () => {
      repo.listByPatient.mockClear();
      repo.addItem.mockReturnValueOnce(of({ ...item('i1', 'b'), encounter_version: null } as CreatedPrescriptionItem));
      store.addItem('b', { medication: 'Ibuprofeno' });
      repo.addItem.mockReturnValueOnce(of({ ...item('i2', 'b', 'Paracetamol'), encounter_version: null }));
      store.addItem('b', { medication: 'Paracetamol' });
      repo.addItem.mockReturnValueOnce(of({ ...item('i2', 'b', 'Paracetamol'), encounter_version: null }));
      store.addItem('b', { medication: 'Paracetamol' });
      expect(store.items().find(p => p.id === 'b')!.items.map(i => i.medication)).toEqual(['Ibuprofeno', 'Paracetamol']);
      expect(store.itemAddedSeq()).toBe(3);
      expect(repo.listByPatient).not.toHaveBeenCalled();
    });

    it('409 de la ventana de 24 h: mensaje en la receta y queda bloqueada (sin conflict$)', () => {
      const conflicts: string[] = [];
      store.conflict$.subscribe(c => conflicts.push(c));
      repo.addItem.mockReturnValue(http(409, 'Items can only be added within 24 hours of issuing a standalone prescription.'));
      store.addItem('b', { medication: 'Ibuprofeno' });
      expect(store.itemError()).toEqual({ prescriptionId: 'b', message: PRESCRIPTION_WINDOW_CLOSED_MESSAGE });
      expect(store.lockedReasons()).toEqual({ b: PRESCRIPTION_WINDOW_CLOSED_MESSAGE });
      expect(store.busy()).toBe(false);
      expect(conflicts).toEqual([]);
    });

    it('409 de encuentro no open en una receta con encuentro: bloquea y vuelve a consultar el estado del encuentro', () => {
      getById.mockReturnValue(of({ id: 'e1', status: 'signed' } as Encounter));
      repo.addItem.mockReturnValue(http(409, "Cannot add prescription items to an encounter with status 'signed'."));
      store.addItem('a', { medication: 'Ibuprofeno' });
      expect(store.itemError()).toEqual({ prescriptionId: 'a', message: PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE });
      expect(store.lockedReasons()['a']).toBe(PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE);
      expect(store.encounterStatuses()).toEqual({ e1: 'signed' });
    });

    it('404 de la receta al agregar ítem: aviso por toast (la receta desaparece) y se recarga la lista', () => {
      const toastError = vi.spyOn(TestBed.inject(ToastService), 'error');
      repo.listByPatient.mockClear();
      repo.addItem.mockReturnValue(http(404, "Prescription with id 'b' was not found."));
      store.addItem('b', { medication: 'Ibuprofeno' });
      expect(toastError).toHaveBeenCalledWith(PRESCRIPTION_NOT_FOUND_MESSAGE);
      expect(store.itemError()).toBeNull();
      expect(repo.listByPatient).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['concurrencia', CONCURRENCY_DETAIL],
      ['índice único', UNIQUE_DETAIL],
      ['sin detail', undefined],
    ])('409 de %s al agregar ítem a una receta suelta: mensaje, NO bloquea, recarga la lista', (_, detail) => {
      const conflicts: string[] = [];
      store.conflict$.subscribe(c => conflicts.push(c));
      repo.listByPatient.mockClear();
      repo.addItem.mockReturnValue(http(409, detail));
      store.addItem('b', { medication: 'Ibuprofeno' });
      expect(store.itemError()).toEqual({ prescriptionId: 'b', message: PRESCRIPTION_CONCURRENCY_MESSAGE });
      expect(store.lockedReasons()).toEqual({});
      expect(store.busy()).toBe(false);
      expect(conflicts).toEqual([]);
      expect(repo.listByPatient).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['concurrencia', CONCURRENCY_DETAIL],
      ['índice único', UNIQUE_DETAIL],
    ])('409 de %s al emitir una receta suelta: mensaje sin hablar de encuentro y recarga la lista', (_, detail) => {
      const concurrency: string[] = [];
      store.concurrency$.subscribe(c => concurrency.push(c));
      repo.listByPatient.mockClear();
      repo.createStandalone.mockReturnValue(http(409, detail));
      store.create({ items: [{ medication: 'A' }] });
      expect(store.actionError()).toBe(PRESCRIPTION_CONCURRENCY_MESSAGE);
      expect(store.actionError()).not.toMatch(/encuentro/i);
      expect(repo.listByPatient).toHaveBeenCalledTimes(1);
      // En la pantalla del paciente no hay encuentro que recargar.
      expect(concurrency).toEqual([]);
    });

    it('bloqueo por encuentro cerrado: se libera si al reconsultar el encuentro sigue open', () => {
      // El backend dice "signed" pero al reconsultar el encuentro sigue open: el bloqueo no queda pegado.
      repo.addItem.mockReturnValue(http(409, "Cannot add prescription items to an encounter with status 'signed'."));
      store.addItem('a', { medication: 'Ibuprofeno' });
      expect(store.encounterStatuses()).toEqual({ e1: 'open' });
      expect(store.lockedReasons()).toEqual({});
      // La ventana de 24 h, en cambio, no se libera.
      repo.addItem.mockReturnValue(http(409, 'Items can only be added within 24 hours of issuing a standalone prescription.'));
      store.addItem('b', { medication: 'Ibuprofeno' });
      store.syncEncounterStatus('e1', 'open');
      expect(store.lockedReasons()).toEqual({ b: PRESCRIPTION_WINDOW_CLOSED_MESSAGE });
    });

    it('401: no muestra nada (authInterceptor)', () => {
      repo.addItem.mockReturnValue(http(401));
      store.addItem('b', { medication: 'Ibuprofeno' });
      repo.createStandalone.mockReturnValue(http(401));
      store.create({});
      expect(store.itemError()).toBeNull();
      expect(store.actionError()).toBeNull();
      expect(store.busy()).toBe(false);
    });

    it('404 del paciente al listar → patientNotFound$', () => {
      const notFound: string[] = [];
      store.patientNotFound$.subscribe(m => notFound.push(m));
      repo.listByPatient.mockReturnValue(http(404, "Patient with id 'p2' was not found."));
      store.setScope({ patientId: 'p2', encounterId: null }, 3);
      expect(notFound.length).toBe(1);
      expect(store.loadRetryable()).toBe(false);
    });

    it('403 al listar → accessDenied (sin reintento)', () => {
      repo.listByPatient.mockReturnValue(http(403));
      store.setScope({ patientId: 'p2', encounterId: null }, 3);
      expect(store.accessDenied()).toBe(true);
      expect(store.loadRetryable()).toBe(false);
    });

    it('alta que completa sin emitir: libera y avisa', () => {
      store.create({});
      expect(store.busy()).toBe(false);
      expect(store.actionError()).toBe('No se pudo emitir la receta.');
      store.addItem('b', { medication: 'x' });
      expect(store.itemError()).toEqual({ prescriptionId: 'b', message: 'No se pudo agregar el medicamento.' });
    });

    it('listado que completa sin emitir: error reintentable', () => {
      repo.listByPatient.mockReturnValue(EMPTY);
      store.load();
      expect(store.loading()).toBe(false);
      expect(store.loadError()).toBeTruthy();
      expect(store.loadRetryable()).toBe(true);
    });

    it('guarda de reentrada: con una operación en vuelo no sale otra (ni receta ni ítem)', () => {
      const pending$ = new Subject<CreatedPrescription>();
      repo.createStandalone.mockReturnValue(pending$);
      store.create({});
      store.create({});
      store.addItem('b', { medication: 'x' });
      expect(repo.createStandalone).toHaveBeenCalledTimes(1);
      expect(repo.addItem).not.toHaveBeenCalled();
    });
  });

  describe('ámbito del encuentro', () => {
    beforeEach(() => store.setScope({ patientId: 'p1', encounterId: 'e1' }));

    it('carga con listByEncounter, issued_at asc, sin consultar encuentros', () => {
      expect(repo.listByEncounter).toHaveBeenCalledWith('e1');
      expect(ids()).toEqual(['w', 'x']);
      expect(getById).not.toHaveBeenCalled();
    });

    it('alta: createForEncounter, se agrega al final y la version sale por encounterVersion$', () => {
      const versions: unknown[] = [];
      store.encounterVersion$.subscribe(v => versions.push(v));
      repo.createForEncounter.mockReturnValue(of({ ...rx('n', '2026-10-17T10:00:00Z', { encounter_id: 'e1' }), encounter_version: 5 }));
      store.create({ items: [{ medication: 'A' }] });
      expect(repo.createForEncounter).toHaveBeenCalledWith('e1', { items: [{ medication: 'A' }] });
      expect(ids()).toEqual(['w', 'x', 'n']);
      expect(versions).toEqual([{ encounterId: 'e1', version: 5 }]);
    });

    it('ítem en receta del encuentro: la version sale por encounterVersion$', () => {
      const versions: unknown[] = [];
      store.encounterVersion$.subscribe(v => versions.push(v));
      repo.addItem.mockReturnValue(of({ ...item('i1', 'x'), encounter_version: 7 }));
      store.addItem('x', { medication: 'Ibuprofeno' });
      expect(versions).toEqual([{ encounterId: 'e1', version: 7 }]);
    });

    it.each([
      ['concurrencia', CONCURRENCY_DETAIL],
      ['índice único', UNIQUE_DETAIL],
    ])('409 de %s al emitir o agregar: aviso, concurrency$ (recargar versión), sin conflict$ ni bloqueo', (_, detail) => {
      const conflicts: string[] = [];
      const concurrency: string[] = [];
      store.conflict$.subscribe(c => conflicts.push(c));
      store.concurrency$.subscribe(c => concurrency.push(c));
      repo.createForEncounter.mockReturnValue(http(409, detail));
      store.create({});
      expect(store.actionError()).toBe(PRESCRIPTION_CONCURRENCY_MESSAGE);
      repo.addItem.mockReturnValue(http(409, detail));
      store.addItem('x', { medication: 'A' });
      expect(store.itemError()).toEqual({ prescriptionId: 'x', message: PRESCRIPTION_CONCURRENCY_MESSAGE });
      expect(store.lockedReasons()).toEqual({});
      expect(concurrency.length).toBe(2);
      expect(conflicts).toEqual([]);
    });

    it('syncEncounterStatus: el encuentro recargado sigue open → se liberan los bloqueos de encuentro cerrado', () => {
      repo.addItem.mockReturnValue(http(409, "Cannot add prescription items to an encounter with status 'signed'."));
      store.addItem('x', { medication: 'A' });
      expect(store.lockedReasons()).toEqual({ x: PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE });
      store.syncEncounterStatus('e1', 'signed');
      expect(store.lockedReasons()).toEqual({ x: PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE });
      store.syncEncounterStatus('e1', 'open');
      expect(store.lockedReasons()).toEqual({});
    });

    it('409 al emitir o agregar: aviso + conflict$', () => {
      const conflicts: string[] = [];
      store.conflict$.subscribe(c => conflicts.push(c));
      repo.createForEncounter.mockReturnValue(http(409, "Cannot add prescriptions to an encounter with status 'signed'."));
      store.create({});
      expect(store.actionError()).toBe(PRESCRIPTION_CONFLICT_MESSAGE);
      repo.addItem.mockReturnValue(http(409, "Cannot add prescription items to an encounter with status 'signed'."));
      store.addItem('x', { medication: 'A' });
      expect(store.itemError()).toEqual({ prescriptionId: 'x', message: PRESCRIPTION_CONFLICT_MESSAGE });
      expect(conflicts.length).toBe(2);
    });

    it('respuesta tardía tras cambiar de ámbito: se descarta entera (sin pending, seq, aviso, conflict$ ni version)', () => {
      const pending$ = new Subject<CreatedPrescription>();
      repo.createForEncounter.mockReturnValue(pending$);
      const success = vi.spyOn(TestBed.inject(ToastService), 'success');
      const versions: unknown[] = [];
      const conflicts: unknown[] = [];
      store.encounterVersion$.subscribe(v => versions.push(v));
      store.conflict$.subscribe(c => conflicts.push(c));

      store.create({});
      expect(store.busy()).toBe(true);
      store.setScope({ patientId: 'p1', encounterId: 'e2' });
      expect(store.busy()).toBe(false);

      pending$.next({ ...rx('late', '2026-10-17T10:00:00Z', { encounter_id: 'e1' }), encounter_version: 9 });
      pending$.error(new HttpErrorResponse({ status: 409 }));
      expect(store.createdSeq()).toBe(0);
      expect(store.actionError()).toBeNull();
      expect(success).not.toHaveBeenCalled();
      expect(versions).toEqual([]);
      expect(conflicts).toEqual([]);
      expect(ids()).not.toContain('late');
    });

    it('respuesta tardía de un ítem tras cambiar de ámbito: se descarta', () => {
      const pending$ = new Subject<CreatedPrescriptionItem>();
      repo.addItem.mockReturnValue(pending$ as Observable<CreatedPrescriptionItem>);
      store.addItem('x', { medication: 'A' });
      store.setScope({ patientId: 'p1', encounterId: 'e2' });
      pending$.next({ ...item('late', 'x'), encounter_version: 3 });
      expect(store.itemAddedSeq()).toBe(0);
      expect(store.addingItemTo()).toBeNull();
    });

    it('404 del encuentro al listar → encounterNotFound$', () => {
      const notFound: string[] = [];
      store.encounterNotFound$.subscribe(m => notFound.push(m));
      repo.listByEncounter.mockReturnValue(http(404, "Encounter with id 'e3' was not found."));
      store.setScope({ patientId: 'p1', encounterId: 'e3' });
      expect(notFound.length).toBe(1);
    });
  });
});
