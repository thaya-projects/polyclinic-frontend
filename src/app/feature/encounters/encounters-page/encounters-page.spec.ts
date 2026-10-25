import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, throwError } from 'rxjs';
import { EncountersPage } from './encounters-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MOCK_CURRENT_USER_ID, MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { EncounterSummary } from '../../../core/models/encounter.model';
import { PagedResult } from '../../../core/models/paged-result.model';
import {
  ENCOUNTERS_ACCESS_DENIED_MESSAGE, GENERIC_VALIDATION_MESSAGE, INACTIVE_PROFESSIONAL_MESSAGE, NO_PROFESSIONAL_MESSAGE,
  PROFESSIONALS_LOAD_ERROR_MESSAGE,
} from '../../../shared/utils/encounters-error.util';

@Component({ template: '' })
class DetailStub {}

function page(items: Partial<EncounterSummary>[], total = items.length): PagedResult<EncounterSummary> {
  return { items: items as EncounterSummary[], total_count: total, current_page: 1, page_size: 10, total_pages: 1 };
}

describe('EncountersPage', () => {
  let harness: RouterTestingHarness;
  let repo: MockEncountersRepository;
  let router: Router;

  const el = () => harness.routeNativeElement as HTMLElement;
  const q = (testId: string) => el().querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(url = '/encounters'): Promise<EncountersPage> {
    const cmp = await harness.navigateByUrl(url, EncountersPage);
    await settle();
    return cmp;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'encounters', component: EncountersPage },
          { path: 'encounters/:id', component: DetailStub },
        ]),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  describe('filtros, paginación y URL', () => {
    it('los query params de la URL definen la query del listado', async () => {
      const list = vi.spyOn(repo, 'list');
      const cmp = await open('/encounters?patient_id=pat-1&professional_id=prof-1&status=open&page=2');

      expect(list).toHaveBeenLastCalledWith({
        patient_id: 'pat-1', professional_id: 'prof-1', status: 'open', page: 2, limit: 10,
      });
      expect(cmp.statusFilter()).toBe('open');
      expect(cmp.page()).toBe(2);
    });

    it('cambiar un filtro lo refleja en la URL, vuelve a la página 1 y recarga', async () => {
      const list = vi.spyOn(repo, 'list');
      const cmp = await open('/encounters?page=3');

      cmp.setStatusFilter('signed');
      await settle();

      expect(router.url).toBe('/encounters?status=signed');
      expect(list).toHaveBeenLastCalledWith({
        patient_id: undefined, professional_id: undefined, status: 'signed', page: 1, limit: 10,
      });
    });

    it('filtro por paciente y limpiar filtros', async () => {
      const list = vi.spyOn(repo, 'list');
      const cmp = await open();

      cmp.setPatientFilter('pat-2');
      await settle();
      expect(router.url).toBe('/encounters?patient_id=pat-2');
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ patient_id: 'pat-2', page: 1 }));
      expect(cmp.encounters().every(e => e.patient_id === 'pat-2')).toBe(true);

      cmp.clearFilters();
      await settle();
      expect(router.url).toBe('/encounters');
    });

    it('la paginación pide la página elegida', async () => {
      const list = vi.spyOn(repo, 'list');
      const cmp = await open('/encounters?status=open');

      cmp.setPage(2);
      await settle();

      expect(router.url).toBe('/encounters?status=open&page=2');
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'open', page: 2 }));
    });

    it('M2: una respuesta vieja no pisa la nueva', async () => {
      const responses: Subject<PagedResult<EncounterSummary>>[] = [];
      vi.spyOn(repo, 'list').mockImplementation(() => {
        const s = new Subject<PagedResult<EncounterSummary>>();
        responses.push(s);
        return s;
      });
      const cmp = await open('/encounters?status=open');
      cmp.setStatusFilter('signed');
      await settle();

      responses[1].next(page([{ id: 'nueva', patient_id: 'pat-1', professional_id: 'prof-1', status: 'signed' }]));
      responses[0].next(page([{ id: 'vieja', patient_id: 'pat-1', professional_id: 'prof-1', status: 'open' }]));
      await settle();

      expect(cmp.encounters().map(e => e.id)).toEqual(['nueva']);
    });
  });

  describe('?patient_id=&new=1', () => {
    it('abre el alta con el paciente preseleccionado y saca "new" de la URL', async () => {
      const cmp = await open('/encounters?patient_id=pat-2&new=1');

      expect(cmp.createOpen()).toBe(true);
      expect(cmp.createPatientId()).toBe('pat-2');
      expect(router.url).toBe('/encounters?patient_id=pat-2');
      expect((q('patient-select') as HTMLSelectElement).value).toBe('pat-2');
    });

    it('si el paciente preseleccionado no está en la primera página, se agrega como opción', async () => {
      vi.spyOn(repo, 'listPatients').mockImplementation(() => new Subject());
      const getPatient = vi.spyOn(repo, 'getPatient');
      const cmp = await open('/encounters?patient_id=pat-2&new=1');

      expect(getPatient).toHaveBeenCalledWith('pat-2');
      expect(cmp.createPatientOptions().map(p => p.id)).toEqual(['pat-2']);
    });
  });

  it('M7: muestra el aviso del state de navegación y lo borra de history.state', async () => {
    // Llega desde el detalle (otra ruta), como en el flujo real del 404.
    await harness.navigateByUrl('/encounters/no-existe');
    await router.navigate(['/encounters'], { replaceUrl: true, state: { notice: 'Encuentro no encontrado.' } });
    await settle();

    expect(q('notice')?.textContent).toContain('Encuentro no encontrado.');
    const location = TestBed.inject(Location);
    expect((location.getState() as Record<string, unknown>)['notice']).toBeUndefined();
    expect(location.path()).toBe('/encounters');
  });

  describe('alta', () => {
    it('crea a nombre del profesional del usuario actual (sin tenant_id)', async () => {
      const cmp = await open();
      const create = vi.spyOn(repo, 'create');
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      cmp.onCreate({ patient_id: 'pat-2', chief_complaint: null });

      expect(create).toHaveBeenCalledWith({
        patient_id: 'pat-2', clinical_record_id: 'cr-pat-2', professional_id: 'prof-1', chief_complaint: null,
      });
      expect(Object.keys(create.mock.calls[0][0])).not.toContain('tenant_id');
    });

    it('A1: dos Enter seguidos (submit del form) → un solo POST', async () => {
      const cmp = await open('/encounters?patient_id=pat-1&new=1');
      const create = vi.spyOn(repo, 'create').mockReturnValue(new Subject());

      const form = q('create-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      form.dispatchEvent(new Event('submit'));
      await settle();
      form.dispatchEvent(new Event('submit'));

      expect(create).toHaveBeenCalledTimes(1);
      expect(cmp.saving()).toBe(true);
      expect((el().querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    });

    const cases: [number, Record<string, unknown>, string][] = [
      [403, {}, NO_PROFESSIONAL_MESSAGE],
      [404, {}, 'El paciente, su historia clínica o el profesional no existen en esta clínica.'],
      [422, { detail: "Professional with id 'x' is inactive." }, 'El profesional del encuentro está desactivado'],
      [422, { detail: 'Something unexpected 1234-abcd.' }, GENERIC_VALIDATION_MESSAGE],
      [422, { detail: "clinical_record_id is not a valid guid. (Parameter 'clinical_record_id')", field: 'clinical_record_id' },
        'Historia clínica: El valor seleccionado no es válido.'],
      [409, { detail: "Appointment 'a1' already has an encounter." }, 'La cita ya tiene un encuentro registrado.'],
    ];
    for (const [status, error, expected] of cases) {
      it(`error ${status} del alta: "${expected}"`, async () => {
        const cmp = await open('/encounters?patient_id=pat-1&new=1');
        vi.spyOn(repo, 'create').mockReturnValue(throwError(() => new HttpErrorResponse({ status, error })));

        cmp.onCreate({ patient_id: 'pat-1', chief_complaint: null });
        await settle();

        expect(q('create-error')?.textContent).toContain(expected);
        expect(cmp.createOpen()).toBe(true);
        expect(cmp.saving()).toBe(false);
      });
    }

    it('422 con field de un input del alta (patient_id): el motivo va debajo del select, sin banner', async () => {
      const cmp = await open('/encounters?patient_id=pat-1&new=1');
      vi.spyOn(repo, 'create').mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 422, error: { detail: "patient_id cannot be empty. (Parameter 'patient_id')", field: 'patient_id' },
      })));

      cmp.onCreate({ patient_id: 'pat-1', chief_complaint: null });
      await settle();

      expect(q('create-error')).toBeNull();
      expect(q('create-form')?.textContent).toContain('Este campo es obligatorio.');
    });
  });

  it('usa el resumen del listado: sin anamnesis/exam/clinical_data y la tabla se pinta igual', async () => {
    const cmp = await open();

    expect(cmp.encounters().length).toBeGreaterThan(0);
    for (const item of cmp.encounters()) {
      expect('anamnesis' in item).toBe(false);
      expect('exam' in item).toBe(false);
      expect('clinical_data' in item).toBe(false);
    }
    expect(el().textContent).toContain('Cefalea de 3 días');
    expect(el().textContent).toContain('Ana Gómez');
  });

  describe('acceso a notas clínicas', () => {
    it('sin profesional ni clinical.void: aviso, sin botón y sin llamar al backend', async () => {
      repo.setCurrentUser('user-sin-profesional');
      const list = vi.spyOn(repo, 'list');
      await open();

      expect(q('access-denied')?.textContent).toContain(ENCOUNTERS_ACCESS_DENIED_MESSAGE);
      expect(q('btn-new-encounter')).toBeNull();
      expect(list).not.toHaveBeenCalled();
    });

    it('profesional desactivado sin clinical.void: tampoco puede ver', async () => {
      repo.setProfessionalActive('prof-1', false);
      const list = vi.spyOn(repo, 'list');
      await open();

      expect(q('access-denied')).not.toBeNull();
      expect(list).not.toHaveBeenCalled();
    });

    it('admin con clinical.void sin profesional: ve el listado; el alta queda deshabilitada', async () => {
      repo.setCurrentUser('admin-user', ['clinical.void']);
      const list = vi.spyOn(repo, 'list');
      await open();

      expect(list).toHaveBeenCalled();
      expect(q('access-denied')).toBeNull();
      const button = q('btn-new-encounter') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.title).toBe(NO_PROFESSIONAL_MESSAGE);
    });

    it('403 del backend en el GET: mismo aviso', async () => {
      vi.spyOn(repo, 'list').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
      await open();

      expect(q('access-denied')?.textContent).toContain(ENCOUNTERS_ACCESS_DENIED_MESSAGE);
      expect(q('list-error')).toBeNull();
    });
  });

  describe('habilitación de "Nuevo encuentro"', () => {
    it('profesional desactivado con clinical.void: ve el listado, alta deshabilitada con "Tu profesional está desactivado."', async () => {
      repo.setProfessionalActive('prof-1', false);
      repo.setCurrentUser(MOCK_CURRENT_USER_ID, ['clinical.void']);
      const cmp = await open();

      const button = q('btn-new-encounter') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.title).toBe(INACTIVE_PROFESSIONAL_MESSAGE);
      expect(q('no-professional-hint')?.textContent).toContain(INACTIVE_PROFESSIONAL_MESSAGE);

      const create = vi.spyOn(repo, 'create');
      cmp.onCreate({ patient_id: 'pat-2', chief_complaint: null });
      expect(create).not.toHaveBeenCalled();
    });

    it('M5: mientras cargan los profesionales: "Cargando…", sin aviso de "no profesional" y sin GET', async () => {
      vi.spyOn(repo, 'listProfessionals').mockReturnValue(new Subject());
      const list = vi.spyOn(repo, 'list');
      await open();

      expect(q('access-loading')?.textContent).toContain('Cargando…');
      expect(q('no-professional-hint')).toBeNull();
      expect(q('access-denied')).toBeNull();
      expect(list).not.toHaveBeenCalled();
    });

    it('M5: si falla la carga de profesionales se informa y Reintentar lo recupera', async () => {
      const real = repo.listProfessionals();
      vi.spyOn(repo, 'listProfessionals')
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
        .mockReturnValue(real);
      const list = vi.spyOn(repo, 'list');
      await open();

      expect(q('access-error')?.textContent).toContain(PROFESSIONALS_LOAD_ERROR_MESSAGE);
      expect(q('access-denied')).toBeNull();
      expect(list).not.toHaveBeenCalled();

      q('access-retry')!.click();
      await settle();

      expect((q('btn-new-encounter') as HTMLButtonElement).disabled).toBe(false);
      expect(list).toHaveBeenCalled();
    });

    it('M5: el error al cargar pacientes no se traga', async () => {
      vi.spyOn(repo, 'listPatients').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await open();

      expect(q('patients-error')?.textContent).toContain('No se pudieron cargar los pacientes.');
    });
  });
});
