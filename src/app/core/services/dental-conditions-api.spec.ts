import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DentalConditionsApi } from './dental-conditions-api';
import { DENTAL_CONDITIONS_REPOSITORY } from './dental-conditions-repository';
import { HttpDentalConditionsRepository } from './dental-conditions-http.repository';
import { FeaturesService } from './features.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { CreateDentalConditionDto, UpdateDentalConditionDto } from '../models/dental-condition.model';

const BASE = `${environment.apiUrl}/tenants/dental-conditions`;

describe('DentalConditionsApi', () => {
  let api: DentalConditionsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DentalConditionsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list: GET /tenants/dental-conditions', () => {
    let result: unknown;
    api.list().subscribe(r => (result = r));
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    const body = [{ id: '1', tenant_id: null, code: 'caries', name: 'Caries', category: 'patologia', default_color: '#E53935' }];
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('create: POST con code/name/category/default_color y nunca tenant_id', () => {
    const dto = { code: 'fractura', name: 'Fractura', category: 'patologia', default_color: '#AB12CD', tenant_id: 'x' };
    api.create(dto as CreateDentalConditionDto).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'fractura', name: 'Fractura', category: 'patologia', default_color: '#AB12CD' });
    req.flush({});
  });

  it('create: los opcionales ausentes no viajan', () => {
    api.create({ code: 'fractura', name: 'Fractura' }).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.body).toEqual({ code: 'fractura', name: 'Fractura' });
    req.flush({});
  });

  it('update: PATCH /:id solo con las claves presentes (null = quitar), sin code ni tenant_id', () => {
    const dto = { default_color: null, code: 'otro', tenant_id: 'x' };
    api.update('dc-1', dto as UpdateDentalConditionDto).subscribe();
    const req = http.expectOne(`${BASE}/dc-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ default_color: null });
    req.flush({});
  });
});

describe('DentalConditionsApi: toast global', () => {
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

  it('403 del módulo apagado en el listado: sin el toast genérico (la pantalla muestra el suyo)', () => {
    TestBed.inject(DentalConditionsApi).list().subscribe({ error: () => {} });
    http.expectOne(BASE).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('409 / 422 / 403 del alta y 404 de la edición: sin toast duplicado', () => {
    const api = TestBed.inject(DentalConditionsApi);
    for (const status of [403, 409, 422]) {
      api.create({ code: 'x', name: 'X' }).subscribe({ error: () => {} });
      http.expectOne(BASE).flush({ detail: 'x' }, { status, statusText: 'x' });
    }
    api.update('dc-1', { name: 'X' }).subscribe({ error: () => {} });
    http.expectOne(`${BASE}/dc-1`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe('DENTAL_CONDITIONS_REPOSITORY (HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la implementación default es la HTTP', () => {
    expect(TestBed.inject(DENTAL_CONDITIONS_REPOSITORY)).toBe(TestBed.inject(HttpDentalConditionsRepository));
  });

  it('odontogramEnabled: null hasta cargar /tenants/me/features; luego el valor del módulo', () => {
    const repo = TestBed.inject(DENTAL_CONDITIONS_REPOSITORY);
    expect(repo.odontogramEnabled()).toBeNull();
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(`${environment.apiUrl}/tenants/me/features`).flush({ modules: { odontogram: false } });
    expect(repo.odontogramEnabled()).toBe(false);
  });
});
