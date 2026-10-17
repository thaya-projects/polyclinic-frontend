import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { OdontogramPage } from './odontogram-page';
import { ODONTOGRAM_REPOSITORY } from '../../../../core/services/odontogram-repository';
import { MockOdontogramRepository } from '../../../../testing/odontogram-mock.repository';
import { firstValueFrom } from 'rxjs';
import {
  ODONTOGRAM_CONFLICT_MESSAGE, ODONTOGRAM_DISABLED_MESSAGE,
} from '../../../../shared/utils/odontogram-error.util';

// La pantalla corre contra el mock (desacoplada de la fuente de datos).
describe('OdontogramPage', () => {
  let fixture: ComponentFixture<OdontogramPage>;
  let repo: MockOdontogramRepository;
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
      ],
    });
    repo = TestBed.inject(ODONTOGRAM_REPOSITORY) as MockOdontogramRepository;
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
    expect(q('chart-permanente')).not.toBeNull();
    expect(q('chart-temporal')).not.toBeNull();
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
    (q('dentition-temporal') as HTMLInputElement).click();
    q('create-submit')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.createOpen()).toBe(false);
    expect(q('notice')?.textContent).toContain(`El odontograma anterior quedó como histórico del ${previousDate}`);
    expect(page.odontogram()).toEqual(expect.objectContaining({ dentition: 'temporal', is_current: true }));
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
    expect(create).toHaveBeenCalledWith('pat-1', { clinical_record_id: 'cr-pat-1', dentition: 'permanente', encounter_id: 'enc-9' });
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
});
