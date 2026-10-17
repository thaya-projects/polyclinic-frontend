import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { OdontogramPage } from './odontogram-page';
import { ODONTOGRAM_REPOSITORY } from '../../../../core/services/odontogram-repository';
import { MockOdontogramRepository } from '../../../../testing/odontogram-mock.repository';
import { ODONTOGRAM_DISABLED_MESSAGE } from '../../../../shared/utils/odontogram-error.util';

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
});
