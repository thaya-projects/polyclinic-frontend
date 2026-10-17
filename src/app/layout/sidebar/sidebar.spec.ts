import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';
import { AuthStore } from '../../core/services/auth-store.service';
import { FeaturesService } from '../../core/services/features.service';
import { ENCOUNTERS_REPOSITORY } from '../../core/services/encounters-repository';
import { MockEncountersRepository } from '../../testing/encounters-mock.repository';

// Fase 4: la entrada "Encuentros" solo aparece para quien puede leer notas clínicas
// (profesional activo o clinical.void).
describe('Sidebar: entrada Encuentros', () => {
  let fixture: ComponentFixture<Sidebar>;
  let repo: MockEncountersRepository;

  const labels = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a, nav span')).map(e => e.textContent?.trim());

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    repo = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    TestBed.inject(AuthStore).setSession({
      access_token: 't',
      user: { id: 'mock-user-1', full_name: 'Laura', email: 'l@x.com', is_superadmin: false, roles: [] },
      tenant: { id: 'ten-1', name: 'Clínica', slug: 'clinica' },
    });
  });

  afterEach(() => TestBed.inject(AuthStore).clearSession());

  it('profesional activo: ve "Encuentros"', async () => {
    await render();
    expect(labels()).toContain('Encuentros');
  });

  it('sin profesional ni clinical.void: la entrada se oculta', async () => {
    repo.setCurrentUser('user-sin-profesional');
    await render();
    expect(labels()).not.toContain('Encuentros');
    expect(labels()).toContain('Pacientes');
  });

  it('con clinical.void aunque no sea profesional: ve "Encuentros"', async () => {
    repo.setCurrentUser('admin-user', ['clinical.void']);
    await render();
    expect(labels()).toContain('Encuentros');
  });
});

// Fase 6: grupo Odontología (Catálogo, Odontograma), gated por el feature 'odontogram'.
describe('Sidebar: Odontología', () => {
  let fixture: ComponentFixture<Sidebar>;
  let http: HttpTestingController;

  const labels = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a, nav span, nav button'))
      .map(e => e.textContent?.trim());

  async function renderWith(odontogram: boolean): Promise<void> {
    TestBed.inject(FeaturesService).loadMine();
    http.expectOne(r => r.url.endsWith('/tenants/me/features')).flush({ modules: { odontogram } });
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('feature activo: muestra el grupo con "Catálogo" enlazado a /odontology/catalog', async () => {
    await renderWith(true);
    expect(labels()).toContain('Odontología');
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'))
      .find(a => a.textContent?.trim() === 'Catálogo') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/odontology/catalog');
  });

  it('feature activo: "Odontograma" ya no es "Pronto" y enlaza a /odontology/odontogram', async () => {
    await renderWith(true);
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'))
      .find(a => a.textContent?.trim() === 'Odontograma') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/odontology/odontogram');
    expect(link.textContent).not.toContain('Pronto');
  });

  it('feature apagado: el grupo entero se oculta (Catálogo y Odontograma)', async () => {
    await renderWith(false);
    expect(labels()).not.toContain('Odontología');
    expect(labels()).not.toContain('Catálogo');
    expect(labels()).not.toContain('Odontograma');
  });

  it('features sin cargar todavía: el grupo queda oculto (cerrado por default)', async () => {
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(labels()).not.toContain('Odontología');
  });
});
