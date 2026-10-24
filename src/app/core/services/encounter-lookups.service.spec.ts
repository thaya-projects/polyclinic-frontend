import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import { EncounterLookupsService, ProfessionalOption } from './encounter-lookups.service';
import { ENCOUNTERS_REPOSITORY } from './encounters-repository';
import { MockEncountersRepository } from '../../testing/encounters-mock.repository';
import {
  INACTIVE_PROFESSIONAL_MESSAGE, NO_PROFESSIONAL_MESSAGE, PATIENTS_LOAD_ERROR_MESSAGE, PROFESSIONALS_LOAD_ERROR_MESSAGE,
} from '../../shared/utils/encounters-error.util';

describe('EncounterLookupsService', () => {
  let service: EncounterLookupsService;
  let repo: MockEncountersRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository }],
    });
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    service = TestBed.inject(EncounterLookupsService);
  });

  it('mientras cargan los profesionales: loading, sin profesional y motivo "Cargando…" (no "no profesional")', () => {
    const pending$ = new Subject<ProfessionalOption[]>();
    vi.spyOn(repo, 'listProfessionals').mockReturnValue(pending$);

    service.loadProfessionals();

    expect(service.professionalsState()).toBe('loading');
    expect(service.professionalsLoading()).toBe(true);
    expect(service.currentProfessional()).toBeNull();
    expect(service.createDisabledReason()).toBe('Cargando…');

    pending$.next([{ id: 'prof-1', name: 'A', label: 'A', user_id: 'mock-user-1', active: true }]);
    expect(service.professionalsState()).toBe('ready');
    expect(service.currentProfessional()?.id).toBe('prof-1');
    expect(service.createDisabledReason()).toBeNull();
  });

  it('error al cargar profesionales: estado error con su mensaje, no "no profesional"; reintento OK', () => {
    vi.spyOn(repo, 'listProfessionals').mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    service.loadProfessionals();

    expect(service.professionalsState()).toBe('error');
    expect(service.professionalsError()).toBe(PROFESSIONALS_LOAD_ERROR_MESSAGE);
    expect(service.createDisabledReason()).toBe(PROFESSIONALS_LOAD_ERROR_MESSAGE);

    service.loadProfessionals();
    expect(service.professionalsState()).toBe('ready');
    expect(service.professionalsError()).toBeNull();
  });

  it('error al cargar pacientes queda expuesto', () => {
    vi.spyOn(repo, 'listPatients').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    service.loadPatients();
    expect(service.patientsState()).toBe('error');
    expect(service.patientsError()).toBe(PATIENTS_LOAD_ERROR_MESSAGE);
  });

  it('sin vínculo / vinculado inactivo', () => {
    vi.spyOn(repo, 'currentUserId').mockReturnValue('otro');
    service.loadProfessionals();
    expect(service.createDisabledReason()).toBe(NO_PROFESSIONAL_MESSAGE);

    vi.mocked(repo.currentUserId).mockReturnValue('mock-user-1');
    repo.setProfessionalActive('prof-1', false);
    service.loadProfessionals();
    expect(service.linkedProfessional()?.id).toBe('prof-1');
    expect(service.currentProfessional()).toBeNull();
    expect(service.createDisabledReason()).toBe(INACTIVE_PROFESSIONAL_MESSAGE);
  });

  it('nombres sin depender del label; ensurePatients resuelve los que faltan una sola vez', () => {
    const getPatient = vi.spyOn(repo, 'getPatient');
    service.ensurePatients(['pat-2', 'pat-2', null]);
    service.ensurePatients(['pat-2']);

    expect(getPatient).toHaveBeenCalledTimes(1);
    expect(service.patientNameById()['pat-2']).toBe('Luis Pérez');
  });

  it('load() arranca limpio y reset() vacía todo (cierre de sesión)', () => {
    service.load();
    expect(service.patients().length).toBeGreaterThan(0);
    expect(service.currentProfessional()).not.toBeNull();

    const pending$ = new Subject<ProfessionalOption[]>();
    vi.spyOn(repo, 'listProfessionals').mockReturnValue(pending$);
    service.loadProfessionals();
    expect(service.professionals()).toEqual([]);

    service.reset();
    expect(service.patients()).toEqual([]);
    expect(service.patientNameById()).toEqual({});
    expect(service.professionals()).toEqual([]);
    expect(service.currentProfessional()).toBeNull();
    expect(service.professionalsState()).toBe('idle');
    // Una respuesta que llega después del reset no repuebla (la suscripción se cortó).
    pending$.next([{ id: 'x', name: 'X', label: 'X', user_id: 'mock-user-1', active: true }]);
    expect(service.professionals()).toEqual([]);
  });
});
