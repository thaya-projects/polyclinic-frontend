import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';
import { AuthStore } from '../../core/services/auth-store.service';
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
