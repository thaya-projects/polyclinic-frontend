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
import { ToastService } from '../../../core/services/toast.service';
import { Encounter } from '../../../core/models/encounter.model';
import {
  PATIENT_NOT_FOUND_MESSAGE, PRESCRIPTIONS_ACCESS_DENIED_MESSAGE, PRESCRIPTION_CONCURRENCY_MESSAGE,
  PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE, PRESCRIPTION_FORBIDDEN_MESSAGE, PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE,
  PRESCRIPTION_NOT_FOUND_MESSAGE, PRESCRIPTION_WINDOW_CLOSED_MESSAGE, PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE,
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
  const hintOf = (index: number) => card(index).querySelector('[data-testid="add-item-hint"]')?.textContent?.trim() ?? null;
  const http409 = (detail?: string) => throwError(() => new HttpErrorResponse({ status: 409, error: detail ? { detail } : null }));
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
    // rx-3: suelta, mía, vieja según el reloj local → NO se deshabilita (decide el backend); solo una pista.
    expect(addButton(3).disabled).toBe(false);
    expect(reasonOf(3)).toBeNull();
    expect(hintOf(3)).toBe(PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE);
    expect(addButton(3).getAttribute('aria-describedby')).toBe(card(3).querySelector('[data-testid="add-item-hint"]')!.id);
    expect(hintOf(0)).toBeNull();
  });

  it('la pista de la ventana de 24 h se re-evalúa con el reloj, pero el botón sigue habilitado', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      const issued = Date.now() - 23.5 * 3600_000;
      repo.setIssuedAt('rx-2', new Date(issued).toISOString());
      await open();
      expect(hintOf(0)).toBeNull();
      vi.advanceTimersByTime(31 * 60_000);
      await settle();
      expect(addButton(0).disabled).toBe(false);
      expect(hintOf(0)).toBe(PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reloj del cliente adelantado: no bloquea el envío; el backend (dentro de la ventana) lo acepta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const serverNow = new Date('2026-10-17T12:00:00Z').getTime();
      vi.setSystemTime(serverNow);
      repo.setIssuedAt('rx-2', new Date(serverNow - 23 * 3600_000).toISOString());
      // El cliente va 3 h adelantado: según él pasaron 26 h.
      vi.setSystemTime(serverNow + 3 * 3600_000);
      await open();
      expect(addButton(0).disabled).toBe(false);
      expect(hintOf(0)).toBe(PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE);
      addButton(0).click();
      await settle();
      typeIn(d<HTMLInputElement>('item-medication')!, 'Ibuprofeno');
      // El request lo evalúa el servidor con SU hora.
      vi.setSystemTime(serverNow);
      d('btn-save-item')!.click();
      await settle();
      expect(medicationsOf(0)).toEqual(['Amoxicilina', 'Ibuprofeno']);
      expect(d('item-error')).toBeNull();
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

  it('el contenedor no envía ítems a recetas bloqueadas en el cliente (permiso); la ventana la decide el backend', async () => {
    const page = await open();
    const addItem = vi.spyOn(repo, 'addItem');
    page.onAddItem({ prescriptionId: 'rx-4', dto: { medication: 'A' } });
    expect(addItem).not.toHaveBeenCalled();
    // rx-3 venció según el cliente, pero se intenta: el 409 del backend la bloquea.
    page.onAddItem({ prescriptionId: 'rx-3', dto: { medication: 'A' } });
    await settle();
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addButton(3).disabled).toBe(true);
    expect(reasonOf(3)).toBe(PRESCRIPTION_WINDOW_CLOSED_MESSAGE);
    expect(hintOf(3)).toBeNull();
    page.onAddItem({ prescriptionId: 'rx-3', dto: { medication: 'B' } });
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['concurrencia', 'The resource was modified by another request. Reload and try again.'],
    ['índice único', "Unique constraint 'IX_prescription_items_position' on table 'prescription_items' was violated."],
  ])('409 de %s al agregar: mensaje para reintentar, la receta NO se bloquea y se recarga la lista', async (_, detail) => {
    await open();
    addButton(0).click();
    await settle();
    const list = vi.spyOn(repo, 'listByPatient');
    vi.spyOn(repo, 'addItem').mockReturnValueOnce(http409(detail));
    typeIn(d<HTMLInputElement>('item-medication')!, 'Ibuprofeno');
    d('btn-save-item')!.click();
    await settle();
    expect(card(0).querySelector('[data-testid="item-error"]')?.textContent).toContain(PRESCRIPTION_CONCURRENCY_MESSAGE);
    expect(addButton(0).disabled).toBe(false);
    expect(reasonOf(0)).toBeNull();
    expect(list).toHaveBeenCalledTimes(1);
    // El formulario sigue abierto con lo escrito: reintentar funciona.
    expect(d<HTMLInputElement>('item-medication')!.value).toBe('Ibuprofeno');
    d('btn-save-item')!.click();
    await settle();
    expect(medicationsOf(0)).toEqual(['Amoxicilina', 'Ibuprofeno']);
  });

  it('409 de concurrencia al emitir una receta suelta: mensaje sin hablar de encuentro, modal abierto, lista recargada', async () => {
    const page = await open();
    page.openCreate();
    await settle();
    const list = vi.spyOn(repo, 'listByPatient');
    vi.spyOn(repo, 'createStandalone').mockReturnValueOnce(http409('The resource was modified by another request. Reload and try again.'));
    page.onCreate({ notes: 'x' });
    await settle();
    expect(d('create-error')?.textContent).toContain(PRESCRIPTION_CONCURRENCY_MESSAGE);
    expect(d('create-error')?.textContent).not.toMatch(/encuentro/i);
    expect(page.createOpen()).toBe(true);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('emitir una receta suelta estando en la página 2 lleva a la página 1', async () => {
    for (let i = 0; i < 8; i++) await firstValueFrom(repo.createStandalone('pat-1', { notes: `n${i}` }));
    const page = await open();
    page.setPage(2);
    await settle();
    expect(page.store.page()).toBe(2);
    page.openCreate();
    page.onCreate({ notes: 'Nueva' });
    await settle();
    expect(page.store.page()).toBe(1);
    expect(cards().length).toBe(10);
    expect(dAll('prescription-notes-text').some(n => n.textContent?.includes('Nueva'))).toBe(true);
  });

  it('solo consulta el estado de los encuentros de las recetas propias (no de las de otros profesionales)', async () => {
    const getById = vi.spyOn(encounters, 'getById');
    await open();
    expect(getById.mock.calls.map(c => c[0])).toEqual(['enc-1']);
  });

  it('foco: al cerrar el formulario de ítem vuelve a "Agregar medicamento"', async () => {
    await open();
    addButton(0).click();
    await settle();
    d('btn-cancel-item')!.click();
    await settle();
    expect(d('prescription-item-form')).toBeNull();
    expect(document.activeElement).toBe(addButton(0));
    expect(addButton(0).id).toBe('prescription-rx-2-add-btn');
  });

  it('foco: si la receta queda bloqueada (409 de la ventana), va al aviso de error', async () => {
    await open();
    addButton(0).click();
    await settle();
    vi.spyOn(repo, 'addItem').mockReturnValue(http409('Items can only be added within 24 hours of issuing a standalone prescription.'));
    typeIn(d<HTMLInputElement>('item-medication')!, 'Ibuprofeno');
    d('btn-save-item')!.click();
    await settle();
    const alert = card(0).querySelector<HTMLElement>('[data-testid="item-error"]')!;
    expect(addButton(0).disabled).toBe(true);
    expect(alert.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(alert);
  });

  it('404 del paciente al leer → "Paciente no encontrado."', async () => {
    await open('pat-x');
    expect(q('patient-not-found')?.textContent).toContain(PATIENT_NOT_FOUND_MESSAGE);
    expect(q('btn-new-standalone')).toBeNull();
  });

  it('404 de la receta al agregar → aviso (toast) y la lista se recarga', async () => {
    const page = await open();
    const toastError = vi.spyOn(TestBed.inject(ToastService), 'error');
    const list = vi.spyOn(repo, 'listByPatient');
    vi.spyOn(repo, 'addItem').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 404, error: { detail: "Prescription with id 'rx-2' was not found." },
    })));
    page.onAddItem({ prescriptionId: 'rx-2', dto: { medication: 'A' } });
    await settle();
    expect(list).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(PRESCRIPTION_NOT_FOUND_MESSAGE);
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
