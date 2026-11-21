import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { OdontogramPage } from './odontogram-page';
import { ODONTOGRAM_REPOSITORY } from '../../../../core/services/odontogram-repository';
import { MockOdontogramRepository } from '../../../../testing/odontogram-mock.repository';
import { DENTAL_CONDITIONS_REPOSITORY } from '../../../../core/services/dental-conditions-repository';
import { MockDentalConditionsRepository } from '../../../../testing/dental-conditions-mock.repository';
import { TOOTH_CONDITIONS_REPOSITORY } from '../../../../core/services/tooth-conditions-repository';
import { MockToothConditionsRepository } from '../../../../testing/tooth-conditions-mock.repository';
import { firstValueFrom } from 'rxjs';
import {
  ODONTOGRAM_CONFLICT_MESSAGE, ODONTOGRAM_DISABLED_MESSAGE, TOOTH_CONDITION_HISTORIC_MESSAGE,
  ODONTOGRAM_ENCOUNTER_NOT_OWNER_MESSAGE, ODONTOGRAM_ENCOUNTER_PROFESSIONAL_INACTIVE_MESSAGE,
} from '../../../../shared/utils/odontogram-error.util';

// La pantalla corre contra el mock (desacoplada de la fuente de datos).
describe('OdontogramPage', () => {
  let fixture: ComponentFixture<OdontogramPage>;
  let repo: MockOdontogramRepository;
  let teethRepo: MockToothConditionsRepository;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routeStub: { paramMap: unknown; snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => el().querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  async function render(patientId: string | null, query: Record<string, string> = {}): Promise<void> {
    routeStub.snapshot.queryParamMap = convertToParamMap(query);
    params.next(convertToParamMap(patientId ? { patientId } : {}));
    fixture = TestBed.createComponent(OdontogramPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({}));
    routeStub = { paramMap: params.asObservable(), snapshot: { queryParamMap: convertToParamMap({}) } };
    TestBed.configureTestingModule({
      imports: [OdontogramPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: ODONTOGRAM_REPOSITORY, useClass: MockOdontogramRepository },
        { provide: DENTAL_CONDITIONS_REPOSITORY, useClass: MockDentalConditionsRepository },
        { provide: TOOTH_CONDITIONS_REPOSITORY, useClass: MockToothConditionsRepository },
      ],
    });
    repo = TestBed.inject(ODONTOGRAM_REPOSITORY) as MockOdontogramRepository;
    teethRepo = TestBed.inject(TOOTH_CONDITIONS_REPOSITORY) as MockToothConditionsRepository;
  });

  it('muestra paciente, dentición, "Actual" y la fecha del snapshot', async () => {
    await render('pat-1');
    expect(q('patient-name')?.textContent).toContain('Ana Gómez');
    const meta = q('odontogram-meta')!.textContent!;
    expect(meta).toContain('Dentición permanente');
    expect(meta).toContain('Actual');
    expect(q('snapshot-date')?.textContent).toContain('2026');
    expect(el().querySelectorAll('[data-testid^="tooth-"]')).toHaveLength(32);
  });

  it('mixta: dibuja las dos grillas', async () => {
    await render('pat-3');
    expect(q('odontogram-meta')!.textContent).toContain('Dentición mixta');
    expect(q('chart-permanent')).not.toBeNull();
    expect(q('chart-temporary')).not.toBeNull();
  });

  it('seleccionar una pieza la muestra en el panel; otro click la deselecciona', async () => {
    await render('pat-1');
    q('tooth-36')!.click();
    fixture.detectChanges();
    expect(q('selected-tooth-number')?.textContent).toContain('36');
    expect(q('selected-tooth-panel')!.textContent).toContain('Primer molar');
    q('tooth-36')!.click();
    fixture.detectChanges();
    expect(q('selected-tooth-number')).toBeNull();
  });

  it('sin current: estado vacío (no error)', async () => {
    await render('pat-2');
    expect(q('empty-state')).not.toBeNull();
    expect(q('load-error')).toBeNull();
  });

  it('módulo apagado: estado bloqueado con mensaje claro', async () => {
    repo.setOdontogramEnabled(false);
    await render('pat-1');
    expect(q('module-disabled')?.textContent).toContain(ODONTOGRAM_DISABLED_MESSAGE);
    expect(q('odontogram-chart')).toBeNull();
  });

  it('sin paciente en la URL: selector que navega al odontograma del paciente elegido', async () => {
    await render(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(q('patient-picker')).not.toBeNull();
    q('pick-pat-2')!.click();
    expect(navigate).toHaveBeenCalledWith(['/patients', 'pat-2', 'odontogram']);
  });

  it('el selector filtra por nombre o documento', async () => {
    await render(null);
    fixture.componentInstance.searchPatients('ruiz');
    fixture.detectChanges();
    expect(q('pick-pat-3')).not.toBeNull();
    expect(q('pick-pat-1')).toBeNull();
  });

  // ── T6: Nuevo odontograma ──────────────────────────────────────────────────────────────────────
  it('nuevo odontograma: elige dentición, recarga el current y avisa que el anterior quedó como histórico', async () => {
    await render('pat-1');
    const page = fixture.componentInstance;
    const previousDate = page.formatDate('2026-03-10T14:30:00Z');
    q('new-odontogram')!.click();
    fixture.detectChanges();
    expect(q('create-history-warning')?.textContent).toContain(previousDate);
    (q('dentition-temporary') as HTMLInputElement).click();
    q('create-submit')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.createOpen()).toBe(false);
    expect(q('notice')?.textContent).toContain(`El odontograma anterior quedó como histórico del ${previousDate}`);
    expect(page.odontogram()).toEqual(expect.objectContaining({ dentition: 'temporary', is_current: true }));
    expect(q('odontogram-meta')!.textContent).toContain('Dentición temporal');
    expect((await firstValueFrom(repo.getById('odo-2'))).is_current).toBe(false);
  });

  it('toma clinical_record_id del paciente y encounter_id del query param', async () => {
    const create = vi.spyOn(repo, 'create');
    await render('pat-1', { encounter_id: 'enc-9' });
    const page = fixture.componentInstance;
    page.openCreate();
    fixture.detectChanges();
    expect(q('create-encounter-note')).not.toBeNull();
    page.onCreate();
    expect(create).toHaveBeenCalledWith('pat-1', { clinical_record_id: 'cr-pat-1', dentition: 'permanent', encounter_id: 'enc-9' });
  });

  it('403 encounter ajeno / 422 profesional inactivo: mensaje en el modal, sin tratarlo como módulo apagado', async () => {
    repo.registerEncounter('enc-foreign', { clinical_record_id: 'cr-pat-1', status: 'open', actor_is_professional: false });
    repo.registerEncounter('enc-inactive', { clinical_record_id: 'cr-pat-1', status: 'open', professional_active: false });
    for (const [encounterId, message] of [
      ['enc-foreign', ODONTOGRAM_ENCOUNTER_NOT_OWNER_MESSAGE],
      ['enc-inactive', ODONTOGRAM_ENCOUNTER_PROFESSIONAL_INACTIVE_MESSAGE],
    ]) {
      await render('pat-1', { encounter_id: encounterId });
      const page = fixture.componentInstance;
      page.openCreate();
      page.onCreate();
      fixture.detectChanges();
      expect(page.createOpen()).toBe(true);
      expect(page.moduleDisabled()).toBe(false);
      expect(page.actionError()).toBe(message);
      expect(page.odontogram()?.id).toBe('odo-2');
    }
  });

  it('sin current: el CTA del estado vacío crea el primero (sin aviso de histórico)', async () => {
    await render('pat-2');
    q('empty-create')!.click();
    fixture.detectChanges();
    expect(q('create-history-warning')).toBeNull();
    fixture.componentInstance.onCreate();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(q('empty-state')).toBeNull();
    expect(q('odontogram-meta')!.textContent).toContain('Actual');
    expect(q('notice')).toBeNull();
  });

  it('409 (carrera del current): cierra el modal, avisa y recarga', async () => {
    await render('pat-1');
    const page = fixture.componentInstance;
    const getCurrent = vi.spyOn(repo, 'getCurrent');
    page.openCreate();
    repo.simulateCurrentConflict();
    page.onCreate();
    fixture.detectChanges();
    expect(page.createOpen()).toBe(false);
    expect(q('notice')?.textContent).toContain(ODONTOGRAM_CONFLICT_MESSAGE);
    expect(getCurrent).toHaveBeenCalledWith('pat-1');
  });

  it('el módulo se apaga con el modal abierto: cierra y bloquea la pantalla', async () => {
    await render('pat-1');
    const page = fixture.componentInstance;
    page.openCreate();
    repo.setOdontogramEnabled(false);
    page.onCreate();
    fixture.detectChanges();
    expect(page.createOpen()).toBe(false);
    expect(q('module-disabled')?.textContent).toContain(ODONTOGRAM_DISABLED_MESSAGE);
    expect(q('new-odontogram')).toBeNull();
  });

  // ── T5: marcar pieza (condiciones por pieza, repositorio mock) ─────────────────────────────────
  const fill = (testId: string) => q(testId)!.getAttribute('fill');

  function pickCondition(id: string): void {
    q(`condition-option-${id}`)!.click();
  }

  function choose(testId: string, value: string): void {
    const select = q(testId) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  it('la grilla pinta las condiciones ya marcadas con el default_color del catálogo', async () => {
    await render('pat-1');
    expect(fill('face-16-center')).toBe('#E53935'); // caries oclusal
    expect(fill('face-16-top')).toBe('none');
    expect(fill('face-36-top')).toBe('#FBC02D'); // corona, pieza completa
    expect(fill('face-36-center')).toBe('#FBC02D');
  });

  it('el panel de la pieza (slot toothActions) lista sus condiciones', async () => {
    await render('pat-1');
    q('tooth-36')!.click();
    fixture.detectChanges();
    const panel = q('selected-tooth-panel')!;
    expect(panel.querySelector('[data-testid="tooth-conditions-panel"]')).not.toBeNull();
    expect(q('tooth-condition-tc-2')!.textContent).toContain('Corona');
    expect(q('tooth-condition-tc-2')!.textContent).toContain('Corona de porcelana');
    expect(q('tooth-condition-tc-1')).toBeNull(); // es de la 16
  });

  it('marcar: agrega al listado y repinta la grilla sin recargar', async () => {
    await render('pat-1');
    const list = vi.spyOn(teethRepo, 'list');
    q('tooth-11')!.click();
    fixture.detectChanges();
    expect(q('tooth-condition-empty')).not.toBeNull();

    pickCondition('dc-own-1');
    choose('state-select', 'planned');
    q('tooth-condition-submit')!.click();
    fixture.detectChanges();

    expect(q('tooth-condition-empty')).toBeNull();
    expect(q('tooth-condition-list')!.textContent).toContain('Sellante');
    expect(q('tooth-condition-list')!.textContent).toContain('Planificado');
    expect(fill('face-11-top')).toBe('#00ACC1');
    expect(list).not.toHaveBeenCalled();
    expect(await firstValueFrom(teethRepo.list('odo-2'))).toContainEqual(
      expect.objectContaining({ tooth_fdi: 11, condition_id: 'dc-own-1', surface: 'whole', state: 'planned' }));
  });

  it('click en una cara: selecciona la pieza y preselecciona esa cara en el formulario', async () => {
    await render('pat-1');
    q('face-21-left')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(q('selected-tooth-number')?.textContent).toContain('21');
    expect((q('surface-select') as HTMLSelectElement).value).toBe('mesial');

    pickCondition('dc-1');
    q('tooth-condition-submit')!.click();
    fixture.detectChanges();
    expect(fill('face-21-left')).toBe('#E53935');
    expect(fill('face-21-right')).toBe('none');
  });

  it('editar desde el listado: cambia la condición y la grilla toma el nuevo color', async () => {
    await render('pat-1');
    q('tooth-36')!.click();
    fixture.detectChanges();
    (q('tooth-condition-tc-2')!.querySelector('[data-testid="edit"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(q('condition-option-dc-3')!.getAttribute('aria-checked')).toBe('true');

    pickCondition('dc-2');
    q('tooth-condition-submit')!.click();
    fixture.detectChanges();
    expect(q('tooth-condition-tc-2')!.textContent).toContain('Obturación');
    expect(fill('face-36-top')).toBe('#1E88E5');
  });

  it('eliminar desde el listado (con confirmación): la quita y despinta la pieza', async () => {
    await render('pat-1');
    q('tooth-46')!.click();
    fixture.detectChanges();
    expect(fill('face-46-top')).toBe('#757575');
    q('remove')!.click();
    fixture.detectChanges();
    q('remove-confirm')!.click();
    fixture.detectChanges();
    expect(q('tooth-condition-empty')).not.toBeNull();
    expect(fill('face-46-top')).toBe('none');
  });

  it('mixta: permite marcar piezas temporales', async () => {
    await render('pat-3');
    q('tooth-85')!.click();
    fixture.detectChanges();
    expect(q('fdi-error')).toBeNull();
    pickCondition('dc-1');
    q('tooth-condition-submit')!.click();
    fixture.detectChanges();
    expect(fill('face-85-center')).toBe('#E53935');
  });

  it('error al marcar (módulo apagado): avisa en el panel y no cambia la grilla', async () => {
    await render('pat-1');
    q('tooth-11')!.click();
    fixture.detectChanges();
    teethRepo.setOdontogramEnabled(false);
    pickCondition('dc-1');
    q('tooth-condition-submit')!.click();
    fixture.detectChanges();
    expect(q('tooth-conditions-error')?.textContent).toContain(ODONTOGRAM_DISABLED_MESSAGE);
    expect(fill('face-11-top')).toBe('none');
  });
  it('odontograma histórico (is_current = false): listado sí, sin formulario ni editar / eliminar', async () => {
    const historic = await firstValueFrom(repo.getById('odo-2'));
    vi.spyOn(repo, 'getCurrent').mockReturnValue(of({ ...historic, is_current: false }));
    await render('pat-1');
    q('tooth-36')!.click();
    fixture.detectChanges();
    expect(q('tooth-condition-tc-2')!.textContent).toContain('Corona');
    expect(q('tooth-conditions-readonly')).not.toBeNull();
    expect(q('tooth-condition-submit')).toBeNull();
    expect(q('edit')).toBeNull();
    expect(q('remove')).toBeNull();
  });

  it('409 al marcar (el odontograma pasó a histórico): avisa y recarga el current', async () => {
    await render('pat-1');
    q('tooth-11')!.click();
    fixture.detectChanges();
    teethRepo.markHistoric('odo-2');
    const getCurrent = vi.spyOn(repo, 'getCurrent');
    pickCondition('dc-1');
    q('tooth-condition-submit')!.click();
    fixture.detectChanges();
    expect(q('notice')?.textContent).toContain(TOOTH_CONDITION_HISTORIC_MESSAGE);
    expect(getCurrent).toHaveBeenCalledWith('pat-1');
    expect(fill('face-11-top')).toBe('none');
  });
});
