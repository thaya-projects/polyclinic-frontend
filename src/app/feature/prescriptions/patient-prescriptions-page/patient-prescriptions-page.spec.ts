import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, firstValueFrom, throwError } from 'rxjs';
import {
  ENCOUNTER_STATUS_CHECKING_MESSAGE, PatientPrescriptionsPage,
} from './patient-prescriptions-page';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { PRESCRIPTIONS_REPOSITORY } from '../../../core/services/prescriptions-repository';
import { MockEncountersRepository } from '../../../testing/encounters-mock.repository';
import { MockPrescriptionsRepository } from '../../../testing/prescriptions-mock.repository';
import { CreatedPrescriptionItem } from '../../../core/models/prescription.model';
import { Encounter } from '../../../core/models/encounter.model';
import {
  PATIENT_NOT_FOUND_MESSAGE, PRESCRIPTIONS_ACCESS_DENIED_MESSAGE, PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE,
  PRESCRIPTION_FORBIDDEN_MESSAGE, PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE, PRESCRIPTION_WINDOW_CLOSED_MESSAGE,
} from '../../../shared/utils/prescriptions-error.util';

@Component({ template: '' })
class Stub {}

// Recetas del paciente pat-1 en el mock (issued_at desc): rx-2 suelta reciente (prof-1, dentro de las
// 24 h), rx-1 de enc-1 open (prof-1), rx-4 de enc-3 (prof-2), rx-3 suelta vieja (prof-1).
describe('PatientPrescriptionsPage (mock repositories)', () => {
  let harness: RouterTestingHarness;
  let repo: MockPrescriptionsRepository;
  let encounters: MockEncountersRepository;

  const el = () => harness.routeNativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el().querySelector<T>(`[data-testid="${testId}"]`);
  const doc = () => harness.fixture.nativeElement as HTMLElement;
  const d = <T extends HTMLElement = HTMLElement>(testId: string) => doc().querySelector<T>(`[data-testid="${testId}"]`);
  const dAll = <T extends HTMLElement = HTMLElement>(testId: string) => Array.from(doc().querySelectorAll<T>(`[data-testid="${testId}"]`));
  const cards = () => dAll('prescription-card');
  const card = (index: number) => cards()[index];
  const addButton = (index: number) => card(index).querySelector<HTMLButtonElement>('[data-testid="btn-add-item"]')!;
  const reasonOf = (index: number) => card(index).querySelector('[data-testid="add-item-reason"]')?.textContent?.trim() ?? null;
  const medicationsOf = (index: number) =>
    Array.from(card(index).querySelectorAll('[data-testid="prescription-item-medication"]')).map(c => c.textContent?.trim());

  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(patientId = 'pat-1'): Promise<PatientPrescriptionsPage> {
    const cmp = await harness.navigateByUrl(`/patients/${patientId}/prescriptions`, PatientPrescriptionsPage);
    await settle();
    return cmp;
  }

  function typeIn(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'patients/:patientId/prescriptions', component: PatientPrescriptionsPage },
          { path: 'patients', component: Stub },
          { path: 'encounters/:id', component: Stub },
        ]),
        { provide: ENCOUNTERS_REPOSITORY, useClass: MockEncountersRepository },
        { provide: PRESCRIPTIONS_REPOSITORY, useClass: MockPrescriptionsRepository },
      ],
    });
    encounters = TestBed.inject(ENCOUNTERS_REPOSITORY) as MockEncountersRepository;
    repo = TestBed.inject(PRESCRIPTIONS_REPOSITORY) as MockPrescriptionsRepository;
    harness = await RouterTestingHarness.create();
  });

  it('lista paginada issued_at desc; las que tienen encuentro llevan link al encuentro', async () => {
    await open();
    expect(q('patient-name')?.textContent).toContain('Ana Gómez');
    expect(cards().length).toBe(4);
    expect(medicationsOf(0)).toEqual(['Amoxicilina']);
    expect(medicationsOf(1)).toEqual(['Ibuprofeno', 'Paracetamol']);
    const links = dAll('prescription-encounter-link').map(a => a.getAttribute('href'));
    expect(links).toEqual(['/encounters/enc-1', '/encounters/enc-3']);
    expect(card(0).querySelector('[data-testid="prescription-standalone"]')).not.toBeNull();
    expect(card(0).querySelector('[data-testid="prescription-professional"]')?.textContent).toContain('Dra. Laura Méndez');
  });

  it('paginación server-side', async () => {
    for (let i = 0; i < 8; i++) await firstValueFrom(repo.createStandalone('pat-1', { notes: `n${i}` }));
    const page = await open();
    expect(cards().length).toBe(10);
    page.setPage(2);
    await settle();
    expect(cards().length).toBe(2);
  });

  it('"Agregar medicamento" según profesional, ventana de 24 h y estado del encuentro (cálculo del cliente)', async () => {
    await open();
    // rx-2: suelta, mía, reciente → habilitado.
    expect(addButton(0).disabled).toBe(false);
    expect(reasonOf(0)).toBeNull();
    // rx-1: de enc-1 open, mía → habilitado.
    expect(addButton(1).disabled).toBe(false);
    // rx-4: de otro profesional.
    expect(addButton(2).disabled).toBe(true);
    expect(reasonOf(2)).toBe(PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE);
    expect(addButton(2).getAttribute('aria-describedby')).toBe(card(2).querySelector('[data-testid="add-item-reason"]')!.id);
    // rx-3: suelta, mía, vieja.
    expect(addButton(3).disabled).toBe(true);
    expect(reasonOf(3)).toBe(PRESCRIPTION_WINDOW_CLOSED_MESSAGE);
  });

  it('la ventana de 24 h se re-evalúa con el reloj: al vencer se deshabilita', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      const issued = Date.now() - 23.5 * 3600_000;
      repo.setIssuedAt('rx-2', new Date(issued).toISOString());
      await open();
      expect(addButton(0).disabled).toBe(false);
      vi.advanceTimersByTime(31 * 60_000);
      await settle();
      expect(addButton(0).disabled).toBe(true);
      expect(reasonOf(0)).toBe(PRESCRIPTION_WINDOW_CLOSED_MESSAGE);
    } finally {
      vi.useRealTimers();
    }
  });

  it('encuentro firmado: deshabilitado; mientras se verifica su estado: deshabilitado con aviso', async () => {
    await firstValueFrom(encounters.sign('enc-1', { version: 1 }));
    await open();
    expect(addButton(1).disabled).toBe(true);
    expect(reasonOf(1)).toBe(PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE);

    const pending$ = new Subject<Encounter>();
    vi.spyOn(encounters, 'getById').mockReturnValue(pending$);
    await open('pat-2');
    expect(reasonOf(0)).toBe(ENCOUNTER_STATUS_CHECKING_MESSAGE);
    pending$.complete();
  });

  it('agregar varios medicamentos a una receta suelta: aparecen sin recargar', async () => {
    await open();
    const list = vi.spyOn(repo, 'listByPatient');
    addButton(0).click();
    await settle();
    typeIn(d<HTMLInputElement>('item-medication')!, 'Ibuprofeno');
    d('btn-save-item')!.click();
    await settle();
    typeIn(d<HTMLInputElement>('item-medication')!, 'Loratadina');
    d('btn-save-item')!.click();
    await settle();
    expect(medicationsOf(0)).toEqual(['Amoxicilina', 'Ibuprofeno', 'Loratadina']);
    expect(list).not.toHaveBeenCalled();
  });

  it('el ítem no se guarda sin medication', async () => {
    await open();
    const addItem = vi.spyOn(repo, 'addItem');
    addButton(0).click();
    await settle();
    d('btn-save-item')!.click();
    await settle();
    expect(addItem).not.toHaveBeenCalled();
    expect(d('item-medication-error')).not.toBeNull();
  });

  it('409 por la ventana de 24 h (el cliente creía que estaba dentro): mensaje y se deshabilita esa receta', async () => {
    await open();
    addButton(0).click();
    await settle();
    // Venció en el servidor entre que se abrió y se envió (el cliente sigue pensando que está dentro).
    vi.spyOn(repo, 'addItem').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { detail: 'Items can only be added within 24 hours of issuing a standalone prescription.' },
    })));
    typeIn(d<HTMLInputElement>('item-medication')!, 'Ibuprofeno');
    d('btn-save-item')!.click();
    await settle();
    expect(card(0).querySelector('[data-testid="item-error"]')?.textContent).toContain(PRESCRIPTION_WINDOW_CLOSED_MESSAGE);
    expect(addButton(0).disabled).toBe(true);
    expect(d('prescription-item-form')).toBeNull();
    // Las demás recetas no se tocan.
    expect(addButton(1).disabled).toBe(false);
  });

  it('nueva receta suelta (modal): sin encuentro, aparece arriba sin recargar y cierra el modal', async () => {
    const page = await open();
    const list = vi.spyOn(repo, 'listByPatient');
    const createSpy = vi.spyOn(repo, 'createStandalone');
    q('btn-new-standalone')!.click();
    await settle();
    typeIn(d<HTMLTextAreaElement>('prescription-notes')!, 'Indicaciones generales');
    typeIn(d<HTMLInputElement>('item-medication')!, 'Cetirizina');
    d('btn-save-prescription')!.click();
    await settle();

    expect(createSpy).toHaveBeenCalledWith('pat-1', { notes: 'Indicaciones generales', items: [{ medication: 'Cetirizina' }] });
    expect(list).not.toHaveBeenCalled();
    expect(cards().length).toBe(5);
    expect(medicationsOf(0)).toEqual(['Cetirizina']);
    expect(page.createOpen()).toBe(false);
    expect(addButton(0).disabled).toBe(false);
  });

  it('422 al emitir: mensaje en español dentro del modal', async () => {
    const page = await open();
    page.openCreate();
    page.onCreate({ notes: 'x'.repeat(2001) });
    await settle();
    expect(d('create-error')?.textContent).toContain('El campo notas no puede superar los 2000 caracteres.');
  });

  it('401 al agregar: no muestra error (lo resuelve authInterceptor)', async () => {
    const page = await open();
    vi.spyOn(repo, 'addItem').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    page.onAddItem({ prescriptionId: 'rx-2', dto: { medication: 'A' } });
    await settle();
    expect(d('item-error')).toBeNull();
    expect(page.store.busy()).toBe(false);
  });

  it('guarda de reentrada: con un ítem en vuelo no sale otro', async () => {
    const page = await open();
    const pending$ = new Subject<CreatedPrescriptionItem>();
    const addItem = vi.spyOn(repo, 'addItem').mockReturnValue(pending$);
    page.onAddItem({ prescriptionId: 'rx-2', dto: { medication: 'A' } });
    page.onAddItem({ prescriptionId: 'rx-2', dto: { medication: 'B' } });
    page.onCreate({});
    expect(addItem).toHaveBeenCalledTimes(1);
    pending$.complete();
  });

  it('el contenedor no envía ítems a recetas bloqueadas en el cliente', async () => {
    const page = await open();
    const addItem = vi.spyOn(repo, 'addItem');
    page.onAddItem({ prescriptionId: 'rx-3', dto: { medication: 'A' } });
    page.onAddItem({ prescriptionId: 'rx-4', dto: { medication: 'A' } });
    expect(addItem).not.toHaveBeenCalled();
  });

  it('404 del paciente al leer → "Paciente no encontrado."', async () => {
    await open('pat-x');
    expect(q('patient-not-found')?.textContent).toContain(PATIENT_NOT_FOUND_MESSAGE);
    expect(q('btn-new-standalone')).toBeNull();
  });

  it('404 de la receta al agregar → aviso y la lista se recarga', async () => {
    const page = await open();
    const list = vi.spyOn(repo, 'listByPatient');
    vi.spyOn(repo, 'addItem').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 404, error: { detail: "Prescription with id 'rx-2' was not found." },
    })));
    page.onAddItem({ prescriptionId: 'rx-2', dto: { medication: 'A' } });
    await settle();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('sin profesional ni clinical.void: aviso de acceso y no se pide la lista', async () => {
    encounters.setCurrentUser('nadie');
    const list = vi.spyOn(repo, 'listByPatient');
    await open();
    expect(q('access-denied')?.textContent).toContain(PRESCRIPTIONS_ACCESS_DENIED_MESSAGE);
    expect(list).not.toHaveBeenCalled();
  });

  it('403 del backend al leer: mismo aviso de acceso', async () => {
    vi.spyOn(repo, 'listByPatient').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await open();
    expect(q('access-denied')?.textContent).toContain(PRESCRIPTIONS_ACCESS_DENIED_MESSAGE);
  });

  it('clinical.void sin profesional: lee, pero no emite ni agrega (motivos visibles)', async () => {
    encounters.setCurrentUser('admin', ['clinical.void']);
    await open();
    expect(cards().length).toBe(4);
    expect(q<HTMLButtonElement>('btn-new-standalone')!.disabled).toBe(true);
    expect(q('create-disabled-reason')?.textContent).toContain(PRESCRIPTION_FORBIDDEN_MESSAGE);
    expect(cards().every((_, i) => addButton(i).disabled)).toBe(true);
  });
});
