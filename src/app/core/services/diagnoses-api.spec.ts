import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DiagnosesApi } from './diagnoses-api';
import { Cie10Api } from './cie10-api';
import { CIE10_CATALOG } from './cie10-catalog';
import { ENCOUNTERS_REPOSITORY } from './encounters-repository';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST_STATUSES, httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { ToastService } from './toast.service';

const ENCOUNTERS = `${environment.apiUrl}/tenants/encounters`;
const CIE10 = `${environment.apiUrl}/tenants/cie10`;

describe('DiagnosesApi', () => {
  let api: DiagnosesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(DiagnosesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list: GET /tenants/encounters/:id/diagnoses, sin toast global para 403/404', () => {
    let result: unknown;
    api.list('e1').subscribe(r => (result = r));
    const req = http.expectOne(`${ENCOUNTERS}/e1/diagnoses`);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404]);
    req.flush([{ id: 'd1' }]);
    expect(result).toEqual([{ id: 'd1' }]);
  });

  it('create: POST sin tenant_id (whitelist); la respuesta trae encounter_version', () => {
    let result: unknown;
    api.create('e1', { cie10_code: 'J06.9', description: null, is_definitive: true, tenant_id: 't1', encounter_id: 'x' } as never)
      .subscribe(r => (result = r));
    const req = http.expectOne(`${ENCOUNTERS}/e1/diagnoses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cie10_code: 'J06.9', description: null, is_definitive: true });
    expect(Object.keys(req.request.body)).not.toContain('tenant_id');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404, 422]);
    req.flush({ id: 'd1', encounter_version: 7 }, { status: 201, statusText: 'Created' });
    expect(result).toEqual({ id: 'd1', encounter_version: 7 });
  });

  it('create: los campos ausentes no viajan', () => {
    api.create('e1', { description: 'Cefalea' }).subscribe();
    const req = http.expectOne(`${ENCOUNTERS}/e1/diagnoses`);
    expect(req.request.body).toEqual({ description: 'Cefalea' });
    req.flush({});
  });

  it('delete: DELETE /:id/diagnoses/:diagnosisId → 200 { encounter_version }, sin toast global para 403/404/422', () => {
    let result: unknown;
    api.delete('e1', 'd9').subscribe(r => (result = r));
    const req = http.expectOne(`${ENCOUNTERS}/e1/diagnoses/d9`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404, 422]);
    req.flush({ encounter_version: 3 });
    expect(result).toEqual({ encounter_version: 3 });
  });
});

describe('Cie10Api / CIE10_CATALOG', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa la implementación HTTP por defecto', () => {
    expect(TestBed.inject(CIE10_CATALOG)).toBeInstanceOf(Cie10Api);
  });

  it('search: GET /tenants/cie10?q=&limit= (default 20, máximo 50), sin toast del 422', () => {
    const catalog = TestBed.inject(CIE10_CATALOG);
    catalog.search('migr').subscribe();
    const req = http.expectOne(r => r.url === CIE10);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('migr');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([422]);
    req.flush([]);

    catalog.search('migr', 500).subscribe();
    const capped = http.expectOne(r => r.url === CIE10);
    expect(capped.request.params.get('limit')).toBe('50');
    capped.flush([]);
  });
});

describe('ENCOUNTERS_REPOSITORY (HTTP): diagnósticos', () => {
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

  it('delegan en las URLs del contrato', () => {
    const repo = TestBed.inject(ENCOUNTERS_REPOSITORY);
    repo.listDiagnoses('e1').subscribe();
    repo.createDiagnosis('e1', { description: 'x' }).subscribe();
    repo.deleteDiagnosis('e1', 'd1').subscribe();

    http.expectOne(r => r.method === 'GET' && r.url === `${ENCOUNTERS}/e1/diagnoses`).flush([]);
    http.expectOne(r => r.method === 'POST' && r.url === `${ENCOUNTERS}/e1/diagnoses`).flush({ encounter_version: 2 });
    http.expectOne(r => r.method === 'DELETE' && r.url === `${ENCOUNTERS}/e1/diagnoses/d1`).flush({ encounter_version: 3 });
  });

  it('el 422 del alta no dispara el toast global (la sección muestra su mensaje en español)', () => {
    TestBed.inject(ENCOUNTERS_REPOSITORY).createDiagnosis('e1', {}).subscribe({ error: () => {} });
    http.expectOne(`${ENCOUNTERS}/e1/diagnoses`).flush({ detail: 'x' }, { status: 422, statusText: 'Unprocessable' });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('el 404 del listado no dispara el toast global', () => {
    TestBed.inject(ENCOUNTERS_REPOSITORY).listDiagnoses('e1').subscribe({ error: () => {} });
    http.expectOne(`${ENCOUNTERS}/e1/diagnoses`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(toastError).not.toHaveBeenCalled();
  });
});
