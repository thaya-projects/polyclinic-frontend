import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, firstValueFrom, throwError } from 'rxjs';
import { EncounterDetailPage } from './encounter-detail-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { CIE10_CATALOG } from '../../../core/services/cie10-catalog';
import { MockCie10Catalog } from '../../../testing/cie10-mock.catalog';
import { MOCK_CURRENT_USER_ID, MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { CreatedDiagnosis } from '../../../core/models/diagnosis.model';
import { Encounter } from '../../../core/models/encounter.model';
import {
  DIAGNOSES_ACCESS_DENIED_MESSAGE, DIAGNOSIS_CONFLICT_MESSAGE, DIAGNOSIS_DUPLICATE_CODE_MESSAGE,
  DIAGNOSIS_FORBIDDEN_MESSAGE, DIAGNOSIS_INACTIVE_PROFESSIONAL_MESSAGE,
} from '../../../shared/utils/encounters-error.util';

// T4/T5: sección de diagnósticos dentro del detalle, contra el mock. Usuario del mock = prof-1
// (dueño de enc-1 open y enc-2 signed); enc-3 es de prof-2.
describe('EncounterDetailPage: diagnósticos (mock repository)', () => {
  let fixture: ComponentFixture<EncounterDetailPage>;
  let repo: MockEncountersRepository;
  let el: HTMLElement;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const q = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const all = (testId: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  const items = () => all('diagnosis-item').map(i => i.querySelector('[data-testid="diagnosis-description"]')?.textContent?.trim());

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

  function typeDescription(value: string): void {
    const t = q('diagnosis-description-input') as HTMLTextAreaElement;
    t.value = value;
    t.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    params$ = new BehaviorSubject(convertToParamMap({ id: 'enc-1' }));
    await TestBed.configureTestingModule({
      imports: [EncounterDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params$.asObservable() } },
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: CIE10_CATALOG, useClass: MockCie10Catalog },
      ],
    }).compileComponents();
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
  });

  it('encounter open del propio profesional: listado + formulario + eliminar', async () => {
    await create('enc-1');
    expect(items()).toEqual(['Cefalea']);
    expect(q('diagnosis-form')).not.toBeNull();
    expect(q('btn-delete-diagnosis')).not.toBeNull();
  });

  it('agregar actualiza la lista sin recargar (sin volver a pedir el listado)', async () => {
    await create('enc-1');
    const list = vi.spyOn(repo, 'listDiagnoses');
    typeDescription('Contractura cervical');
    await settle();
    q('btn-add-diagnosis')!.click();
    await settle();

    expect(items()).toEqual(['Cefalea', 'Contractura cervical']);
    expect(list).not.toHaveBeenCalled();
    expect((q('diagnosis-description-input') as HTMLTextAreaElement).value).toBe('');
  });

  it('eliminar (con confirmación) actualiza la lista', async () => {
    await create('enc-1');
    const del = vi.spyOn(repo, 'deleteDiagnosis');
    q('btn-delete-diagnosis')!.click();
    await settle();
    const confirm = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find(b => b.textContent?.trim() === 'Eliminar')!;
    confirm.click();
    await settle();

    expect(del).toHaveBeenCalledWith('enc-1', 'dx-1');
    expect(items()).toEqual([]);
    expect(q('diagnoses-empty')).not.toBeNull();
    expect(await firstValueFrom(repo.listDiagnoses('enc-1'))).toEqual([]);
  });

  it('solo lectura si el encounter no está open (signed)', async () => {
    await create('enc-2');
    expect(items()).toEqual(['Examen médico general', 'Sobrepeso leve, control en 6 meses']);
    expect(q('diagnosis-form')).toBeNull();
    expect(q('btn-delete-diagnosis')).toBeNull();
  });

  it('solo lectura si el usuario no es el profesional del encuentro', async () => {
    await create('enc-3');
    expect(q('diagnoses-empty')).not.toBeNull();
    expect(q('diagnosis-form')).toBeNull();
    expect(q('btn-delete-diagnosis')).toBeNull();
  });

  it('solo lectura si es el profesional pero está inactivo (con clinical.void para poder leer)', async () => {
    repo.setProfessionalActive('prof-1', false);
    repo.setCurrentUser(MOCK_CURRENT_USER_ID, ['clinical.void']);
    await create('enc-1');
    expect(items()).toEqual(['Cefalea']);
    expect(q('diagnosis-form')).toBeNull();
    expect(q('btn-delete-diagnosis')).toBeNull();
  });

  it('409 al agregar (firmado en otro lado): recarga el encounter y la sección pasa a solo lectura', async () => {
    await create('enc-1');
    await firstValueFrom(repo.sign('enc-1', { version: 1 }));
    const getById = vi.spyOn(repo, 'getById');

    typeDescription('Algo');
    await settle();
    q('btn-add-diagnosis')!.click();
    await settle();

    expect(getById).toHaveBeenCalledWith('enc-1');
    expect(fixture.componentInstance.encounter()?.status).toBe('signed');
    expect(q('diagnoses-error')?.textContent).toContain(DIAGNOSIS_CONFLICT_MESSAGE);
    expect(q('diagnosis-form')).toBeNull();
    expect(q('btn-delete-diagnosis')).toBeNull();
  });

  it('409 al eliminar (anulado en otro lado): mensaje, recarga el encounter y la sección queda en solo lectura', async () => {
    await create('enc-1');
    await firstValueFrom(repo.void('enc-1', { reason: 'x', version: 1 }));
    const getById = vi.spyOn(repo, 'getById');

    fixture.componentInstance.onRemoveDiagnosis('dx-1');
    await settle();

    expect(getById).toHaveBeenCalledWith('enc-1');
    expect(fixture.componentInstance.encounter()?.status).toBe('voided');
    expect(q('diagnoses-error')?.textContent).toContain(DIAGNOSIS_CONFLICT_MESSAGE);
    expect(items()).toEqual(['Cefalea']);
    expect(q('diagnosis-form')).toBeNull();
    expect(q('btn-delete-diagnosis')).toBeNull();
  });

  it('agregar un diagnóstico y luego firmar envía la version nueva (sin recargar)', async () => {
    await create('enc-1');
    const getById = vi.spyOn(repo, 'getById');
    const sign = vi.spyOn(repo, 'sign');

    typeDescription('Contractura');
    await settle();
    q('btn-add-diagnosis')!.click();
    await settle();
    expect(fixture.componentInstance.encounter()?.version).toBe(2);

    q('btn-sign')!.click();
    await settle();

    expect(sign).toHaveBeenCalledWith('enc-1', { version: 2 });
    expect(q('status-badge')?.textContent).toContain('Firmado');
    expect(getById).not.toHaveBeenCalled();
  });

  it('eliminar y luego guardar la nota envía la version nueva, sin perder lo escrito', async () => {
    await create('enc-1');
    const update = vi.spyOn(repo, 'update');
    const anamnesis = q('field-anamnesis') as HTMLTextAreaElement;
    anamnesis.value = 'Escrito antes de borrar';
    anamnesis.dispatchEvent(new Event('input'));
    await settle();

    fixture.componentInstance.onRemoveDiagnosis('dx-1');
    await settle();
    expect((q('field-anamnesis') as HTMLTextAreaElement).value).toBe('Escrito antes de borrar');

    q('btn-save')!.click();
    await settle();
    expect(update).toHaveBeenCalledWith('enc-1', { anamnesis: 'Escrito antes de borrar', version: 2 });
  });

  it('409 por código repetido: aviso propio y NO recarga el encounter', async () => {
    await create('enc-1');
    const getById = vi.spyOn(repo, 'getById');
    fixture.componentInstance.onCreateDiagnosis({ cie10_code: 'R51' });
    await settle();

    expect(q('diagnoses-error')?.textContent).toContain(DIAGNOSIS_DUPLICATE_CODE_MESSAGE);
    expect(getById).not.toHaveBeenCalled();
    expect(q('diagnosis-form')).not.toBeNull();
  });

  it('con una operación de diagnósticos en curso: Firmar, Guardar y Anular deshabilitados', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedDiagnosis>();
    vi.spyOn(repo, 'createDiagnosis').mockReturnValue(pending$);
    const sign = vi.spyOn(repo, 'sign');

    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    await settle();

    expect((q('btn-sign') as HTMLButtonElement).disabled).toBe(true);
    expect((q('btn-void') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.onSign();
    fixture.componentInstance.openVoid();
    expect(sign).not.toHaveBeenCalled();
    expect(fixture.componentInstance.voidOpen()).toBe(false);
    pending$.complete();
  });

  it('mientras se firma: la sección de diagnósticos queda deshabilitada', async () => {
    await create('enc-1');
    const pending$ = new Subject<Encounter>();
    vi.spyOn(repo, 'sign').mockReturnValue(pending$);
    const createSpy = vi.spyOn(repo, 'createDiagnosis');

    fixture.componentInstance.onSign();
    await settle();

    expect((q('btn-add-diagnosis') as HTMLButtonElement).disabled).toBe(true);
    expect((q('btn-delete-diagnosis') as HTMLButtonElement).disabled).toBe(true);
    expect((q('cie10-input') as HTMLInputElement).disabled).toBe(true);
    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    expect(createSpy).not.toHaveBeenCalled();
    pending$.complete();
  });

  it('guarda de reentrada: doble submit → un solo POST', async () => {
    await create('enc-1');
    const pending$ = new Subject<CreatedDiagnosis>();
    const createSpy = vi.spyOn(repo, 'createDiagnosis').mockReturnValue(pending$);
    typeDescription('Algo');
    await settle();

    q('btn-add-diagnosis')!.click();
    q('btn-add-diagnosis')!.click();
    fixture.componentInstance.onCreateDiagnosis({ description: 'otra vez' });

    expect(createSpy).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('403 al agregar: mensaje en español', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'createDiagnosis').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    await settle();
    expect(q('diagnoses-error')?.textContent).toContain(DIAGNOSIS_FORBIDDEN_MESSAGE);
  });

  it('422 al agregar: mensaje del backend traducido (profesional inactivo)', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'createDiagnosis').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { detail: "Professional with id 'prof-1' is inactive." },
    })));
    fixture.componentInstance.onCreateDiagnosis({ description: 'x' });
    await settle();
    expect(q('diagnoses-error')?.textContent).toContain(DIAGNOSIS_INACTIVE_PROFESSIONAL_MESSAGE);
  });

  it('403 al leer los diagnósticos: aviso en la sección, sin Reintentar', async () => {
    vi.spyOn(repo, 'listDiagnoses').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await create('enc-1');
    expect(q('diagnoses-load-error')?.textContent).toContain(DIAGNOSES_ACCESS_DENIED_MESSAGE);
    expect(q('diagnoses-retry')).toBeNull();
  });

  it('al cambiar de encounter se cargan sus diagnósticos', async () => {
    await create('enc-1');
    params$.next(convertToParamMap({ id: 'enc-2' }));
    await settle();
    expect(items()).toEqual(['Examen médico general', 'Sobrepeso leve, control en 6 meses']);
  });
});
