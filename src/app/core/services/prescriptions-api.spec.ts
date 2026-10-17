import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PrescriptionsApi } from './prescriptions-api';
import { PRESCRIPTIONS_REPOSITORY } from './prescriptions-repository';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST_STATUSES, httpErrorInterceptor } from '../interceptors/http-error.interceptor';

const TENANTS = `${environment.apiUrl}/tenants`;
const FORBIDDEN_KEYS = ['tenant_id', 'professional_id', 'issued_at', 'patient_id'];

// Campos que el caller "cuela": no deben viajar nunca.
const SMUGGLED = { tenant_id: 't1', professional_id: 'prof-x', issued_at: '2020-01-01T00:00:00Z', patient_id: 'otro', id: 'x' };

function expectNoForbiddenKeys(body: Record<string, unknown>): void {
  for (const key of FORBIDDEN_KEYS) expect(Object.keys(body)).not.toContain(key);
  for (const item of (body['items'] as Record<string, unknown>[] | undefined) ?? []) {
    for (const key of [...FORBIDDEN_KEYS, 'prescription_id', 'id']) expect(Object.keys(item)).not.toContain(key);
  }
}

describe('PrescriptionsApi / PRESCRIPTIONS_REPOSITORY (HTTP)', () => {
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
    expect(TestBed.inject(PRESCRIPTIONS_REPOSITORY)).toBeInstanceOf(PrescriptionsApi);
  });

  it('listByEncounter: GET /tenants/encounters/:id/prescriptions (array), sin toast para 403/404', () => {
    let result: unknown;
    TestBed.inject(PRESCRIPTIONS_REPOSITORY).listByEncounter('e1').subscribe(r => (result = r));
    const req = http.expectOne(`${TENANTS}/encounters/e1/prescriptions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404]);
    req.flush([{ id: 'rx-1', items: [] }]);
    expect(result).toEqual([{ id: 'rx-1', items: [] }]);
  });

  it('listByPatient: GET /tenants/patients/:id/prescriptions?page=&limit=', () => {
    let result: unknown;
    TestBed.inject(PRESCRIPTIONS_REPOSITORY).listByPatient('p1', { page: 2, limit: 10 }).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url === `${TENANTS}/patients/p1/prescriptions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404]);
    const page = { items: [], total_count: 0, current_page: 2, page_size: 10, total_pages: 0 };
    req.flush(page);
    expect(result).toEqual(page);
  });

  it('createForEncounter: POST con whitelist — sin tenant_id, professional_id, issued_at ni patient_id (tampoco en los ítems)', () => {
    let result: unknown;
    TestBed.inject(PRESCRIPTIONS_REPOSITORY).createForEncounter('e1', {
      ...SMUGGLED,
      notes: 'Control en 7 días',
      items: [
        { medication: 'Ibuprofeno', dose: '400 mg', ...SMUGGLED, prescription_id: 'rx-x' } as never,
        { medication: 'Paracetamol', presentation: null },
      ],
    } as never).subscribe(r => (result = r));
    const req = http.expectOne(`${TENANTS}/encounters/e1/prescriptions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      notes: 'Control en 7 días',
      items: [{ medication: 'Ibuprofeno', dose: '400 mg' }, { medication: 'Paracetamol', presentation: null }],
    });
    expectNoForbiddenKeys(req.request.body);
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404, 409, 422]);
    req.flush({ id: 'rx-1', encounter_version: 3 }, { status: 201, statusText: 'Created' });
    expect(result).toEqual({ id: 'rx-1', encounter_version: 3 });
  });

  it('createStandalone: POST /tenants/patients/:id/prescriptions con whitelist; campos ausentes no viajan', () => {
    const repo = TestBed.inject(PRESCRIPTIONS_REPOSITORY);
    repo.createStandalone('p1', { ...SMUGGLED, notes: null } as never).subscribe();
    const req = http.expectOne(`${TENANTS}/patients/p1/prescriptions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ notes: null });
    expectNoForbiddenKeys(req.request.body);
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404, 409, 422]);
    req.flush({ id: 'rx-2', encounter_version: null });

    repo.createStandalone('p1', {}).subscribe();
    expect(http.expectOne(`${TENANTS}/patients/p1/prescriptions`).request.body).toEqual({});
  });

  it('addItem: POST /tenants/prescriptions/:id/items con whitelist', () => {
    let result: unknown;
    TestBed.inject(PRESCRIPTIONS_REPOSITORY).addItem('rx-1', {
      ...SMUGGLED, prescription_id: 'rx-x', medication: 'Amoxicilina', frequency: 'Cada 8 h', instructions: 'Con agua',
    } as never).subscribe(r => (result = r));
    const req = http.expectOne(`${TENANTS}/prescriptions/rx-1/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ medication: 'Amoxicilina', frequency: 'Cada 8 h', instructions: 'Con agua' });
    expectNoForbiddenKeys(req.request.body);
    expect(Object.keys(req.request.body)).not.toContain('prescription_id');
    expect(req.request.context.get(SKIP_ERROR_TOAST_STATUSES)).toEqual([403, 404, 409, 422]);
    req.flush({ id: 'rxi-9', encounter_version: null }, { status: 201, statusText: 'Created' });
    expect(result).toEqual({ id: 'rxi-9', encounter_version: null });
  });

  it('403/404/409/422 no disparan el toast global (las pantallas muestran su mensaje en español)', () => {
    const repo = TestBed.inject(PRESCRIPTIONS_REPOSITORY);
    repo.addItem('rx-1', { medication: '' }).subscribe({ error: () => {} });
    http.expectOne(`${TENANTS}/prescriptions/rx-1/items`).flush({ detail: 'x' }, { status: 422, statusText: 'Unprocessable' });
    repo.addItem('rx-1', { medication: 'x' }).subscribe({ error: () => {} });
    http.expectOne(`${TENANTS}/prescriptions/rx-1/items`).flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    repo.createForEncounter('e1', {}).subscribe({ error: () => {} });
    http.expectOne(`${TENANTS}/encounters/e1/prescriptions`).flush(null, { status: 403, statusText: 'Forbidden' });
    repo.listByPatient('p1', { page: 1, limit: 10 }).subscribe({ error: () => {} });
    http.expectOne(r => r.url === `${TENANTS}/patients/p1/prescriptions`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(toastError).not.toHaveBeenCalled();
  });
});
