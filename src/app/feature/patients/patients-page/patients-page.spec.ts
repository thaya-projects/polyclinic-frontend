import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { PatientsPage } from './patients-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { Patient } from '../../../core/models/patient.model';

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
