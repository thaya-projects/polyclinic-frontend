import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';
import { FeaturesService } from '../../core/services/features.service';
import { ENCOUNTERS_REPOSITORY } from '../../core/services/encounters-repository';
import { MockEncountersRepository } from '../../testing/encounters-mock.repository';

// Encuentros y Odontograma ya no tienen entrada propia: se llega a ellos desde la
// ficha del paciente. "Catálogo dental" queda como leaf directo, gated por 'odontogram'.
describe('Sidebar: Catálogo dental', () => {
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

  it('feature activo: "Catálogo dental" enlaza a /odontology/catalog', async () => {
    await renderWith(true);
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'))
      .find(a => a.textContent?.trim() === 'Catálogo dental') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/odontology/catalog');
  });

  it('feature apagado: la entrada se oculta', async () => {
    await renderWith(false);
    expect(labels()).not.toContain('Catálogo dental');
  });

  it('features sin cargar todavía: la entrada queda oculta (cerrado por default)', async () => {
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(labels()).not.toContain('Catálogo dental');
  });
});
