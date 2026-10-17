import { TestBed } from '@angular/core/testing';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { MeasurementsStore } from './measurements.store';
import { MEASUREMENTS_REPOSITORY, MeasurementsRepository } from '../../core/services/measurements-repository';
import { CreatedMeasurement, Measurement, MeasurementsQuery } from '../../core/models/measurement.model';
import { PagedResult } from '../../core/models/paged-result.model';
import { ToastService } from '../../core/services/toast.service';

function m(id: string, measuredAt: string, extra: Partial<Measurement> = {}): Measurement {
  return {
    id, patient_id: 'p1', encounter_id: null, type: 'weight', value: 70, unit: 'kg', measured_at: measuredAt,
    recorded_by: 'u1', note: null, ...extra,
  };
}

function created(measurement: Measurement, encounterVersion: number | null = null): CreatedMeasurement {
  return { ...measurement, encounter_version: encounterVersion };
}

function paged(items: Measurement[], total: number, query: MeasurementsQuery): PagedResult<Measurement> {
  return { items, total_count: total, current_page: query.page, page_size: query.limit, total_pages: Math.ceil(total / query.limit) };
}

// Unidad del store con un repositorio falso (respuestas controladas).
describe('MeasurementsStore', () => {
  let store: MeasurementsStore;
  let listImpl: (patientId: string, query: MeasurementsQuery) => Observable<PagedResult<Measurement>>;
  let createImpl: () => Observable<CreatedMeasurement>;
  let repo: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; listTypes: ReturnType<typeof vi.fn> };

  // Página 1 (tamaño 3) y página 2 de un paciente con 5 mediciones.
  const PAGE_1 = [m('a', '2026-10-10T12:00:00Z'), m('b', '2026-10-09T12:00:00Z'), m('c', '2026-10-08T12:00:00Z')];
  const PAGE_2 = [m('d', '2026-10-07T12:00:00Z'), m('e', '2026-10-06T12:00:00Z')];

  beforeEach(() => {
    listImpl = (_p, query) => of(paged(query.page === 1 ? PAGE_1 : PAGE_2, 5, query));
    createImpl = () => EMPTY;
    repo = {
      list: vi.fn((p: string, q: MeasurementsQuery) => listImpl(p, q)),
      create: vi.fn(() => createImpl()),
      listTypes: vi.fn(() => of([])),
    };
    TestBed.configureTestingModule({
      providers: [MeasurementsStore, { provide: MEASUREMENTS_REPOSITORY, useValue: repo as unknown as MeasurementsRepository }],
    });
    store = TestBed.inject(MeasurementsStore);
    store.setScope({ patientId: 'p1', encounterId: null }, 3);
  });

  const ids = () => store.items().map(x => x.id);

  it('carga la página 1 ordenada (measured_at desc)', () => {
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(store.total()).toBe(5);
  });

  it('alta que entra en la página mostrada: se inserta en orden, sin recargar; la página no pasa de su tamaño', () => {
    createImpl = () => of(created(m('n', '2026-10-09T18:00:00Z')));
    repo.list.mockClear();
    store.create({ type: 'weight', value: 70 });
    expect(ids()).toEqual(['a', 'n', 'b']);
    expect(store.total()).toBe(6);
    expect(repo.list).not.toHaveBeenCalled();
    expect(store.createdSeq()).toBe(1);
  });

  it('página llena y la medición va después de la última: la página no cambia, el total sí', () => {
    createImpl = () => of(created(m('old', '2026-01-01T00:00:00Z')));
    store.create({ type: 'weight', value: 70 });
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(store.total()).toBe(6);
  });

  it('página > 1 y la medición cae en una página anterior: recarga la página actual', () => {
    store.setPage(2);
    expect(ids()).toEqual(['d', 'e']);
    repo.list.mockClear();
    createImpl = () => of(created(m('new', '2026-10-17T00:00:00Z')));
    store.create({ type: 'weight', value: 70 });
    expect(repo.list).toHaveBeenCalledTimes(1);
    expect(repo.list).toHaveBeenCalledWith('p1', expect.objectContaining({ page: 2 }));
  });

  it('página > 1 y la medición cae en esta página: se inserta sin recargar', () => {
    store.setPage(2);
    repo.list.mockClear();
    createImpl = () => of(created(m('mid', '2026-10-06T18:00:00Z')));
    store.create({ type: 'weight', value: 70 });
    expect(repo.list).not.toHaveBeenCalled();
    expect(ids()).toEqual(['d', 'mid', 'e']);
  });

  it('filtro que no cumple: ni se inserta ni cuenta', () => {
    store.setTypeFilter('weight');
    createImpl = () => of(created(m('s', '2026-10-17T00:00:00Z', { type: 'spo2', unit: '%' })));
    store.create({ type: 'spo2', value: 97 });
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(store.total()).toBe(5);
    expect(store.createdSeq()).toBe(1);
  });

  it('empate de measured_at: desempata por id asc, como el backend', () => {
    createImpl = () => of(created(m('aa', '2026-10-09T12:00:00Z')));
    store.create({ type: 'weight', value: 70 });
    expect(ids()).toEqual(['a', 'aa', 'b']);

    createImpl = () => of(created(m('0', '2026-10-10T12:00:00Z')));
    store.create({ type: 'weight', value: 70 });
    expect(ids()).toEqual(['0', 'a', 'aa']);
  });

  it('dedupe por id: una medición que ya está no se duplica ni suma al total', () => {
    createImpl = () => of(created(m('b', '2026-10-09T12:00:00Z')));
    store.create({ type: 'weight', value: 70 });
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(store.total()).toBe(5);
  });

  it('respuesta tardía tras cambiar de ámbito: se descarta (sin saving, createdSeq, aviso ni conflict$)', () => {
    const pending$ = new Subject<CreatedMeasurement>();
    createImpl = () => pending$;
    const success = vi.spyOn(TestBed.inject(ToastService), 'success');
    const versions: unknown[] = [];
    const conflicts: unknown[] = [];
    store.encounterVersion$.subscribe(v => versions.push(v));
    store.conflict$.subscribe(c => conflicts.push(c));

    store.create({ type: 'weight', value: 70, encounter_id: 'e1' });
    expect(store.saving()).toBe(true);
    store.setScope({ patientId: 'p2', encounterId: null }, 3);
    expect(store.saving()).toBe(false);

    pending$.next(created(m('late', '2026-10-17T00:00:00Z', { encounter_id: 'e1' }), 4));
    pending$.complete();
    expect(store.createdSeq()).toBe(0);
    expect(store.actionError()).toBeNull();
    expect(success).not.toHaveBeenCalled();
    expect(versions).toEqual([]);
    expect(conflicts).toEqual([]);
    expect(ids()).not.toContain('late');
  });

  it('respuesta tardía de un listado anterior: no pisa el actual', () => {
    const slow$ = new Subject<PagedResult<Measurement>>();
    listImpl = (_p, query) => (query.type === 'weight' ? slow$ : of(paged([m('x', '2026-10-01T00:00:00Z')], 1, query)));
    store.setTypeFilter('weight');
    store.setTypeFilter('');
    slow$.next(paged(PAGE_1, 5, { page: 1, limit: 3 }));
    expect(ids()).toEqual(['x']);
  });

  it('alta que completa sin emitir: libera saving y avisa', () => {
    createImpl = () => EMPTY;
    store.create({ type: 'weight', value: 70 });
    expect(store.saving()).toBe(false);
    expect(store.actionError()).toBe('No se pudo registrar la medición.');
    expect(store.createdSeq()).toBe(0);
  });

  it('listado que completa sin emitir: deja de cargar y muestra error reintentable', () => {
    listImpl = () => EMPTY;
    store.load();
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBeTruthy();
    expect(store.loadRetryable()).toBe(true);
  });

  it('catálogo que completa sin emitir: error de tipos (reintentable)', () => {
    TestBed.resetTestingModule();
    repo.listTypes.mockReturnValue(EMPTY);
    TestBed.configureTestingModule({
      providers: [MeasurementsStore, { provide: MEASUREMENTS_REPOSITORY, useValue: repo as unknown as MeasurementsRepository }],
    });
    const fresh = TestBed.inject(MeasurementsStore);
    fresh.setScope({ patientId: 'p1', encounterId: null }, 3);
    expect(fresh.typesError()).toBeTruthy();
    repo.listTypes.mockReturnValue(of([{ type: 'weight', unit: 'kg', min: 0.2, max: 700 }]));
    fresh.loadTypes();
    expect(fresh.typesError()).toBeNull();
    expect(fresh.types().length).toBe(1);
  });

  it('guarda de reentrada: con un alta en vuelo no sale otra', () => {
    const pending$ = new Subject<CreatedMeasurement>();
    createImpl = () => pending$;
    store.create({ type: 'weight', value: 70 });
    store.create({ type: 'weight', value: 71 });
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
});
