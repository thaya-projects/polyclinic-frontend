import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { PatientDetailPage } from './patient-detail-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { Patient } from '../../../core/models/patient.model';
import { FeaturesService } from '../../../core/services/features.service';

@Component({ template: '' })
class Stub {}

const PATIENT: Patient = {
  id: 'pat-1', first_name: 'Ana', last_name: 'Gómez', document_type: 'dni', document_number: '30111222',
  birth_date: null, sex: null, whatsapp_phone: '', phone_alt: null, email: null, address: null, notes: null,
  is_active: true,
};

const ROUTES = [
  { path: 'patients/:patientId', component: PatientDetailPage },
  { path: 'patients', component: Stub },
  { path: 'encounters', component: Stub },
  { path: 'patients/:patientId/measurements', component: Stub },
  { path: 'patients/:patientId/prescriptions', component: Stub },
  { path: 'patients/:patientId/odontogram', component: Stub },
];

// Fase 4: botones "Encuentros" / "Nueva nota" de la ficha según el acceso a notas clínicas.
// Saltado: ENCOUNTER_QUICK_ACTIONS_VISIBLE en patient-ficha-tabs.ts está en
// false (ocultos a pedido, no se quitó el código) — reactivar junto con eso.
describe.skip('PatientDetailPage: botones de encuentros', () => {
  let harness: RouterTestingHarness;
  let repo: MockEncountersRepository;
  let http: HttpTestingController;

  const el = () => harness.routeNativeElement as HTMLElement;
  const q = (testId: string) => el().querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

  async function open(patient: Patient = PATIENT): Promise<void> {
    await harness.navigateByUrl(`/patients/${patient.id}`, PatientDetailPage);
    http.expectOne(r => r.url.endsWith(`/tenants/patients/${patient.id}`)).flush(patient);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  it('profesional activo: ambos botones habilitados', async () => {
    await open();
    expect(q('patient-encounters')?.disabled).toBe(false);
    expect(q('patient-new-encounter')?.disabled).toBe(false);
  });

  it('"Signos vitales" junto a "Encuentros": habilitado y navega a /patients/:id/measurements', async () => {
    await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(q('patient-measurements')?.disabled).toBe(false);
    q('patient-measurements')!.click();
    expect(navigate).toHaveBeenCalledWith(['/patients', 'pat-1', 'measurements']);
  });

  it('"Recetas" junto a "Signos vitales": habilitado y navega a /patients/:id/prescriptions', async () => {
    await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(q('patient-prescriptions')?.disabled).toBe(false);
    q('patient-prescriptions')!.click();
    expect(navigate).toHaveBeenCalledWith(['/patients', 'pat-1', 'prescriptions']);
  });

  it('admin con clinical.void sin profesional: ve "Recetas"', async () => {
    repo.setCurrentUser('admin-user', ['clinical.void']);
    await open();
    expect(q('patient-prescriptions')?.disabled).toBe(false);
  });

  it('admin con clinical.void sin profesional: ve "Signos vitales"', async () => {
    repo.setCurrentUser('admin-user', ['clinical.void']);
    await open();
    expect(q('patient-measurements')?.disabled).toBe(false);
  });

  it('sin profesional ni clinical.void: los botones se ocultan', async () => {
    repo.setCurrentUser('user-sin-profesional');
    await open();
    expect(q('patient-encounters')).toBeNull();
    expect(q('patient-new-encounter')).toBeNull();
    expect(q('patient-measurements')).toBeNull();
    expect(q('patient-prescriptions')).toBeNull();
  });

  it('admin con clinical.void sin profesional: ve Encuentros, "Nueva nota" deshabilitada', async () => {
    repo.setCurrentUser('admin-user', ['clinical.void']);
    await open();
    expect(q('patient-encounters')?.disabled).toBe(false);
    expect(q('patient-new-encounter')?.disabled).toBe(true);
    expect(q('patient-new-encounter')?.title).toBe('Solo profesionales pueden crear encuentros.');
  });

  it('mientras se verifica el acceso: deshabilitados con "Cargando…"', async () => {
    vi.spyOn(repo, 'listProfessionals').mockReturnValue(new Subject());
    await open();
    expect(q('patient-encounters')?.disabled).toBe(true);
    expect(q('patient-encounters')?.title).toBe('Cargando…');
  });

  it('paciente inactivo: "Nueva nota" deshabilitada con "Paciente inactivo"', async () => {
    await open({ ...PATIENT, is_active: false });
    expect(q('patient-new-encounter')?.disabled).toBe(true);
    expect(q('patient-new-encounter')?.title).toBe('Paciente inactivo');
  });
});

// Fase 6: botón "Odontograma" de la ficha según el módulo "odontogram" del tenant.
describe('PatientDetailPage: acceso al odontograma', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const el = () => harness.routeNativeElement as HTMLElement;
  const q = (testId: string) => el().querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

  async function openWith(odontogram: boolean): Promise<void> {
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(r => r.url.endsWith('/tenants/me/features')).flush({ modules: { odontogram } });
    await harness.navigateByUrl('/patients/pat-1', PatientDetailPage);
    http.expectOne(r => r.url.endsWith('/tenants/patients/pat-1')).flush(PATIENT);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  it('módulo activo: "Odontograma" navega a /patients/:id/odontogram', async () => {
    await openWith(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    q('patient-odontogram')!.click();
    expect(navigate).toHaveBeenCalledWith(['/patients', 'pat-1', 'odontogram']);
  });

  it('módulo apagado: sin botón "Odontograma"', async () => {
    await openWith(false);
    expect(q('patient-odontogram')).toBeNull();
  });
});
