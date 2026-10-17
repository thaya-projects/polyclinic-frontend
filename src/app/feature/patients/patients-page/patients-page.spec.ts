import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { PatientsPage } from './patients-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { Patient } from '../../../core/models/patient.model';
import { FeaturesService } from '../../../core/services/features.service';

const PATIENT: Patient = {
  id: 'pat-1', first_name: 'Ana', last_name: 'Gómez', document_type: 'dni', document_number: '30111222',
  birth_date: null, sex: '', whatsapp_phone: '', phone_alt: null, email: null, address: null, notes: null,
  is_active: true,
};

// Fase 4: botones "Encuentros" / "Nueva nota" de la ficha según el acceso a notas clínicas.
describe('PatientsPage: botones de encuentros', () => {
  let fixture: ComponentFixture<PatientsPage>;
  let repo: MockEncountersRepository;

  const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

  async function openDetail(patient: Patient = PATIENT): Promise<void> {
    fixture = TestBed.createComponent(PatientsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openDetail(patient);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
  });

  afterEach(() => {
    fixture?.componentInstance.closeModal();
    fixture?.detectChanges();
  });

  it('profesional activo: ambos botones habilitados', async () => {
    await openDetail();
    expect(q('patient-encounters')?.disabled).toBe(false);
    expect(q('patient-new-encounter')?.disabled).toBe(false);
  });

  it('sin profesional ni clinical.void: los botones se ocultan', async () => {
    repo.setCurrentUser('user-sin-profesional');
    await openDetail();
    expect(q('patient-encounters')).toBeNull();
    expect(q('patient-new-encounter')).toBeNull();
  });

  it('admin con clinical.void sin profesional: ve Encuentros, "Nueva nota" deshabilitada', async () => {
    repo.setCurrentUser('admin-user', ['clinical.void']);
    await openDetail();
    expect(q('patient-encounters')?.disabled).toBe(false);
    expect(q('patient-new-encounter')?.disabled).toBe(true);
    expect(q('patient-new-encounter')?.title).toBe('Solo profesionales pueden crear encuentros.');
  });

  it('mientras se verifica el acceso: deshabilitados con "Cargando…"', async () => {
    vi.spyOn(repo, 'listProfessionals').mockReturnValue(new Subject());
    await openDetail();
    expect(q('patient-encounters')?.disabled).toBe(true);
    expect(q('patient-encounters')?.title).toBe('Cargando…');
  });

  it('paciente inactivo: "Nueva nota" deshabilitada con "Paciente inactivo"', async () => {
    await openDetail({ ...PATIENT, is_active: false });
    expect(q('patient-new-encounter')?.disabled).toBe(true);
    expect(q('patient-new-encounter')?.title).toBe('Paciente inactivo');
  });
});

// Fase 6: botón "Odontograma" de la ficha según el módulo "odontogram" del tenant.
describe('PatientsPage: acceso al odontograma', () => {
  let fixture: ComponentFixture<PatientsPage>;
  let http: HttpTestingController;

  const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

  async function openDetailWith(odontogram: boolean): Promise<void> {
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(r => r.url.endsWith('/tenants/me/features')).flush({ modules: { odontogram } });
    fixture = TestBed.createComponent(PatientsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openDetail(PATIENT);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.componentInstance.closeModal();
    fixture?.detectChanges();
  });

  it('módulo activo: "Odontograma" cierra la ficha y navega a /patients/:id/odontogram', async () => {
    await openDetailWith(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    q('patient-odontogram')!.click();
    expect(fixture.componentInstance.modalMode()).toBe('none');
    expect(navigate).toHaveBeenCalledWith(['/patients', 'pat-1', 'odontogram']);
  });

  it('módulo apagado: sin botón "Odontograma"', async () => {
    await openDetailWith(false);
    expect(q('patient-odontogram')).toBeNull();
  });
});
