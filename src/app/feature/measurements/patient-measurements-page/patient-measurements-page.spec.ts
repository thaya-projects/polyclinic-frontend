import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, firstValueFrom, throwError } from 'rxjs';
import { PatientMeasurementsPage } from './patient-measurements-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { MEASUREMENTS_REPOSITORY } from '../../../core/services/measurements-repository';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { MockMeasurementsRepository } from '../../../testing/measurements-mock.repository';
import { CreatedMeasurement } from '../../../core/models/measurement.model';
import {
  MEASUREMENTS_ACCESS_DENIED_MESSAGE, MEASUREMENT_FORBIDDEN_MESSAGE, PATIENT_NOT_FOUND_MESSAGE,
} from '../../../shared/utils/measurements-error.util';

@Component({ template: '' })
class Stub {}

describe('PatientMeasurementsPage (mock repositories)', () => {
  let harness: RouterTestingHarness;
  let repo: MockMeasurementsRepository;
  let encounters: MockEncountersRepository;

  const el = () => harness.routeNativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el().querySelector<T>(`[data-testid="${testId}"]`);
  const all = (testId: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  const rowTypes = () => all('measurement-row-type').map(c => c.textContent?.trim());
  // El modal se proyecta dentro del componente de la ruta.
  const doc = () => harness.fixture.nativeElement as HTMLElement;
  const d = <T extends HTMLElement = HTMLElement>(testId: string) => doc().querySelector<T>(`[data-testid="${testId}"]`);

  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(patientId = 'pat-1'): Promise<PatientMeasurementsPage> {
    const cmp = await harness.navigateByUrl(`/patients/${patientId}/measurements`, PatientMeasurementsPage);
    await settle();
    return cmp;
  }

  function fill(testId: string, value: string, event = 'input'): void {
    const input = d<HTMLInputElement | HTMLSelectElement>(testId)!;
    input.value = value;
    input.dispatchEvent(new Event(event));
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'patients/:patientId/measurements', component: PatientMeasurementsPage },
          { path: 'patients', component: Stub },
          { path: 'encounters/:id', component: Stub },
        ]),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: MEASUREMENTS_REPOSITORY, useClass: MockMeasurementsRepository },
      ],
    });
    encounters = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    repo = TestBed.inject(MEASUREMENTS_REPOSITORY) as MockMeasurementsRepository;
    harness = await RouterTestingHarness.create();
  });

  it('lista ordenada por measured_at desc, con tipo en español, valor, unidad y link al encuentro', async () => {
    await open();
    expect(q('patient-name')?.textContent).toContain('Ana Gómez');
    expect(rowTypes()).toEqual(['Temperatura', 'Frecuencia cardíaca', 'Peso', 'Presión sistólica', 'waist_circumference']);
    expect(all('measurement-row-value').map(c => c.textContent?.trim())).toEqual(['37,8', '72', '68,5', '130', '84']);
    expect(all('measurement-row-unit')[0].textContent).toContain('°C');
    const links = all('measurement-row-encounter').map(a => a.getAttribute('href'));
    expect(links).toEqual(['/encounters/enc-1', '/encounters/enc-1', '/encounters/enc-3']);
    expect(all('measurement-row-encounter')[0].getAttribute('aria-label'))
      .toMatch(/^Ver el encuentro de la medición de Frecuencia cardíaca del /);
  });

  it('filtro por tipo', async () => {
    await open();
    const filter = q<HTMLSelectElement>('filter-type')!;
    filter.value = 'weight';
    filter.dispatchEvent(new Event('change'));
    await settle();
    expect(rowTypes()).toEqual(['Peso']);
  });

  it('filtro por un tipo libre (código)', async () => {
    const page = await open();
    page.onFilterSelect(page.otherFilter);
    await settle();
    const input = q<HTMLInputElement>('filter-custom-type')!;
    input.value = 'Waist_Circumference';
    q('filter-custom-apply')!.click();
    await settle();
    expect(rowTypes()).toEqual(['waist_circumference']);
    expect(page.store.typeFilter()).toBe('waist_circumference');

    input.value = '1 malo';
    q('filter-custom-apply')!.click();
    await settle();
    expect(q('filter-custom-type-error')?.getAttribute('role')).toBe('alert');
    expect(rowTypes()).toEqual(['waist_circumference']);
  });

  it('paginación server-side', async () => {
    for (let i = 0; i < 7; i++) {
      await firstValueFrom(repo.create('pat-1', {
        type: 'heart_rate', value: 60 + i, measured_at: `2026-09-0${i + 1}T10:00:00Z`,
      }));
    }
    const page = await open();
    expect(rowTypes().length).toBe(10);
    page.setPage(2);
    await settle();
    expect(all('measurement-row-value').map(c => c.textContent?.trim())).toEqual(['61', '60']);
  });

  it('el alta aparece en el listado sin recargar (sin volver a pedir la lista) y cierra el modal', async () => {
    const page = await open();
    const list = vi.spyOn(repo, 'list');
    page.openCreate();
    await settle();
    fill('measurement-type', 'spo2', 'change');
    fill('measurement-value', '97');
    d('btn-save-measurement')!.click();
    await settle();

    expect(list).not.toHaveBeenCalled();
    expect(rowTypes()[0]).toBe('Saturación de O₂');
    expect(rowTypes().length).toBe(6);
    expect(page.createOpen()).toBe(false);
  });

  it('el form solo existe con el modal abierto: cancelar lo limpia y reabrir arranca de cero', async () => {
    const page = await open();
    expect(d('measurement-form')).toBeNull();
    page.openCreate();
    await settle();
    fill('measurement-type', 'weight', 'change');
    fill('measurement-value', '9999');
    d('btn-save-measurement')!.click();
    await settle();
    expect(d('measurement-value-error')).not.toBeNull();

    page.closeCreate();
    await settle();
    expect(d('measurement-form')).toBeNull();

    page.openCreate();
    await settle();
    expect(d<HTMLSelectElement>('measurement-type')!.value).toBe('');
    expect(d<HTMLInputElement>('measurement-value')!.value).toBe('');
    expect(d('measurement-value-error')).toBeNull();
  });

  it('la fecha por defecto es la de apertura del modal, no la de carga de la página', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2026, 9, 17, 8, 0));
      const page = await open();
      vi.setSystemTime(new Date(2026, 9, 17, 10, 20));
      page.openCreate();
      await settle();
      expect(d<HTMLInputElement>('measurement-measured-at')!.value).toBe('2026-10-17T10:20');
    } finally {
      vi.useRealTimers();
    }
  });

  it('el form del modal no guarda sin tipo ni valor', async () => {
    const page = await open();
    const create = vi.spyOn(repo, 'create');
    page.openCreate();
    await settle();
    d('btn-save-measurement')!.click();
    await settle();
    expect(create).not.toHaveBeenCalled();
    expect(d('measurement-required-error')).not.toBeNull();
  });

  it('guarda de reentrada: con un alta en vuelo no sale otra', async () => {
    const page = await open();
    const pending$ = new Subject<CreatedMeasurement>();
    const create = vi.spyOn(repo, 'create').mockReturnValue(pending$);
    page.onCreate({ type: 'weight', value: 70 });
    page.onCreate({ type: 'weight', value: 71 });
    expect(create).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('422 al registrar: mensaje en español debajo del campo que falló (sin banner)', async () => {
    const page = await open();
    page.openCreate();
    page.onCreate({ type: 'weight', value: 9999, unit: 'kg' });
    await settle();
    expect(d('measurement-value-error')?.textContent).toContain('Peso: el valor debe estar entre 0,2 y 700 kg.');
    expect(d('create-error')).toBeNull();
  });

  it('401 al registrar: no muestra error (lo resuelve authInterceptor)', async () => {
    const page = await open();
    vi.spyOn(repo, 'create').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    page.openCreate();
    page.onCreate({ type: 'weight', value: 70 });
    await settle();
    expect(d('create-error')).toBeNull();
    expect(page.store.busy()).toBe(false);
  });

  it('404 del paciente al leer → "Paciente no encontrado."', async () => {
    await open('pat-x');
    expect(q('patient-not-found')?.textContent).toContain(PATIENT_NOT_FOUND_MESSAGE);
    expect(q('btn-new-measurement')).toBeNull();
  });

  it('404 del paciente al registrar → "Paciente no encontrado."', async () => {
    const page = await open();
    vi.spyOn(repo, 'create').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 404, error: { detail: "Patient with id 'pat-1' was not found." },
    })));
    page.openCreate();
    page.onCreate({ type: 'weight', value: 70 });
    await settle();
    expect(q('patient-not-found')?.textContent).toContain(PATIENT_NOT_FOUND_MESSAGE);
    expect(page.createOpen()).toBe(false);
  });

  it('sin profesional ni clinical.void: aviso de acceso y no se pide la lista', async () => {
    encounters.setCurrentUser('nadie');
    const list = vi.spyOn(repo, 'list');
    await open();
    expect(q('access-denied')?.textContent).toContain(MEASUREMENTS_ACCESS_DENIED_MESSAGE);
    expect(list).not.toHaveBeenCalled();
  });

  it('403 del backend al leer: mismo aviso de acceso', async () => {
    vi.spyOn(repo, 'list').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await open();
    expect(q('access-denied')?.textContent).toContain(MEASUREMENTS_ACCESS_DENIED_MESSAGE);
  });

  it('clinical.void sin profesional: lee, pero "Registrar medición" deshabilitado con motivo', async () => {
    encounters.setCurrentUser('admin', ['clinical.void']);
    await open();
    expect(rowTypes().length).toBe(5);
    expect(q<HTMLButtonElement>('btn-new-measurement')!.disabled).toBe(true);
    expect(q('register-disabled-reason')?.textContent).toContain(MEASUREMENT_FORBIDDEN_MESSAGE);
  });
});
