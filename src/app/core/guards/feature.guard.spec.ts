import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Route, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { FeaturesService } from '../services/features.service';
import { AuthStore } from '../services/auth-store.service';
import { AuthTokenService } from '../services/auth-token.service';
import { environment } from '../../../environments/environment';
import { odontologyRoutes, routes } from '../../app.routes';
import { ODONTOGRAM_DISABLED_MESSAGE } from '../../shared/utils/module-disabled.util';

@Component({ template: '<p data-testid="real-page">Catálogo real</p>' })
class StubPage {}

// La navegación llega al canMatch tras algunas microtareas.
const tick = () => new Promise(resolve => setTimeout(resolve));

const FEATURES_URL = `${environment.apiUrl}/tenants/me/features`;

// Fase 6 FF: acceso por URL directa a las rutas de odontología según el módulo "odontogram".
describe('featureEnabledGuard + fallback "Módulo no habilitado"', () => {
  let http: HttpTestingController;

  const el = (harness: RouterTestingHarness) => harness.routeNativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(odontologyRoutes([
          { path: 'odontology/catalog', component: StubPage, canActivate: [authGuard] },
        ])),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthTokenService).save({ access_token: 't' } as never);
    TestBed.inject(AuthStore).setSession({
      access_token: 't',
      user: { id: 'u-1', full_name: 'Laura', email: 'l@x.com', is_superadmin: false, roles: [] },
      tenant: { id: 'ten-1', name: 'Clínica', slug: 'clinica' },
    });
  });

  afterEach(() => {
    TestBed.inject(AuthStore).clearSession();
    TestBed.inject(AuthTokenService).clear();
  });

  async function navigate(odontogram: boolean): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();
    const done = harness.navigateByUrl('/odontology/catalog');
    await tick();
    http.expectOne(FEATURES_URL).flush({ modules: { odontogram } });
    await done;
    harness.detectChanges();
    return harness;
  }

  it('módulo activo: la URL directa abre la pantalla normal (espera a /tenants/me/features)', async () => {
    const harness = await navigate(true);
    expect(el(harness).querySelector('[data-testid="real-page"]')).not.toBeNull();
    expect(el(harness).querySelector('[data-testid="module-disabled"]')).toBeNull();
  });

  it('módulo apagado: la URL directa muestra "Módulo no habilitado" (no la pantalla ni un 403 crudo)', async () => {
    const harness = await navigate(false);
    const blocked = el(harness).querySelector('[data-testid="module-disabled"]');
    expect(blocked?.textContent).toContain('Módulo no habilitado');
    expect(blocked?.textContent).toContain(ODONTOGRAM_DISABLED_MESSAGE);
    expect(el(harness).querySelector('[data-testid="real-page"]')).toBeNull();
  });

  it('features ya cargados: decide sin otro GET', async () => {
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(FEATURES_URL).flush({ modules: { odontogram: true } });
    const harness = await RouterTestingHarness.create('/odontology/catalog');
    http.expectNone(FEATURES_URL);
    expect(el(harness).querySelector('[data-testid="real-page"]')).not.toBeNull();
  });

  it('error al cargar features: cerrado por default → "Módulo no habilitado"', async () => {
    const harness = await RouterTestingHarness.create();
    const done = harness.navigateByUrl('/odontology/catalog');
    await tick();
    http.expectOne(FEATURES_URL).flush(null, { status: 500, statusText: 'x' });
    await done;
    harness.detectChanges();
    expect(el(harness).querySelector('[data-testid="module-disabled"]')).not.toBeNull();
  });
});

describe('app.routes: rutas de odontología gated', () => {
  const children = routes.find(r => r.children?.some(c => c.path === 'odontology/catalog'))!.children!;

  for (const path of ['odontology/catalog', 'odontology/odontogram', 'patients/:patientId/odontogram']) {
    it(`${path}: versión con canMatch seguida del fallback con authGuard`, () => {
      const matches = children.filter((c: Route) => c.path === path);
      expect(matches).toHaveLength(2);
      expect(matches[0].canMatch).toHaveLength(1);
      expect(matches[1].canMatch).toBeUndefined();
      expect(matches[1].canActivate).toEqual([authGuard]);
      expect(children.indexOf(matches[1])).toBe(children.indexOf(matches[0]) + 1);
    });
  }
});

describe('FeaturesService.ready', () => {
  it('comparte el GET en vuelo entre loadMine (Shell) y el guard', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const features = TestBed.inject(FeaturesService);
    let ready = false;
    features.loadMine();
    features.ready().subscribe(() => (ready = true));
    TestBed.inject(HttpTestingController).expectOne(FEATURES_URL).flush({ modules: { odontogram: true } });
    expect(ready).toBe(true);
    expect(features.enabled('odontogram')).toBe(true);
  });
});
