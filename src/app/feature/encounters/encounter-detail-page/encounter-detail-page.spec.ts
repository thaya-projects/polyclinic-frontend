import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { EncounterDetailPage } from './encounter-detail-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MOCK_CURRENT_USER_ID, MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { ToastService } from '../../../core/services/toast.service';
import { Encounter } from '../../../core/models/encounter.model';
import {
  ADMIN_VOID_ONLY_MESSAGE, ENCOUNTERS_ACCESS_DENIED_MESSAGE, ENCOUNTER_CONFLICT_MESSAGE,
  ENCOUNTER_DRAFT_CONFLICT_MESSAGE, ENCOUNTER_FORBIDDEN_MESSAGE,
  INACTIVE_PROFESSIONAL_MESSAGE, PROFESSIONALS_LOAD_ERROR_MESSAGE,
} from '../../../shared/utils/encounters-error.util';

// T6: la pantalla corre completa contra el mock (sin HTTP). Usuario del mock = profesional prof-1
// (dueño de enc-1/enc-2); enc-3 es de prof-2.
describe('EncounterDetailPage (mock repository)', () => {
  let fixture: ComponentFixture<EncounterDetailPage>;
  let repo: MockEncountersRepository;
  let toast: ToastService;
  let el: HTMLElement;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const q = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const textarea = (field: string) => q(`field-${field}`) as HTMLTextAreaElement;

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

  async function navigateTo(id: string): Promise<void> {
    params$.next(convertToParamMap({ id }));
    await settle();
  }

  function type(field: string, value: string): void {
    const t = textarea(field);
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
      ],
    }).compileComponents();
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    toast = TestBed.inject(ToastService);
  });

  it('firmar envía la version mostrada y actualiza la UI con la respuesta sin recargar', async () => {
    await create('enc-1');
    const getById = vi.spyOn(repo, 'getById');
    const sign = vi.spyOn(repo, 'sign');

    q('btn-sign')!.click();
    await settle();

    expect(sign).toHaveBeenCalledWith('enc-1', { version: 1 });
    expect(q('status-badge')?.textContent).toContain('Firmado');
    expect(q('btn-sign')).toBeNull();
    expect(textarea('anamnesis').readOnly).toBe(true);
    expect(q('signed-info')?.textContent).toContain('Dra. Laura Méndez');
    expect(fixture.componentInstance.encounter()?.version).toBe(2);
    expect(getById).not.toHaveBeenCalled();
  });

  it('muestra el nombre del paciente resuelto por id', async () => {
    const getPatient = vi.spyOn(repo, 'getPatient');
    await create('enc-1');
    // La página de detalle no carga el listado de pacientes: lo resuelve con GET /patients/:id.
    expect(getPatient).toHaveBeenCalledWith('pat-1');
    expect(el.textContent).toContain('Ana Gómez');
  });

  it('cada escritura usa la version nueva que devolvió la anterior', async () => {
    await create('enc-1');
    const update = vi.spyOn(repo, 'update');
    const voidSpy = vi.spyOn(repo, 'void');

    fixture.componentInstance.onSave({ anamnesis: 'v2' });
    await settle();
    fixture.componentInstance.onSign();
    await settle();
    fixture.componentInstance.onVoid('Cargado en paciente equivocado');
    await settle();

    expect(update).toHaveBeenCalledWith('enc-1', { anamnesis: 'v2', version: 1 });
    expect(voidSpy).toHaveBeenCalledWith('enc-1', { reason: 'Cargado en paciente equivocado', version: 3 });
    expect(q('status-badge')?.textContent).toContain('Anulado');
    expect(q('btn-void')).toBeNull();
    expect(q('voided-info')?.textContent).toContain('Cargado en paciente equivocado');
  });

  it('409 por version vieja al firmar: toast de conflicto y recarga el encounter', async () => {
    await create('enc-1');
    await firstValueFrom(repo.update('enc-1', { exam: 'cambiado por otro', version: 1 }));
    const getById = vi.spyOn(repo, 'getById');
    const toastError = vi.spyOn(toast, 'error');

    fixture.componentInstance.onSign();
    await settle();

    expect(toastError).toHaveBeenCalledWith(ENCOUNTER_CONFLICT_MESSAGE);
    expect(getById).toHaveBeenCalledWith('enc-1');
    expect(fixture.componentInstance.encounter()?.version).toBe(2);
    expect(textarea('exam').value).toBe('cambiado por otro');
  });

  it('M1: 409 al guardar recarga la version nueva SIN perder lo escrito y avisa', async () => {
    await create('enc-1');
    await firstValueFrom(repo.update('enc-1', { exam: 'cambiado por otro', version: 1 }));
    const update = vi.spyOn(repo, 'update');

    type('anamnesis', 'Mi anamnesis nueva');
    await settle();
    q('btn-save')!.click();
    await settle();

    expect(q('action-error')?.textContent).toContain(ENCOUNTER_DRAFT_CONFLICT_MESSAGE);
    expect(fixture.componentInstance.encounter()?.version).toBe(2);
    expect(textarea('anamnesis').value).toBe('Mi anamnesis nueva');
    expect(textarea('exam').value).toBe('cambiado por otro');
    expect((q('btn-save') as HTMLButtonElement).disabled).toBe(false);

    q('btn-save')!.click();
    await settle();

    expect(update).toHaveBeenLastCalledWith('enc-1', { anamnesis: 'Mi anamnesis nueva', version: 2 });
    expect(q('action-error')).toBeNull();
    expect(fixture.componentInstance.encounter()?.anamnesis).toBe('Mi anamnesis nueva');
  });

  it('M1: si tras el 409 la nota ya no está abierta, se descarta el borrador y avisa el conflicto', async () => {
    await create('enc-1');
    const signedByOther: Encounter = { ...fixture.componentInstance.encounter()!, status: 'signed', version: 5 };
    vi.spyOn(repo, 'update').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    vi.spyOn(repo, 'getById').mockReturnValue(of(signedByOther));
    const toastError = vi.spyOn(toast, 'error');

    type('anamnesis', 'borrador');
    await settle();
    q('btn-save')!.click();
    await settle();

    expect(toastError).toHaveBeenCalledWith(ENCOUNTER_CONFLICT_MESSAGE);
    expect(fixture.componentInstance.draft()).toBeNull();
    expect(textarea('anamnesis').readOnly).toBe(true);
  });

  it('A2: con un guardado en curso los textareas quedan en solo lectura', async () => {
    await create('enc-1');
    const pending$ = new Subject<Encounter>();
    vi.spyOn(repo, 'update').mockReturnValue(pending$);

    type('anamnesis', 'algo');
    await settle();
    q('btn-save')!.click();
    await settle();

    for (const field of ['chief_complaint', 'anamnesis', 'exam']) expect(textarea(field).readOnly).toBe(true);
    pending$.complete();
  });

  it('B1: un segundo firmar con la operación en vuelo no dispara otro request', async () => {
    await create('enc-1');
    const pending$ = new Subject<Encounter>();
    const sign = vi.spyOn(repo, 'sign').mockReturnValue(pending$);

    fixture.componentInstance.onSign();
    fixture.componentInstance.onSign();
    fixture.componentInstance.onVoid('x');

    expect(sign).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('M3: una respuesta de un id anterior no pisa el encounter actual', async () => {
    const enc1$ = new Subject<Encounter>();
    const enc3 = await firstValueFrom(repo.getById('enc-3'));
    const enc1 = await firstValueFrom(repo.getById('enc-1'));
    vi.spyOn(repo, 'getById').mockImplementation(id => (id === 'enc-1' ? enc1$ : of(enc3)));

    await create('enc-1');
    await navigateTo('enc-3');
    enc1$.next(enc1);
    await settle();

    expect(fixture.componentInstance.encounter()?.id).toBe('enc-3');
  });

  it('M3: la respuesta de una acción iniciada en otro encounter se descarta', async () => {
    await create('enc-1');
    const pending$ = new Subject<Encounter>();
    vi.spyOn(repo, 'sign').mockReturnValue(pending$);
    fixture.componentInstance.onSign();

    await navigateTo('enc-3');
    pending$.next({ ...(await firstValueFrom(repo.getById('enc-1'))), status: 'signed', version: 2 });
    await settle();

    expect(fixture.componentInstance.encounter()?.id).toBe('enc-3');
    expect(q('status-badge')?.textContent).toContain('Abierto');
  });

  it('M3: un 404 que llega con el componente destruido no redirige', async () => {
    const pending$ = new Subject<Encounter>();
    vi.spyOn(repo, 'getById').mockReturnValue(pending$);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await create('enc-1');

    fixture.destroy();
    pending$.error(new HttpErrorResponse({ status: 404 }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('usuario que no es el profesional del encuentro: solo lectura y sin acciones', async () => {
    await create('enc-3');

    expect(textarea('anamnesis').readOnly).toBe(true);
    expect(q('btn-save')).toBeNull();
    expect(q('btn-sign')).toBeNull();
    expect(q('btn-void')).toBeNull();
    expect(q('not-owner-info')?.textContent).toContain(ENCOUNTER_FORBIDDEN_MESSAGE);
  });

  it('profesional propio desactivado sin clinical.void: no puede ver notas (sin llamar al backend)', async () => {
    repo.setProfessionalActive('prof-1', false);
    const getById = vi.spyOn(repo, 'getById');
    await create('enc-1');

    expect(q('access-denied')?.textContent).toContain(ENCOUNTERS_ACCESS_DENIED_MESSAGE);
    expect(getById).not.toHaveBeenCalled();
  });

  it('profesional propio desactivado con clinical.void: solo lectura, aviso de desactivado y anulación administrativa', async () => {
    repo.setProfessionalActive('prof-1', false);
    repo.setCurrentUser(MOCK_CURRENT_USER_ID, ['clinical.void']);
    await create('enc-1');

    expect(textarea('anamnesis').readOnly).toBe(true);
    expect(q('btn-save')).toBeNull();
    expect(q('btn-sign')).toBeNull();
    expect(q('btn-void')?.textContent).toContain('Anular (administrativo)');
    expect(q('not-owner-info')?.textContent).toContain(INACTIVE_PROFESSIONAL_MESSAGE);
  });

  it('M5: mientras cargan los profesionales: "Cargando…" y el GET no sale todavía', async () => {
    const professionals$ = new Subject<never>();
    vi.spyOn(repo, 'listProfessionals').mockReturnValue(professionals$);
    const getById = vi.spyOn(repo, 'getById');
    await create('enc-1');

    expect(q('access-loading')?.textContent).toContain('Cargando…');
    expect(q('btn-sign')).toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  describe('acceso a notas clínicas', () => {
    it('sin profesional ni clinical.void: aviso y sin llamar al backend', async () => {
      repo.setCurrentUser('user-sin-profesional');
      const getById = vi.spyOn(repo, 'getById');
      await create('enc-1');

      expect(q('access-denied')?.textContent).toContain(ENCOUNTERS_ACCESS_DENIED_MESSAGE);
      expect(q('status-badge')).toBeNull();
      expect(getById).not.toHaveBeenCalled();
    });

    it('403 del backend en el GET: mismo aviso', async () => {
      vi.spyOn(repo, 'getById').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
      await create('enc-1');

      expect(q('access-denied')?.textContent).toContain(ENCOUNTERS_ACCESS_DENIED_MESSAGE);
    });
  });

  describe('anulación administrativa (clinical.void)', () => {
    beforeEach(() => repo.setCurrentUser('admin-user', ['clinical.void']));

    it('admin que no es el profesional: solo lectura, sin Guardar/Firmar, con "Anular (administrativo)"', async () => {
      await create('enc-1');

      for (const field of ['chief_complaint', 'anamnesis', 'exam']) expect(textarea(field).readOnly).toBe(true);
      expect(q('btn-save')).toBeNull();
      expect(q('btn-sign')).toBeNull();
      expect(q('btn-void')?.textContent).toContain('Anular (administrativo)');
      expect(q('not-owner-info')?.textContent).toContain(ADMIN_VOID_ONLY_MESSAGE);
    });

    it('anula con éxito un encuentro de otro profesional (motivo + version; voided_by lo pone el backend)', async () => {
      await create('enc-1');
      const voidSpy = vi.spyOn(repo, 'void');

      q('btn-void')!.click();
      await settle();
      fixture.componentInstance.onVoid('Duplicado por error administrativo');
      await settle();

      expect(voidSpy).toHaveBeenCalledWith('enc-1', { reason: 'Duplicado por error administrativo', version: 1 });
      expect(q('status-badge')?.textContent).toContain('Anulado');
      expect(q('btn-void')).toBeNull();
      expect(fixture.componentInstance.encounter()?.voided_by).toBe('admin-user');
    });

    it('también en signed; en voided no hay acciones', async () => {
      await create('enc-2');
      expect(q('btn-void')?.textContent).toContain('Anular (administrativo)');

      await navigateTo('enc-3');
      await firstValueFrom(repo.void('enc-3', { reason: 'x', version: 1 }));
      fixture.componentInstance.reload();
      await settle();
      expect(q('btn-void')).toBeNull();
    });

    it('admin que además es el profesional del encuentro: acciones normales', async () => {
      repo.setCurrentUser(MOCK_CURRENT_USER_ID, ['clinical.void']);
      await create('enc-1');

      expect(textarea('anamnesis').readOnly).toBe(false);
      expect(q('btn-save')).not.toBeNull();
      expect(q('btn-sign')).not.toBeNull();
      expect(q('btn-void')?.textContent?.trim()).toBe('Anular');
    });
  });

  it('M5: si falla la carga de profesionales se informa con Reintentar', async () => {
    const real = repo.listProfessionals();
    vi.spyOn(repo, 'listProfessionals')
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValue(real);
    await create('enc-1');

    expect(q('professionals-error')?.textContent).toContain(PROFESSIONALS_LOAD_ERROR_MESSAGE);
    expect(q('btn-sign')).toBeNull();

    q('professionals-retry')!.click();
    await settle();

    expect(q('professionals-error')).toBeNull();
    expect(q('btn-sign')).not.toBeNull();
  });

  it('403 (por si acaso): muestra que solo el profesional del encuentro puede editar/firmar/anular', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'sign').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    fixture.componentInstance.onSign();
    await settle();

    expect(q('action-error')?.textContent).toContain(ENCOUNTER_FORBIDDEN_MESSAGE);
    expect(q('status-badge')?.textContent).toContain('Abierto');
  });

  it('M7: 404 vuelve al listado reemplazando la URL, con aviso', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await create('no-existe');

    expect(navigate).toHaveBeenCalledWith(['/encounters'], { replaceUrl: true, state: { notice: 'Encuentro no encontrado.' } });
  });

  it('B6: si la carga falla por algo que no es 404 muestra Reintentar', async () => {
    vi.spyOn(repo, 'getById').mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await create('enc-1');

    expect(q('load-error')).not.toBeNull();
    q('load-retry')!.click();
    await settle();

    expect(q('load-error')).toBeNull();
    expect(q('status-badge')?.textContent).toContain('Abierto');
  });

  it('B6: canLeave pregunta solo si hay cambios sin guardar', async () => {
    await create('enc-1');
    expect(fixture.componentInstance.canLeave()).toBe(true);

    type('anamnesis', 'sin guardar');
    await settle();
    const result = fixture.componentInstance.canLeave();
    expect(result).toBeInstanceOf(Promise);
    await settle();
    expect(fixture.componentInstance.leaveConfirmOpen()).toBe(true);

    fixture.componentInstance.resolveLeave(false);
    await expect(result).resolves.toBe(false);
  });

  it('422 (ej. profesional desactivado al firmar): muestra el mensaje del backend traducido', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'sign').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { title: 'Unprocessable Entity', detail: "Professional with id 'abc' is inactive." },
    })));

    fixture.componentInstance.onSign();
    await settle();

    expect(q('action-error')?.textContent).toContain('El profesional del encuentro está desactivado');
  });

  it('el 422 de anular se muestra dentro del diálogo', async () => {
    await create('enc-1');
    vi.spyOn(repo, 'void').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { detail: 'reason cannot exceed 500 characters.' },
    })));

    q('btn-void')!.click();
    await settle();
    fixture.componentInstance.onVoid('motivo');
    await settle();

    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('El motivo de anulación no puede superar los 500 caracteres.');
    expect(fixture.componentInstance.voidOpen()).toBe(true);
    expect(q('action-error')).toBeNull();
  });
});
