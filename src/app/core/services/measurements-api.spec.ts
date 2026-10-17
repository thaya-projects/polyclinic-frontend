import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MeasurementsApi } from './measurements-api';
import { MEASUREMENTS_REPOSITORY } from './measurements-repository';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST_STATUSES, httpErrorInterceptor } from '../interceptors/http-error.interceptor';

const PATIENTS = `${environment.apiUrl}/tenants/patients`;
const TYPES = `${environment.apiUrl}/tenants/measurement-types`;

describe('MeasurementsApi / MEASUREMENTS_REPOSITORY (HTTP)', () => {
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

  it('usa la implementación HTTP por defecto', () => {
    expect(TestBed.inject(MEASUREMENTS_REPOSITORY)).toBeInstanceOf(MeasurementsApi);
  });

  it('list: GET /tenants/patients/:id/measurements con los filtros presentes, sin toast para 403/404', () => {
    let result: unknown;
    TestBed.inject(MEASUREMENTS_REPOSITORY).list('p1', {
      type: 'weight', encounter_id: 'e1', from: '2026-01-01T00:00:00Z', to: '2026-12-31T00:00:00Z', page: 2, limit: 10,
    }).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url === `${PATIENTS}/p1/measurements`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('type')).toBe('weight');
    expect(req.request.params.get('encounter_id')).toBe('e1');
    expect(req.request.params.get('from')).toBe('2026-01-01T00:00:00Z');
    expect(req.request.params.get('to')).toBe('2026-12-31T00:00:00Z');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404]);
    const page = { items: [], total_count: 0, current_page: 2, page_size: 10, total_pages: 0 };
    req.flush(page);
    expect(result).toEqual(page);
  });

  it('list: from/to viajan SIEMPRE con offset y el "+" codificado como %2B', () => {
    const repo = TestBed.inject(MEASUREMENTS_REPOSITORY);
    repo.list('p1', { from: '2026-10-01T00:00:00-03:00', to: '2026-10-31T23:59:59+05:30', page: 1, limit: 10 }).subscribe();
    const req = http.expectOne(r => r.url === `${PATIENTS}/p1/measurements`);
    expect(req.request.urlWithParams).toContain('from=2026-10-01T00:00:00-03:00');
    expect(req.request.urlWithParams).toContain('to=2026-10-31T23:59:59%2B05:30');
    expect(req.request.urlWithParams).not.toContain('+');
    req.flush({ items: [] });
  });

  it('list: un from/to local (sin offset) se completa con el offset local antes de salir', () => {
    TestBed.inject(MEASUREMENTS_REPOSITORY).list('p1', { from: '2026-10-01', to: '2026-10-02T10:30', page: 1, limit: 10 })
      .subscribe();
    const req = http.expectOne(r => r.url === `${PATIENTS}/p1/measurements`);
    const offset = /(Z|[+-]\d{2}:\d{2})$/;
    expect(req.request.params.get('from')).toMatch(/^2026-10-01T00:00:00/);
    expect(req.request.params.get('from')).toMatch(offset);
    expect(new Date(req.request.params.get('to')!).getTime()).toBe(new Date(2026, 9, 2, 10, 30).getTime());
    expect(req.request.urlWithParams).not.toContain('+');
    req.flush({ items: [] });
  });

  it('list: un offset sin ":" (+0530) se reescribe al formato del backend (±hh:mm) sin cambiar el instante', () => {
    TestBed.inject(MEASUREMENTS_REPOSITORY).list('p1', { from: '2026-10-01T10:00:00+0530', page: 1, limit: 10 }).subscribe();
    const req = http.expectOne(r => r.url === `${PATIENTS}/p1/measurements`);
    const from = req.request.params.get('from')!;
    expect(from).toMatch(/[+-]\d{2}:\d{2}$/);
    expect(new Date(from).getTime()).toBe(Date.parse('2026-10-01T04:30:00Z'));
    req.flush({ items: [] });
  });

  it('list: los filtros vacíos no viajan', () => {
    TestBed.inject(MEASUREMENTS_REPOSITORY).list('p1', { page: 1, limit: 10 }).subscribe();
    const req = http.expectOne(r => r.url === `${PATIENTS}/p1/measurements`);
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    req.flush({ items: [] });
  });

  it('create: POST con whitelist — el body NUNCA lleva tenant_id ni recorded_by', () => {
    let result: unknown;
    TestBed.inject(MEASUREMENTS_REPOSITORY).create('p1', {
      type: 'weight', value: 70, unit: 'kg', measured_at: '2026-10-17T09:00:00-03:00', encounter_id: 'e1', note: null,
      tenant_id: 't1', recorded_by: 'u1', patient_id: 'otro', id: 'x',
    } as never).subscribe(r => (result = r));
    const req = http.expectOne(`${PATIENTS}/p1/measurements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      type: 'weight', value: 70, unit: 'kg', measured_at: '2026-10-17T09:00:00-03:00', encounter_id: 'e1', note: null,
    });
    expect(Object.keys(req.request.body)).not.toContain('tenant_id');
    expect(Object.keys(req.request.body)).not.toContain('recorded_by');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404, 409, 422]);
    req.flush({ id: 'm1', encounter_version: 4 }, { status: 201, statusText: 'Created' });
    expect(result).toEqual({ id: 'm1', encounter_version: 4 });
  });

  it('create: los campos ausentes no viajan', () => {
    TestBed.inject(MEASUREMENTS_REPOSITORY).create('p1', { type: 'spo2', value: 97 }).subscribe();
    const req = http.expectOne(`${PATIENTS}/p1/measurements`);
    expect(req.request.body).toEqual({ type: 'spo2', value: 97 });
    req.flush({});
  });

  it('listTypes: GET /tenants/measurement-types', () => {
    let result: unknown;
    TestBed.inject(MEASUREMENTS_REPOSITORY).listTypes().subscribe(r => (result = r));
    const req = http.expectOne(TYPES);
    expect(req.request.method).toBe('GET');
    req.flush([{ type: 'weight', unit: 'kg', min: 0.2, max: 500 }]);
    expect(result).toEqual([{ type: 'weight', unit: 'kg', min: 0.2, max: 500 }]);
  });

  it('el 422 / 404 no disparan el toast global (las pantallas muestran su mensaje en español)', () => {
    const repo = TestBed.inject(MEASUREMENTS_REPOSITORY);
    repo.create('p1', { type: 'weight', value: 9999 }).subscribe({ error: () => {} });
    http.expectOne(`${PATIENTS}/p1/measurements`).flush({ detail: 'x' }, { status: 422, statusText: 'Unprocessable' });
    repo.list('p1', { page: 1, limit: 10 }).subscribe({ error: () => {} });
    http.expectOne(r => r.url === `${PATIENTS}/p1/measurements`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(toastError).not.toHaveBeenCalled();
  });
});
