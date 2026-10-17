import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, firstValueFrom, throwError } from 'rxjs';
import { EncounterDetailPage } from './encounter-detail-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MEASUREMENTS_REPOSITORY } from '../../../core/services/measurements-repository';
import { CIE10_CATALOG } from '../../../core/services/cie10-catalog';
import { MockCie10Catalog } from '../../../testing/cie10-mock.catalog';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { MockMeasurementsRepository } from '../../../testing/measurements-mock.repository';
import { CreatedMeasurement } from '../../../core/models/measurement.model';
import { CreatedDiagnosis } from '../../../core/models/diagnosis.model';
import { Encounter } from '../../../core/models/encounter.model';
import { ENCOUNTER_NOT_FOUND_MESSAGE } from '../../../shared/utils/encounters-error.util';
import { ToastService } from '../../../core/services/toast.service';
import {
  MEASUREMENT_CONFLICT_MESSAGE, MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE,
} from '../../../shared/utils/measurements-error.util';

// T3/T4: sección "Signos vitales" del detalle, contra los mocks. Usuario del mock = prof-1 (dueño de
// enc-1 open y enc-2 signed); enc-3 es de prof-2.
describe('EncounterDetailPage: signos vitales (mock repositories)', () => {
  let fixture: ComponentFixture<EncounterDetailPage>;
  let encounters: MockEncountersRepository;
  let repo: MockMeasurementsRepository;
  let el: HTMLElement;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el.querySelector<T>(`[data-testid="${testId}"]`);
  const all = (testId: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  const section = () => q('measurements-section')!;
  const items = () => all('measurement-item-type').map(i => i.textContent?.trim());

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function create(id: string): Promise<void> {
    params$.next(convertToParamMap({ id }));
    fixture = TestBed.createComponent(EncounterDetailPage);
    el = fixture.nativeElement as HTMLElement;
    await settle();
  }

  function fillForm(type: string, value: string): void {
    const select = section().querySelector<HTMLSelectElement>('[data-testid="measurement-type"]')!;
    select.value = type;
    select.dispatchEvent(new Event('change'));
    const input = section().querySelector<HTMLInputElement>('[data-testid="measurement-value"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    params$ = new BehaviorSubject(convertToParamMap({ id: 'enc-1' }));
    await TestBed.configureTestingModule({
      imports: [EncounterDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params$.asObservable() } },
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: MEASUREMENTS_REPOSITORY, useClass: MockMeasurementsRepository },
        { provide: CIE10_CATALOG, useClass: MockCie10Catalog },
      ],
    }).compileComponents();
    encounters = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    repo = TestBed.inject(MEASUREMENTS_REPOSITORY) as MockMeasurementsRepository;
  });

  it('muestra solo las mediciones de ese encounter (measured_at desc) y el formulario si es editable', async () => {
    const list = vi.spyOn(repo, 'list');
    await create('enc-1');
    expect(list).toHaveBeenCalledWith('pat-1', expect.objectContaining({ encounter_id: 'enc-1', page: 1 }));
    expect(items()).toEqual(['Frecuencia cardíaca', 'Peso']);
    expect(section().querySelector('[data-testid="measurement-form"]')).not.toBeNull();
  });

  it('registrar va con encounter_id precargado, aparece sin recargar y actualiza la version del encounter', async () => {
    await create('enc-1');
    const createSpy = vi.spyOn(repo, 'create');
    const list = vi.spyOn(repo, 'list');
    const getById = vi.spyOn(encounters, 'getById');
    expect(fixture.componentInstance.encounter()?.version).toBe(1);

    fillForm('temperature', '38.2');
    section().querySelector<HTMLButtonElement>('[data-testid="btn-add-measurement"]')!.click();
    await settle();

    expect(createSpy).toHaveBeenCalledWith('pat-1', expect.objectContaining({
      type: 'temperature', value: 38.2, unit: '°C', encounter_id: 'enc-1',
    }));
    expect(items()).toContain('Temperatura');
    expect(items().length).toBe(3);
    expect(fixture.componentInstance.encounter()?.version).toBe(2);
    expect(list).not.toHaveBeenCalled();
    expect(getById).not.toHaveBeenCalled();
  });

  it('registrar y luego firmar envía la version nueva (sin 409 falso)', async () => {
    await create('enc-1');
    const sign = vi.spyOn(encounters, 'sign');
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    await settle();
    q('btn-sign')!.click();
    await settle();
    expect(sign).toHaveBeenCalledWith('enc-1', { version: 2 });
    expect(q('status-badge')?.textContent).toContain('Firmado');
  });

  it('el encounter_id siempre es el mostrado, aunque el dto traiga otro', async () => {
    await create('enc-1');
    const createSpy = vi.spyOn(repo, 'create');
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70, encounter_id: 'enc-3' });
    expect(createSpy).toHaveBeenCalledWith('pat-1', expect.objectContaining({ encounter_id: 'enc-1' }));
  });

  it('solo lectura si el encounter no está open (signed)', async () => {
    await create('enc-2');
    expect(items()).toEqual(['Peso']);
    expect(section().querySelector('[data-testid="measurement-form"]')).toBeNull();
    const createSpy = vi.spyOn(repo, 'create');
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('solo lectura si el usuario no es el profesional del encuentro', async () => {
    await create('enc-3');
    expect(items()).toEqual(['Presión sistólica']);
    expect(section().querySelector('[data-testid="measurement-form"]')).toBeNull();
  });

  it('409 al registrar (firmado en otro lado): recarga el encounter y pasa a solo lectura', async () => {
    await create('enc-1');
    await firstValueFrom(encounters.sign('enc-1', { version: 1 }));
    const getById = vi.spyOn(encounters, 'getById');

    fillForm('weight', '70');
    section().querySelector<HTMLButtonElement>('[data-testid="btn-add-measurement"]')!.click();
    await settle();

    expect(getById).toHaveBeenCalledWith('enc-1');
    expect(fixture.componentInstance.encounter()?.status).toBe('signed');
    expect(q('measurements-error')?.textContent).toContain(MEASUREMENT_CONFLICT_MESSAGE);
    expect(section().querySelector('[data-testid="measurement-form"]')).toBeNull();
  });

  it('403 al registrar: mensaje en español', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'create').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403,
      error: { detail: "Only the user linked to the encounter's professional can add measurements to encounter 'enc-1'." },
    })));
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    await settle();
    expect(q('measurements-error')?.textContent).toContain(MEASUREMENT_ENCOUNTER_FORBIDDEN_MESSAGE);
  });

  it('404 del encounter al registrar: vuelve al listado con "Encuentro no encontrado."', async () => {
    await create('enc-1');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(repo, 'create').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 404, error: { detail: "Encounter with id 'enc-1' was not found." },
    })));
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/encounters'], expect.objectContaining({ state: { notice: ENCOUNTER_NOT_FOUND_MESSAGE } }));
  });

  it('guarda de reentrada: doble submit → un solo POST', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedMeasurement>();
    const createSpy = vi.spyOn(repo, 'create').mockReturnValue(pending$);
    fillForm('weight', '70');
    const button = section().querySelector<HTMLButtonElement>('[data-testid="btn-add-measurement"]')!;
    button.click();
    button.click();
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 71 });
    expect(createSpy).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('bloqueo cruzado: con una medición en curso, nota y diagnósticos quedan deshabilitados', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedMeasurement>();
    vi.spyOn(repo, 'create').mockReturnValue(pending$);
    const sign = vi.spyOn(encounters, 'sign');
    const createDiagnosis = vi.spyOn(encounters, 'createDiagnosis');

    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    await settle();

    expect(q<HTMLButtonElement>('btn-sign')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('btn-void')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('btn-add-diagnosis')!.disabled).toBe(true);
    fixture.componentInstance.onSign();
    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    expect(sign).not.toHaveBeenCalled();
    expect(createDiagnosis).not.toHaveBeenCalled();
    pending$.complete();
  });

  it('bloqueo cruzado: con un diagnóstico o una firma en curso no se registran mediciones', async () => {
    await create('enc-1');
    const createSpy = vi.spyOn(repo, 'create');
    const diagnosis$ = new Subject<CreatedDiagnosis>();
    vi.spyOn(encounters, 'createDiagnosis').mockReturnValue(diagnosis$);
    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    await settle();
    expect(section().querySelector<HTMLButtonElement>('[data-testid="btn-add-measurement"]')!.disabled).toBe(true);
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    expect(createSpy).not.toHaveBeenCalled();
    diagnosis$.complete();

    const sign$ = new Subject<Encounter>();
    vi.spyOn(encounters, 'sign').mockReturnValue(sign$);
    fixture.componentInstance.diagnoses.pending.set(null);
    fixture.componentInstance.onSign();
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    expect(createSpy).not.toHaveBeenCalled();
    sign$.complete();
  });

  it('respuesta tardía de un alta tras cambiar de encuentro: se descarta entera', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedMeasurement>();
    vi.spyOn(repo, 'create').mockReturnValue(pending$);
    const store = fixture.componentInstance.measurements;
    const conflicts: string[] = [];
    store.conflict$.subscribe(m => conflicts.push(m));
    const success = vi.spyOn(TestBed.inject(ToastService), 'success');

    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    expect(store.saving()).toBe(true);
    params$.next(convertToParamMap({ id: 'enc-3' }));
    await settle();
    expect(store.saving()).toBe(false);

    const seq = store.createdSeq();
    pending$.next({
      id: 'late', patient_id: 'pat-1', encounter_id: 'enc-1', type: 'weight', value: 70, unit: 'kg',
      measured_at: new Date().toISOString(), recorded_by: null, note: null, encounter_version: 9,
    });
    pending$.error(new HttpErrorResponse({ status: 409 }));
    await settle();

    expect(store.createdSeq()).toBe(seq);
    expect(store.saving()).toBe(false);
    expect(store.actionError()).toBeNull();
    expect(conflicts).toEqual([]);
    expect(success).not.toHaveBeenCalled();
    expect(fixture.componentInstance.encounter()?.id).toBe('enc-3');
    expect(fixture.componentInstance.encounter()?.version).toBe(1);
    expect(items()).toEqual(['Presión sistólica']);
  });

  it('si falla el catálogo de tipos: aviso en la sección con Reintentar', async () => {
    const listTypes = vi.spyOn(repo, 'listTypes').mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await create('enc-1');
    const alert = q('measurements-types-error')!;
    expect(alert.getAttribute('role')).toBe('alert');
    q('measurements-types-retry')!.click();
    await settle();
    expect(listTypes).toHaveBeenCalledTimes(2);
    expect(q('measurements-types-error')).toBeNull();
  });

  it('al cambiar de encounter se cargan sus mediciones', async () => {
    await create('enc-1');
    params$.next(convertToParamMap({ id: 'enc-3' }));
    await settle();
    expect(items()).toEqual(['Presión sistólica']);
  });
});
