import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import { EncounterDiagnosesStore } from './encounter-diagnoses.store';
import { EncounterVersionChange } from '../../../core/models/encounter.model';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { CIE10_CATALOG } from '../../../core/services/cie10-catalog';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { MockCie10Catalog } from '../../../testing/cie10-mock.catalog';
import { CreatedDiagnosis, Diagnosis } from '../../../core/models/diagnosis.model';
import {
  DIAGNOSES_ACCESS_DENIED_MESSAGE, DIAGNOSES_LOAD_ERROR_MESSAGE, DIAGNOSES_NOT_FOUND_MESSAGE, DIAGNOSIS_CONFLICT_MESSAGE,
  DIAGNOSIS_DUPLICATE_CODE_MESSAGE, DIAGNOSIS_NOT_FOUND_MESSAGE, DIAGNOSIS_RESOURCE_NOT_FOUND_MESSAGE,
  ENCOUNTER_NOT_FOUND_MESSAGE,
} from '../../../shared/utils/encounters-error.util';

const err = (status: number, detail?: string) => new HttpErrorResponse({ status, error: detail ? { detail } : null });

describe('EncounterDiagnosesStore', () => {
  let store: EncounterDiagnosesStore;
  let repo: MockEncountersRepository;
  let versions: EncounterVersionChange[];
  let conflicts: string[];
  let notFound: string[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EncounterDiagnosesStore,
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: CIE10_CATALOG, useClass: MockCie10Catalog },
      ],
    });
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    store = TestBed.inject(EncounterDiagnosesStore);
    versions = [];
    conflicts = [];
    notFound = [];
    store.encounterVersion$.subscribe(v => versions.push(v));
    store.conflict$.subscribe(m => conflicts.push(m));
    store.encounterNotFound$.subscribe(m => notFound.push(m));
  });

  it('setEncounter carga la lista; null la vacía', () => {
    store.setEncounter('enc-2');
    expect(store.diagnoses().map(d => d.id)).toEqual(['dx-2', 'dx-3']);
    expect(store.loading()).toBe(false);
    store.setEncounter(null);
    expect(store.diagnoses()).toEqual([]);
  });

  it('una respuesta de un encounter anterior no pisa la del actual', () => {
    const slow$ = new Subject<Diagnosis[]>();
    const real = repo.listDiagnoses.bind(repo);
    vi.spyOn(repo, 'listDiagnoses').mockImplementation(id => (id === 'enc-1' ? slow$ : real(id)));
    store.setEncounter('enc-1');
    store.setEncounter('enc-2');
    slow$.next([{ id: 'viejo' } as Diagnosis]);
    expect(store.diagnoses().map(d => d.id)).toEqual(['dx-2', 'dx-3']);
  });

  it('create: agrega a la lista sin el campo encounter_version, emite la version nueva y createdSeq', () => {
    store.setEncounter('enc-1');
    store.create({ description: 'Contractura' });
    expect(store.diagnoses().map(d => d.description)).toEqual(['Cefalea', 'Contractura']);
    expect(Object.keys(store.diagnoses()[1])).not.toContain('encounter_version');
    expect(versions).toEqual([{ encounterId: 'enc-1', version: 2 }]);
    expect(store.createdSeq()).toBe(1);
    expect(store.busy()).toBe(false);
  });

  it('remove: saca de la lista y emite la version nueva', () => {
    store.setEncounter('enc-1');
    store.remove('dx-1');
    expect(store.diagnoses()).toEqual([]);
    expect(versions).toEqual([{ encounterId: 'enc-1', version: 2 }]);
  });

  it('guarda de reentrada: con una operación en vuelo no sale otra (ni alta ni baja)', () => {
    store.setEncounter('enc-1');
    const pending$ = new Subject<CreatedDiagnosis>();
    const create = vi.spyOn(repo, 'createDiagnosis').mockReturnValue(pending$);
    const del = vi.spyOn(repo, 'deleteDiagnosis');

    store.create({ description: 'a' });
    store.create({ description: 'b' });
    store.remove('dx-1');

    expect(store.busy()).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
    pending$.complete();
  });

  it('409 de estado: mensaje, conflict$ y recarga la lista', () => {
    store.setEncounter('enc-2');
    const list = vi.spyOn(repo, 'listDiagnoses');
    store.create({ description: 'x' });
    expect(store.actionError()).toBe(DIAGNOSIS_CONFLICT_MESSAGE);
    expect(conflicts).toEqual([DIAGNOSIS_CONFLICT_MESSAGE]);
    expect(list).toHaveBeenCalledWith('enc-2');
  });

  it('409 por código repetido: solo el aviso (sin conflict$ ni recarga)', () => {
    store.setEncounter('enc-1');
    const list = vi.spyOn(repo, 'listDiagnoses');
    store.create({ cie10_code: 'R51' });
    expect(store.actionError()).toBe(DIAGNOSIS_DUPLICATE_CODE_MESSAGE);
    expect(conflicts).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it('404 al borrar un diagnóstico inexistente: se saca de la lista y avisa', () => {
    store.setEncounter('enc-1');
    vi.spyOn(repo, 'deleteDiagnosis').mockReturnValue(throwError(() => err(404, "Diagnosis with id 'dx-1' was not found.")));
    store.remove('dx-1');
    expect(store.diagnoses()).toEqual([]);
    expect(store.actionError()).toBe(DIAGNOSIS_NOT_FOUND_MESSAGE);
    expect(notFound).toEqual([]);
  });

  it('404 del encounter (al crear o borrar) → encounterNotFound$; otro 404 → genérico', () => {
    store.setEncounter('enc-1');
    vi.spyOn(repo, 'createDiagnosis').mockReturnValue(throwError(() => err(404, "Encounter with id 'enc-1' was not found.")));
    store.create({ description: 'x' });
    expect(notFound).toEqual([ENCOUNTER_NOT_FOUND_MESSAGE]);

    vi.spyOn(repo, 'deleteDiagnosis').mockReturnValue(throwError(() => err(404)));
    store.remove('dx-1');
    expect(store.actionError()).toBe(DIAGNOSIS_RESOURCE_NOT_FOUND_MESSAGE);
    expect(store.diagnoses().length).toBe(1);
  });

  it('errores al listar: 403 y 404 sin reintento; otros con reintento', () => {
    const list = vi.spyOn(repo, 'listDiagnoses').mockReturnValue(throwError(() => err(403)));
    store.setEncounter('enc-1');
    expect(store.loadError()).toBe(DIAGNOSES_ACCESS_DENIED_MESSAGE);
    expect(store.loadRetryable()).toBe(false);

    list.mockReturnValue(throwError(() => err(404, "Encounter with id 'enc-2' was not found.")));
    store.setEncounter('enc-2');
    expect(store.loadError()).toBe(DIAGNOSES_NOT_FOUND_MESSAGE);
    expect(store.loadRetryable()).toBe(false);

    list.mockReturnValue(throwError(() => err(500)));
    store.setEncounter('enc-3');
    expect(store.loadError()).toBe(DIAGNOSES_LOAD_ERROR_MESSAGE);
    expect(store.loadRetryable()).toBe(true);
  });

  it('searchCie10 usa CIE10_CATALOG', () => {
    const search = vi.spyOn(TestBed.inject(CIE10_CATALOG), 'search');
    store.searchCie10('migr').subscribe();
    expect(search).toHaveBeenCalledWith('migr');
  });
});
