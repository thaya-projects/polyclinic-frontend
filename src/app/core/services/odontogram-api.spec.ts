import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OdontogramApi } from './odontogram-api';
import { ODONTOGRAM_REPOSITORY } from './odontogram-repository';
import { HttpOdontogramRepository } from './odontogram-http.repository';
import { FeaturesService } from './features.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { CreateOdontogramDto, Odontogram } from '../models/odontogram.model';

const API = environment.apiUrl;
const DTO: Odontogram = {
  id: 'odo-1', clinical_record_id: 'cr-1', patient_id: 'pat-1', encounter_id: null, dentition: 'mixta',
  is_current: true, snapshot_date: '2026-10-17T14:00:00Z',
};

describe('OdontogramApi', () => {
  let api: OdontogramApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(OdontogramApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getCurrent: GET /tenants/patients/:id/odontogram/current (dentition snake_case lower)', () => {
    let result: unknown;
    api.getCurrent('pat-1').subscribe(r => (result = r));
    const req = http.expectOne(`${API}/tenants/patients/pat-1/odontogram/current`);
    expect(req.request.method).toBe('GET');
    req.flush(DTO);
    expect(result).toEqual(DTO);
  });

  it('getById: GET /tenants/odontograms/:id', () => {
    api.getById('odo-1').subscribe();
    const req = http.expectOne(`${API}/tenants/odontograms/odo-1`);
    expect(req.request.method).toBe('GET');
    req.flush(DTO);
  });

  it('create: POST /tenants/patients/:id/odontograms con clinical_record_id/encounter_id/dentition y nunca tenant_id', () => {
    const dto = { clinical_record_id: 'cr-1', encounter_id: 'enc-1', dentition: 'temporal', tenant_id: 'x', patient_id: 'y' };
    api.create('pat-1', dto as CreateOdontogramDto).subscribe();
    const req = http.expectOne(`${API}/tenants/patients/pat-1/odontograms`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ clinical_record_id: 'cr-1', encounter_id: 'enc-1', dentition: 'temporal' });
    req.flush(DTO, { status: 201, statusText: 'Created' });
  });

  it('create: encounter_id y dentition ausentes no viajan', () => {
    api.create('pat-1', { clinical_record_id: 'cr-1', encounter_id: null }).subscribe();
    const req = http.expectOne(`${API}/tenants/patients/pat-1/odontograms`);
    expect(req.request.body).toEqual({ clinical_record_id: 'cr-1' });
    req.flush(DTO);
  });
});

describe('OdontogramApi: toast global', () => {
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

  it('403 / 404 del current y 403 / 404 / 409 / 422 del alta: sin toast genérico (la pantalla muestra el suyo)', () => {
    const api = TestBed.inject(OdontogramApi);
    for (const status of [403, 404]) {
      api.getCurrent('pat-1').subscribe({ error: () => {} });
      http.expectOne(`${API}/tenants/patients/pat-1/odontogram/current`).flush(null, { status, statusText: 'x' });
    }
    for (const status of [403, 404, 409, 422]) {
      api.create('pat-1', { clinical_record_id: 'cr-1' }).subscribe({ error: () => {} });
      http.expectOne(`${API}/tenants/patients/pat-1/odontograms`).flush({ detail: 'x' }, { status, statusText: 'x' });
    }
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe('ODONTOGRAM_REPOSITORY (HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la implementación default es la HTTP', () => {
    expect(TestBed.inject(ODONTOGRAM_REPOSITORY)).toBe(TestBed.inject(HttpOdontogramRepository));
  });

  it('resolveClinicalRecordId: toma el id de GET /tenants/patients/:id/clinical-record', () => {
    let id: string | undefined;
    TestBed.inject(ODONTOGRAM_REPOSITORY).resolveClinicalRecordId('pat-1').subscribe(r => (id = r));
    http.expectOne(`${API}/tenants/patients/pat-1/clinical-record`).flush({ id: 'cr-9', patient_id: 'pat-1' });
    expect(id).toBe('cr-9');
  });

  it('getPatient: nombre + documento', () => {
    let label: string | undefined;
    TestBed.inject(ODONTOGRAM_REPOSITORY).getPatient('pat-1').subscribe(p => (label = p.label));
    http.expectOne(`${API}/tenants/patients/pat-1`).flush({ id: 'pat-1', first_name: 'Ana', last_name: 'Gómez', document_number: '301' });
    expect(label).toBe('Ana Gómez — 301');
  });

  it('odontogramEnabled: null hasta cargar /tenants/me/features; luego el valor del módulo', () => {
    const repo = TestBed.inject(ODONTOGRAM_REPOSITORY);
    expect(repo.odontogramEnabled()).toBeNull();
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(`${API}/tenants/me/features`).flush({ modules: { odontogram: true } });
    expect(repo.odontogramEnabled()).toBe(true);
  });
});
