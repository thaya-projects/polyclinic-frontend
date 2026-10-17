import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, firstValueFrom, throwError } from 'rxjs';
import { EncounterDetailPage } from './encounter-detail-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MEASUREMENTS_REPOSITORY } from '../../../core/services/measurements-repository';
import { PRESCRIPTIONS_REPOSITORY } from '../../../core/services/prescriptions-repository';
import { CIE10_CATALOG } from '../../../core/services/cie10-catalog';
import { MockCie10Catalog } from '../../../testing/cie10-mock.catalog';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { MockMeasurementsRepository } from '../../../testing/measurements-mock.repository';
import { MockPrescriptionsRepository } from '../../../testing/prescriptions-mock.repository';
import { CreatedPrescription } from '../../../core/models/prescription.model';
import { CreatedMeasurement } from '../../../core/models/measurement.model';
import { ENCOUNTER_NOT_FOUND_MESSAGE } from '../../../shared/utils/encounters-error.util';
import { ToastService } from '../../../core/services/toast.service';
import {
  PRESCRIPTION_CONFLICT_MESSAGE, PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE,
} from '../../../shared/utils/prescriptions-error.util';

// Recetas T4/T5: sección "Recetas" del detalle, contra los mocks. Usuario del mock = prof-1 (dueño de
// enc-1 open con rx-1 y enc-2 signed con rx-5); enc-3 (rx-4) es de prof-2.
describe('EncounterDetailPage: recetas (mock repositories)', () => {
  let fixture: ComponentFixture<EncounterDetailPage>;
  let encounters: MockEncountersRepository;
  let repo: MockPrescriptionsRepository;
  let el: HTMLElement;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el.querySelector<T>(`[data-testid="${testId}"]`);
  const section = () => q('prescriptions-section')!;
  const inSection = <T extends HTMLElement = HTMLElement>(testId: string) =>
    Array.from(section().querySelectorAll<T>(`[data-testid="${testId}"]`));
  const medications = () => inSection('prescription-item-medication').map(c => c.textContent?.trim());

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

  function typeIn(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
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
        { provide: PRESCRIPTIONS_REPOSITORY, useClass: MockPrescriptionsRepository },
        { provide: CIE10_CATALOG, useClass: MockCie10Catalog },
      ],
    }).compileComponents();
    encounters = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    repo = TestBed.inject(PRESCRIPTIONS_REPOSITORY) as MockPrescriptionsRepository;
  });

  it('va debajo de "Signos vitales" y lista las recetas del encuentro con su tabla de ítems', async () => {
    const list = vi.spyOn(repo, 'listByEncounter');
    await create('enc-1');
    const sections = Array.from(el.querySelectorAll('section[data-testid]')).map(s => s.getAttribute('data-testid'));
    expect(sections.indexOf('prescriptions-section')).toBe(sections.indexOf('measurements-section') + 1);
    expect(list).toHaveBeenCalledWith('enc-1');
    expect(inSection('prescription-card').length).toBe(1);
    expect(inSection('prescription-title')[0].textContent).toMatch(/^Receta del /);
    expect(inSection('prescription-notes-text')[0].textContent).toContain('Control en 7 días.');
    expect(medications()).toEqual(['Ibuprofeno', 'Paracetamol']);
    const headers = Array.from(section().querySelectorAll('thead th')).map(th => th.textContent?.trim());
    expect(headers).toEqual(['Medicamento', 'Presentación', 'Dosis', 'Frecuencia', 'Duración', 'Indicaciones']);
    expect(section().querySelector('caption')?.textContent).toContain('Medicamentos de la receta del');
    expect(q('btn-new-prescription')).not.toBeNull();
    expect(inSection('btn-add-item').length).toBe(1);
  });

  it('nueva receta con ítems iniciales: aparece sin recargar y actualiza la version del encuentro', async () => {
    await create('enc-1');
    const createSpy = vi.spyOn(repo, 'createForEncounter');
    const list = vi.spyOn(repo, 'listByEncounter');
    const getById = vi.spyOn(encounters, 'getById');
    q('btn-new-prescription')!.click();
    await settle();

    typeIn(q<HTMLTextAreaElement>('prescription-notes')!, 'Reposo 48 h');
    typeIn(inSection<HTMLInputElement>('item-medication')[0], 'Amoxicilina');
    q('btn-add-row')!.click();
    fixture.detectChanges();
    typeIn(inSection<HTMLInputElement>('item-medication')[1], 'Omeprazol');
    q('btn-submit-prescription')!.click();
    await settle();

    expect(createSpy).toHaveBeenCalledWith('enc-1', {
      notes: 'Reposo 48 h', items: [{ medication: 'Amoxicilina' }, { medication: 'Omeprazol' }],
    });
    expect(inSection('prescription-card').length).toBe(2);
    expect(medications()).toEqual(['Ibuprofeno', 'Paracetamol', 'Amoxicilina', 'Omeprazol']);
    expect(fixture.componentInstance.encounter()?.version).toBe(2);
    expect(q('prescription-form')).toBeNull();
    expect(list).not.toHaveBeenCalled();
    expect(getById).not.toHaveBeenCalled();
  });

  it('agregar varios medicamentos a una receta: cada uno aparece sin recargar y sube la version', async () => {
    await create('enc-1');
    const list = vi.spyOn(repo, 'listByEncounter');
    inSection('btn-add-item')[0].click();
    await settle();
    expect(inSection('btn-add-item')[0].getAttribute('aria-expanded')).toBe('true');

    typeIn(inSection<HTMLInputElement>('item-medication')[0], 'Loratadina');
    q('btn-save-item')!.click();
    await settle();
    typeIn(inSection<HTMLInputElement>('item-medication')[0], 'Salbutamol');
    q('btn-save-item')!.click();
    await settle();

    expect(medications()).toEqual(['Ibuprofeno', 'Paracetamol', 'Loratadina', 'Salbutamol']);
    expect(fixture.componentInstance.encounter()?.version).toBe(3);
    expect(list).not.toHaveBeenCalled();
    // Sigue abierto y limpio para cargar otro.
    expect(q<HTMLInputElement>('item-medication')!.value).toBe('');
  });

  it('el ítem no se guarda sin medication', async () => {
    await create('enc-1');
    const addItem = vi.spyOn(repo, 'addItem');
    inSection('btn-add-item')[0].click();
    await settle();
    q('btn-save-item')!.click();
    await settle();
    expect(addItem).not.toHaveBeenCalled();
    expect(q('item-medication-error')).not.toBeNull();
  });

  it('crear receta y luego firmar envía la version nueva (sin 409 falso)', async () => {
    await create('enc-1');
    const sign = vi.spyOn(encounters, 'sign');
    fixture.componentInstance.onCreatePrescription({ notes: 'x' });
    fixture.componentInstance.onAddPrescriptionItem({ prescriptionId: 'rx-1', dto: { medication: 'A' } });
    await settle();
    q('btn-sign')!.click();
    await settle();
    expect(sign).toHaveBeenCalledWith('enc-1', { version: 3 });
  });

  it('solo lectura si el encuentro no está open (signed)', async () => {
    await create('enc-2');
    expect(medications()).toEqual(['Atorvastatina']);
    expect(q('btn-new-prescription')).toBeNull();
    expect(inSection('btn-add-item')).toEqual([]);
    const createSpy = vi.spyOn(repo, 'createForEncounter');
    const addItem = vi.spyOn(repo, 'addItem');
    fixture.componentInstance.onCreatePrescription({});
    fixture.componentInstance.onAddPrescriptionItem({ prescriptionId: 'rx-5', dto: { medication: 'A' } });
    expect(createSpy).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it('solo lectura si el usuario no es el profesional del encuentro', async () => {
    await create('enc-3');
    expect(medications()).toEqual(['Diclofenac']);
    expect(q('btn-new-prescription')).toBeNull();
    expect(inSection('btn-add-item')).toEqual([]);
  });

  it('409 al emitir (firmado en otro lado): recarga el encuentro y pasa a solo lectura', async () => {
    await create('enc-1');
    await firstValueFrom(encounters.sign('enc-1', { version: 1 }));
    const getById = vi.spyOn(encounters, 'getById');
    q('btn-new-prescription')!.click();
    await settle();
    typeIn(inSection<HTMLInputElement>('item-medication')[0], 'Amoxicilina');
    q('btn-submit-prescription')!.click();
    await settle();

    expect(getById).toHaveBeenCalledWith('enc-1');
    expect(fixture.componentInstance.encounter()?.status).toBe('signed');
    expect(q('prescriptions-error')?.textContent).toContain(PRESCRIPTION_CONFLICT_MESSAGE);
    expect(q('prescriptions-error')?.getAttribute('role')).toBe('alert');
    expect(q('prescription-form')).toBeNull();
    expect(q('btn-new-prescription')).toBeNull();
  });

  it('409 al agregar un medicamento: recarga el encuentro, mensaje en la receta y solo lectura', async () => {
    await create('enc-1');
    await firstValueFrom(encounters.sign('enc-1', { version: 1 }));
    const getById = vi.spyOn(encounters, 'getById');
    fixture.componentInstance.onAddPrescriptionItem({ prescriptionId: 'rx-1', dto: { medication: 'A' } });
    await settle();
    expect(getById).toHaveBeenCalledWith('enc-1');
    expect(q('item-error')?.textContent).toContain(PRESCRIPTION_CONFLICT_MESSAGE);
    expect(inSection('btn-add-item')).toEqual([]);
  });

  it('403 al emitir: mensaje en español', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'createForEncounter').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 403, error: { detail: "Only the user linked to the encounter's professional can add prescriptions to encounter 'enc-1'." },
    })));
    fixture.componentInstance.onCreatePrescription({});
    await settle();
    expect(q('prescriptions-error')?.textContent).toContain(PRESCRIPTION_ENCOUNTER_FORBIDDEN_MESSAGE);
  });

  it('422 al agregar: mensaje del backend traducido, en la receta', async () => {
    await create('enc-1');
    fixture.componentInstance.onAddPrescriptionItem({ prescriptionId: 'rx-1', dto: { medication: 'x'.repeat(201) } });
    await settle();
    expect(q('item-error')?.textContent).toContain('El campo medicamento no puede superar los 200 caracteres.');
  });

  it('401: no muestra error (authInterceptor) y libera la sección', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'createForEncounter').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    fixture.componentInstance.onCreatePrescription({});
    await settle();
    expect(q('prescriptions-error')).toBeNull();
    expect(fixture.componentInstance.sectionsBusy()).toBe(false);
  });

  it('404 del encuentro al emitir: vuelve al listado con "Encuentro no encontrado."', async () => {
    await create('enc-1');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(repo, 'createForEncounter').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 404, error: { detail: "Encounter with id 'enc-1' was not found." },
    })));
    fixture.componentInstance.onCreatePrescription({});
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/encounters'], expect.objectContaining({ state: { notice: ENCOUNTER_NOT_FOUND_MESSAGE } }));
  });

  it('guarda de reentrada: doble submit → un solo POST', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedPrescription>();
    const createSpy = vi.spyOn(repo, 'createForEncounter').mockReturnValue(pending$);
    q('btn-new-prescription')!.click();
    await settle();
    typeIn(inSection<HTMLInputElement>('item-medication')[0], 'Amoxicilina');
    const button = q<HTMLButtonElement>('btn-submit-prescription')!;
    button.click();
    button.click();
    fixture.componentInstance.onCreatePrescription({});
    fixture.componentInstance.onAddPrescriptionItem({ prescriptionId: 'rx-1', dto: { medication: 'A' } });
    expect(createSpy).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('bloqueo cruzado: con una receta en curso, nota, diagnósticos y mediciones quedan deshabilitados', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedPrescription>();
    vi.spyOn(repo, 'createForEncounter').mockReturnValue(pending$);
    const sign = vi.spyOn(encounters, 'sign');
    const createDiagnosis = vi.spyOn(encounters, 'createDiagnosis');
    const createMeasurement = vi.spyOn(TestBed.inject(MEASUREMENTS_REPOSITORY), 'create');

    fixture.componentInstance.onCreatePrescription({});
    await settle();

    expect(q<HTMLButtonElement>('btn-sign')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('btn-add-diagnosis')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('btn-add-measurement')!.disabled).toBe(true);
    fixture.componentInstance.onSign();
    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    expect(sign).not.toHaveBeenCalled();
    expect(createDiagnosis).not.toHaveBeenCalled();
    expect(createMeasurement).not.toHaveBeenCalled();
    pending$.complete();
  });

  it('bloqueo cruzado: con una medición en curso no se emiten recetas ni se agregan ítems', async () => {
    await create('enc-1');
    const createSpy = vi.spyOn(repo, 'createForEncounter');
    const addItem = vi.spyOn(repo, 'addItem');
    const measurement$ = new Subject<CreatedMeasurement>();
    vi.spyOn(TestBed.inject(MEASUREMENTS_REPOSITORY), 'create').mockReturnValue(measurement$);
    fixture.componentInstance.onCreateMeasurement({ type: 'weight', value: 70 });
    await settle();
    expect(q<HTMLButtonElement>('btn-new-prescription')!.disabled).toBe(true);
    expect(inSection<HTMLButtonElement>('btn-add-item')[0].disabled).toBe(true);
    fixture.componentInstance.onCreatePrescription({});
    fixture.componentInstance.onAddPrescriptionItem({ prescriptionId: 'rx-1', dto: { medication: 'A' } });
    expect(createSpy).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
    measurement$.complete();
  });

  it('respuesta tardía de un alta tras cambiar de encuentro: se descarta entera', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedPrescription>();
    vi.spyOn(repo, 'createForEncounter').mockReturnValue(pending$);
    const store = fixture.componentInstance.prescriptions;
    const conflicts: string[] = [];
    store.conflict$.subscribe(m => conflicts.push(m));
    const success = vi.spyOn(TestBed.inject(ToastService), 'success');

    fixture.componentInstance.onCreatePrescription({});
    expect(store.busy()).toBe(true);
    params$.next(convertToParamMap({ id: 'enc-3' }));
    await settle();
    expect(store.busy()).toBe(false);

    const seq = store.createdSeq();
    pending$.next({
      id: 'late', patient_id: 'pat-1', professional_id: 'prof-1', encounter_id: 'enc-1', issued_at: new Date().toISOString(),
      notes: null, items: [], encounter_version: 9,
    });
    pending$.error(new HttpErrorResponse({ status: 409 }));
    await settle();

    expect(store.createdSeq()).toBe(seq);
    expect(store.actionError()).toBeNull();
    expect(conflicts).toEqual([]);
    expect(success).not.toHaveBeenCalled();
    expect(fixture.componentInstance.encounter()?.id).toBe('enc-3');
    expect(fixture.componentInstance.encounter()?.version).toBe(1);
    expect(medications()).toEqual(['Diclofenac']);
  });
});
