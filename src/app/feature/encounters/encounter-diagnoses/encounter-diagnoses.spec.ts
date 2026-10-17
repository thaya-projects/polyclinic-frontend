import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { EncounterDiagnoses } from './encounter-diagnoses';
import { CreateDiagnosisDto, Diagnosis } from '../../../core/models/diagnosis.model';
import { DIAGNOSIS_REQUIRED_MESSAGE } from '../../../shared/utils/encounters-error.util';

const DIAGNOSES: Diagnosis[] = [
  { id: 'd1', encounter_id: 'e1', cie10_code: 'R51', description: 'Cefalea', is_definitive: false, created_at: '2026-10-10T14:00:00Z' },
  { id: 'd2', encounter_id: 'e1', cie10_code: null, description: 'Estrés laboral', is_definitive: true, created_at: '2026-10-10T14:05:00Z' },
];

describe('EncounterDiagnoses', () => {
  let fixture: ComponentFixture<EncounterDiagnoses>;
  let el: HTMLElement;
  let created: CreateDiagnosisDto[];
  let removed: string[];

  const q = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const all = (testId: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  const descriptionInput = () => q('diagnosis-description-input') as HTMLTextAreaElement;

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture.componentRef.setInput('diagnoses', DIAGNOSES);
    fixture.componentRef.setInput('editable', true);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function typeDescription(value: string): void {
    descriptionInput().value = value;
    descriptionInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function pick(code: string, description: string): void {
    fixture.componentInstance.onPicked({ code, description });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EncounterDiagnoses] }).compileComponents();
    fixture = TestBed.createComponent(EncounterDiagnoses);
    fixture.componentRef.setInput('searchCie10', () => of([]));
    el = fixture.nativeElement as HTMLElement;
    created = [];
    removed = [];
    fixture.componentInstance.create.subscribe(dto => created.push(dto));
    fixture.componentInstance.remove.subscribe(id => removed.push(id));
  });

  it('lista código (si hay), descripción y badge Definitivo/Presuntivo', async () => {
    await render();
    const items = all('diagnosis-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('[data-testid="diagnosis-code"]')?.textContent).toContain('R51');
    expect(items[0].textContent).toContain('Cefalea');
    expect(items[0].querySelector('[data-testid="diagnosis-badge"]')?.textContent).toContain('Presuntivo');
    expect(items[1].querySelector('[data-testid="diagnosis-code"]')).toBeNull();
    expect(items[1].querySelector('[data-testid="diagnosis-badge"]')?.textContent).toContain('Definitivo');
  });

  it('guarda sin cie10_code si hay description', async () => {
    await render();
    typeDescription('  Contractura cervical  ');
    (q('diagnosis-definitive') as HTMLInputElement).click();
    q('btn-add-diagnosis')!.click();

    expect(created).toEqual([{ cie10_code: null, description: 'Contractura cervical', is_definitive: true }]);
  });

  it('guarda solo con cie10_code (description vacía la completa el backend)', async () => {
    await render();
    pick('J06.9', 'IVAS');
    expect(descriptionInput().value).toBe('IVAS');
    expect(q('cie10-selected')?.textContent).toContain('J06.9 — IVAS');

    typeDescription('');
    q('btn-add-diagnosis')!.click();

    expect(created).toEqual([{ cie10_code: 'J06.9', description: null, is_definitive: false }]);
  });

  it('sin description ni código: no emite y muestra el error', async () => {
    await render();
    q('btn-add-diagnosis')!.click();
    fixture.detectChanges();

    expect(created).toEqual([]);
    expect(q('diagnosis-required-error')?.textContent).toContain(DIAGNOSIS_REQUIRED_MESSAGE);
  });

  it('maxLength: más de 1000 caracteres no emite y muestra el error del validador', async () => {
    await render();
    fixture.componentInstance.form.controls.description.setValue('x'.repeat(1001));
    fixture.componentInstance.form.controls.description.markAsTouched();
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.description.hasError('maxlength')).toBe(true);
    expect(created).toEqual([]);
    expect(el.textContent).toContain('Máximo 1000 caracteres.');
  });

  it('contador de 1000 caracteres', async () => {
    await render();
    typeDescription('abc');
    expect(q('diagnosis-counter')?.textContent?.replace(/\s/g, '')).toBe('3/1000');
  });

  describe('sugerencia de description al elegir un código', () => {
    it('no pisa lo que escribió el usuario', async () => {
      await render();
      typeDescription('Mi descripción');
      pick('R51', 'Cefalea');
      expect(descriptionInput().value).toBe('Mi descripción');
    });

    it('reemplaza la sugerencia anterior si no se editó', async () => {
      await render();
      pick('R51', 'Cefalea');
      fixture.componentInstance.clearCode();
      fixture.detectChanges();
      pick('G44.2', 'Cefalea debida a tensión');
      expect(descriptionInput().value).toBe('Cefalea debida a tensión');
    });

    it('si se editó la sugerencia, elegir otro código no la pisa', async () => {
      await render();
      pick('R51', 'Cefalea');
      typeDescription('Cefalea tensional');
      fixture.componentInstance.clearCode();
      fixture.detectChanges();
      pick('G44.2', 'Cefalea debida a tensión');
      expect(descriptionInput().value).toBe('Cefalea tensional');
    });

    it('quitar el código vacía la description solo si sigue siendo la sugerida', async () => {
      await render();
      pick('R51', 'Cefalea');
      q('btn-clear-cie10')!.click();
      fixture.detectChanges();
      expect(descriptionInput().value).toBe('');
      expect(q('cie10-selected')).toBeNull();
      expect(q('cie10-input')).not.toBeNull();

      pick('R51', 'Cefalea');
      typeDescription('Cefalea tensional');
      q('btn-clear-cie10')!.click();
      fixture.detectChanges();
      expect(descriptionInput().value).toBe('Cefalea tensional');

      q('btn-add-diagnosis')!.click();
      expect(created).toEqual([{ cie10_code: null, description: 'Cefalea tensional', is_definitive: false }]);
    });
  });

  it('eliminar pide confirmación y recién al confirmar emite', async () => {
    await render();
    all('btn-delete-diagnosis')[1].click();
    fixture.detectChanges();
    expect(removed).toEqual([]);
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Estrés laboral');

    fixture.componentInstance.confirmRemove();
    expect(removed).toEqual(['d2']);
  });

  it('guarda de reentrada propia: dos submits antes de la detección de cambios → una sola emisión', async () => {
    await render();
    typeDescription('Algo');
    q('btn-add-diagnosis')!.click();
    q('btn-add-diagnosis')!.click();
    fixture.componentInstance.submit();
    expect(created.length).toBe(1);

    // El contenedor arranca la operación (busy) y termina: se libera.
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(created.length).toBe(1);
    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(created.length).toBe(2);
  });

  it('si el contenedor no arranca nada, la guarda se libera tras el render', async () => {
    await render();
    typeDescription('Algo');
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    expect(created.length).toBe(1);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.submit();
    expect(created.length).toBe(2);
  });

  it('busy: deshabilita Agregar, Eliminar y el buscador', async () => {
    await render({ busy: true });
    expect((q('btn-add-diagnosis') as HTMLButtonElement).disabled).toBe(true);
    expect(all('btn-delete-diagnosis').every(b => (b as HTMLButtonElement).disabled)).toBe(true);
    expect((q('cie10-input') as HTMLInputElement).disabled).toBe(true);
    fixture.componentInstance.submit();
    fixture.componentInstance.askRemove(DIAGNOSES[0]);
    expect(created).toEqual([]);
    expect(fixture.componentInstance.confirmTarget()).toBeNull();
  });

  it('createdSeq: un alta exitosa limpia el formulario (y no al renderizar la primera vez)', async () => {
    await render({ createdSeq: 5 });
    pick('R51', 'Cefalea');
    (q('diagnosis-definitive') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(q('cie10-selected')).not.toBeNull();

    fixture.componentRef.setInput('createdSeq', 6);
    fixture.detectChanges();

    expect(q('cie10-selected')).toBeNull();
    expect(descriptionInput().value).toBe('');
    expect((q('diagnosis-definitive') as HTMLInputElement).checked).toBe(false);
  });

  it('error al listar: Reintentar solo si es reintentable', async () => {
    await render({ loadError: 'No tenés acceso', loadRetryable: false });
    expect(q('diagnoses-load-error')?.textContent).toContain('No tenés acceso');
    expect(q('diagnoses-retry')).toBeNull();

    fixture.componentRef.setInput('loadRetryable', true);
    fixture.detectChanges();
    expect(q('diagnoses-retry')).not.toBeNull();
  });

  it('solo lectura: listado sin formulario ni eliminar', async () => {
    await render({ editable: false });
    expect(all('diagnosis-item').length).toBe(2);
    expect(q('diagnosis-form')).toBeNull();
    expect(q('btn-delete-diagnosis')).toBeNull();

    fixture.componentInstance.submit();
    expect(created).toEqual([]);
  });
});
