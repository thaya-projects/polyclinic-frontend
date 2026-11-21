import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ToothConditionsApi } from './tooth-conditions-api';
import { TOOTH_CONDITIONS_REPOSITORY } from './tooth-conditions-repository';
import { HttpToothConditionsRepository } from './tooth-conditions-http.repository';
import { FeaturesService } from './features.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import {
  CreateToothConditionDto, ToothCondition, UpdateToothConditionDto,
} from '../models/tooth-condition.model';

const TEETH = `${environment.apiUrl}/tenants/odontograms/odo-1/teeth`;
const DTO: ToothCondition = {
  id: 'tc-1', odontogram_id: 'odo-1', tooth_fdi: 16, surface: 'oclusal', condition_id: 'dc-1',
  state: 'existing', note: null, created_at: '2026-10-17T14:00:00Z', created_by: 'user-1',
};

describe('ToothConditionsApi', () => {
  let api: ToothConditionsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ToothConditionsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list: GET /tenants/odontograms/:id/teeth', () => {
    let result: unknown;
    api.list('odo-1').subscribe(r => (result = r));
    const req = http.expectOne(TEETH);
    expect(req.request.method).toBe('GET');
    req.flush([DTO]);
    expect(result).toEqual([DTO]);
  });

  it('create: POST /tenants/odontograms/:id/teeth con whitelist y nunca tenant_id / created_by', () => {
    const dto = {
      tooth_fdi: 16, condition_id: 'dc-1', surface: 'oclusal', state: 'planned', note: 'Control',
      tenant_id: 'x', created_by: 'y', odontogram_id: 'z', created_at: 'w',
    };
    api.create('odo-1', dto as CreateToothConditionDto).subscribe();
    const req = http.expectOne(TEETH);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tooth_fdi: 16, condition_id: 'dc-1', surface: 'oclusal', state: 'planned', note: 'Control',
    });
    expect(req.request.body).not.toHaveProperty('tenant_id');
    expect(req.request.body).not.toHaveProperty('created_by');
    req.flush(DTO, { status: 201, statusText: 'Created' });
  });

  it('create: surface / state / note ausentes (o note null) no viajan', () => {
    api.create('odo-1', { tooth_fdi: 11, condition_id: 'dc-1', note: null }).subscribe();
    const req = http.expectOne(TEETH);
    expect(req.request.body).toEqual({ tooth_fdi: 11, condition_id: 'dc-1' });
    req.flush(DTO);
  });

  it('update: PATCH /tenants/odontograms/:id/teeth/:tcId solo con los campos cambiados', () => {
    api.update('odo-1', 'tc-1', { state: 'done' }).subscribe();
    const req = http.expectOne(`${TEETH}/tc-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ state: 'done' });
    req.flush(DTO);
  });

  it('update: note null viaja (quitar la nota); tooth_fdi / tenant_id / created_by nunca', () => {
    const dto = { note: null, condition_id: 'dc-2', tooth_fdi: 17, tenant_id: 'x', created_by: 'y' };
    api.update('odo-1', 'tc-1', dto as UpdateToothConditionDto).subscribe();
    const req = http.expectOne(`${TEETH}/tc-1`);
    expect(req.request.body).toEqual({ condition_id: 'dc-2', note: null });
    req.flush(DTO);
  });

  it('remove: DELETE /tenants/odontograms/:id/teeth/:tcId (204)', () => {
    let done = false;
    api.remove('odo-1', 'tc-1').subscribe({ complete: () => (done = true) });
    const req = http.expectOne(`${TEETH}/tc-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });
});

describe('ToothConditionsApi: toast global', () => {
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

  it('403 / 404 del listado y 403 / 404 / 409 / 422 de las escrituras: sin toast genérico (los muestra el panel)', () => {
    const api = TestBed.inject(ToothConditionsApi);
    for (const status of [403, 404]) {
      api.list('odo-1').subscribe({ error: () => {} });
      http.expectOne(TEETH).flush(null, { status, statusText: 'x' });
    }
    for (const status of [403, 404, 409, 422]) {
      api.create('odo-1', { tooth_fdi: 11, condition_id: 'dc-1' }).subscribe({ error: () => {} });
      http.expectOne(TEETH).flush({ detail: 'x' }, { status, statusText: 'x' });
      api.update('odo-1', 'tc-1', { state: 'done' }).subscribe({ error: () => {} });
      http.expectOne(`${TEETH}/tc-1`).flush({ detail: 'x' }, { status, statusText: 'x' });
      api.remove('odo-1', 'tc-1').subscribe({ error: () => {} });
      http.expectOne(`${TEETH}/tc-1`).flush({ detail: 'x' }, { status, statusText: 'x' });
    }
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe('TOOTH_CONDITIONS_REPOSITORY (HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la implementación default es la HTTP', () => {
    expect(TestBed.inject(TOOTH_CONDITIONS_REPOSITORY)).toBe(TestBed.inject(HttpToothConditionsRepository));
  });

  it('delega list / create / update / remove en los endpoints /teeth', () => {
    const repo = TestBed.inject(TOOTH_CONDITIONS_REPOSITORY);
    repo.list('odo-1').subscribe();
    expect(http.expectOne(TEETH).request.method).toBe('GET');
    repo.create('odo-1', { tooth_fdi: 11, condition_id: 'dc-1' }).subscribe();
    expect(http.expectOne(TEETH).request.method).toBe('POST');
    repo.update('odo-1', 'tc-1', { note: 'x' }).subscribe();
    expect(http.expectOne(`${TEETH}/tc-1`).request.method).toBe('PATCH');
    repo.remove('odo-1', 'tc-1').subscribe();
    expect(http.expectOne(`${TEETH}/tc-1`).request.method).toBe('DELETE');
  });

  it('odontogramEnabled: null hasta cargar /tenants/me/features; luego el valor del módulo', () => {
    const repo = TestBed.inject(TOOTH_CONDITIONS_REPOSITORY);
    expect(repo.odontogramEnabled()).toBeNull();
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(`${environment.apiUrl}/tenants/me/features`).flush({ modules: { odontogram: true } });
    expect(repo.odontogramEnabled()).toBe(true);
  });
});
