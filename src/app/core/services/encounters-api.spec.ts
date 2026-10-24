import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EncountersApi } from './encounters-api';
import { ENCOUNTERS_REPOSITORY } from './encounters-repository';
import { HttpEncountersRepository } from './encounters-http.repository';
import { environment } from '../../../environments/environment';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { ToastService } from './toast.service';
import { PatientsApi } from './patients-api';

const BASE = `${environment.apiUrl}/tenants/encounters`;
const FORBIDDEN_BODY_KEYS = ['tenant_id', 'signed_by', 'voided_by', 'signed_at', 'voided_at'];

function expectNoForbiddenKeys(body: unknown): void {
  const keys = body && typeof body === 'object' ? Object.keys(body) : [];
  for (const key of FORBIDDEN_BODY_KEYS) expect(keys).not.toContain(key);
}

describe('EncountersApi', () => {
  let api: EncountersApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(EncountersApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list: GET con filtros y paginación como query params', () => {
    api.list({ patient_id: 'p1', status: 'signed', page: 2, limit: 10 }).subscribe();

    const req = http.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('patient_id')).toBe('p1');
    expect(req.request.params.get('status')).toBe('signed');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('professional_id')).toBe(false);
    req.flush({ items: [], total_count: 0, current_page: 2, page_size: 10, total_pages: 0 });
  });

  it('getById: GET /tenants/encounters/:id', () => {
    api.getById('e1').subscribe();
    const req = http.expectOne(`${BASE}/e1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('create: POST sin tenant_id ni datos de firma', () => {
    api.create({ patient_id: 'p1', clinical_record_id: 'cr1', professional_id: 'pr1', chief_complaint: 'x' }).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ patient_id: 'p1', clinical_record_id: 'cr1', professional_id: 'pr1', chief_complaint: 'x' });
    expectNoForbiddenKeys(req.request.body);
    req.flush({});
  });

  it('update: PATCH parcial a /tenants/encounters/:id con version', () => {
    // Aunque el caller cuele campos extra, solo viajan campos clínicos + version.
    api.update('e1', { anamnesis: 'a', version: 4, tenant_id: 't1', signed_by: 'u1' } as never).subscribe();
    const req = http.expectOne(`${BASE}/e1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ anamnesis: 'a', version: 4 });
    expectNoForbiddenKeys(req.request.body);
    req.flush({});
  });

  it('sign: POST /:id/sign solo con version (sin signed_by)', () => {
    api.sign('e1', { version: 3, signed_by: 'u1', tenant_id: 't1' } as never).subscribe();
    const req = http.expectOne(`${BASE}/e1/sign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ version: 3 });
    expectNoForbiddenKeys(req.request.body);
    req.flush({});
  });

  it('void: POST /:id/void solo con reason + version (sin voided_by)', () => {
    api.void('e1', { reason: 'error de carga', version: 2, voided_by: 'u1', tenant_id: 't1' } as never).subscribe();
    const req = http.expectOne(`${BASE}/e1/void`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'error de carga', version: 2 });
    expectNoForbiddenKeys(req.request.body);
    req.flush({});
  });
});

describe('ENCOUNTERS_REPOSITORY', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa la implementación HTTP por defecto', () => {
    expect(TestBed.inject(ENCOUNTERS_REPOSITORY)).toBeInstanceOf(HttpEncountersRepository);
  });

  it('resolveClinicalRecordId: lee el id de GET /tenants/patients/:id/clinical-record', () => {
    let result: string | undefined;
    TestBed.inject(ENCOUNTERS_REPOSITORY).resolveClinicalRecordId('p1').subscribe(id => (result = id));
    const req = http.expectOne(`${environment.apiUrl}/tenants/patients/p1/clinical-record`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'cr-99', patient_id: 'p1' });
    expect(result).toBe('cr-99');
  });
});

describe('HttpEncountersRepository: pacientes', () => {
  let http: HttpTestingController;
  let repo: HttpEncountersRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    repo = TestBed.inject(HttpEncountersRepository);
  });

  afterEach(() => http.verify());

  it('listPatients(q) busca en el backend con ?q=', () => {
    repo.listPatients('perez').subscribe();
    const req = http.expectOne(r => r.url === `${environment.apiUrl}/tenants/patients`);
    expect(req.request.params.get('q')).toBe('perez');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush({ items: [], total_count: 0 });
  });

  it('getPatient: GET /tenants/patients/:id → opción con name y label', () => {
    let option: unknown;
    repo.getPatient('p9').subscribe(o => (option = o));
    http.expectOne(`${environment.apiUrl}/tenants/patients/p9`).flush({
      id: 'p9', first_name: 'Ana', last_name: 'Gómez', document_number: '123',
    });
    expect(option).toEqual({ id: 'p9', name: 'Ana Gómez', label: 'Ana Gómez — 123' });
  });
});

describe('M7: toast global del 404', () => {
  let http: HttpTestingController;
  let toastError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpErrorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    toastError = vi.spyOn(TestBed.inject(ToastService), 'error');
  });

  afterEach(() => http.verify());

  it('GET de un encounter con 404: sin toast global (el listado muestra su aviso)', () => {
    TestBed.inject(EncountersApi).getById('e1').subscribe({ error: () => {} });
    http.expectOne(`${BASE}/e1`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('el resto de los endpoints mantiene el toast del 404', () => {
    TestBed.inject(PatientsApi).getById('p1').subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/tenants/patients/p1`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(toastError).toHaveBeenCalledWith('Recurso no encontrado.');
  });
});
