import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PrescriptionForm } from './prescription-form';
import { CreatePrescriptionDto } from '../../../core/models/prescription.model';

describe('PrescriptionForm (Nueva receta)', () => {
  let fixture: ComponentFixture<PrescriptionForm>;
  let el: HTMLElement;
  let emitted: CreatePrescriptionDto[];

  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el.querySelector<T>(`[data-testid="${testId}"]`);
  const all = <T extends HTMLElement = HTMLElement>(testId: string) => Array.from(el.querySelectorAll<T>(`[data-testid="${testId}"]`));

  function typeIn(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    q('btn-submit-prescription')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PrescriptionForm] }).compileComponents();
    fixture = TestBed.createComponent(PrescriptionForm);
    el = fixture.nativeElement as HTMLElement;
    emitted = [];
    fixture.componentInstance.submitted.subscribe(dto => emitted.push(dto));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('arranca con una fila; no emite si una fila no tiene medication', () => {
    expect(all('prescription-row').length).toBe(1);
    submit();
    expect(emitted).toEqual([]);
    expect(q('prescription-rows-error')?.getAttribute('role')).toBe('alert');
    expect(q('item-medication-error')).not.toBeNull();
  });

  it('varios ítems iniciales: agregar filas y emitir todas, con las notas', () => {
    typeIn(q<HTMLTextAreaElement>('prescription-notes')!, '  Control en 7 días ');
    typeIn(all<HTMLInputElement>('item-medication')[0], 'Ibuprofeno');
    q('btn-add-row')!.click();
    fixture.detectChanges();
    q('btn-add-row')!.click();
    fixture.detectChanges();
    expect(all('prescription-row').length).toBe(3);
    typeIn(all<HTMLInputElement>('item-medication')[1], 'Paracetamol');
    typeIn(all<HTMLInputElement>('item-frequency')[1], 'Cada 6 h');
    typeIn(all<HTMLInputElement>('item-medication')[2], 'Omeprazol');
    submit();
    expect(emitted).toEqual([{
      notes: 'Control en 7 días',
      items: [{ medication: 'Ibuprofeno' }, { medication: 'Paracetamol', frequency: 'Cada 6 h' }, { medication: 'Omeprazol' }],
    }]);
    // Nunca datos que resuelve el backend.
    for (const key of ['tenant_id', 'professional_id', 'issued_at', 'patient_id']) expect(Object.keys(emitted[0])).not.toContain(key);
  });

  it('quitar todas las filas permite emitir una receta solo con notas (sin "items")', () => {
    q('btn-remove-row')!.click();
    fixture.detectChanges();
    expect(all('prescription-row').length).toBe(0);
    expect(q('prescription-no-rows')).not.toBeNull();
    submit();
    expect(emitted).toEqual([{ notes: null }]);
  });

  it('ids únicos y labels por fila; el botón Quitar dice qué fila quita', () => {
    q('btn-add-row')!.click();
    fixture.detectChanges();
    const inputs = all<HTMLInputElement>('item-medication');
    expect(inputs[0].id).not.toBe(inputs[1].id);
    for (const input of inputs) expect(el.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    expect(all('btn-remove-row').map(b => b.getAttribute('aria-label'))).toEqual(['Quitar medicamento 1', 'Quitar medicamento 2']);
    expect(Array.from(el.querySelectorAll('legend')).map(l => l.textContent?.trim())).toEqual(['Medicamento 1', 'Medicamento 2']);
  });

  it('máximo 50 filas', () => {
    for (let i = 0; i < 60; i++) fixture.componentInstance.addRow();
    fixture.detectChanges();
    expect(all('prescription-row').length).toBe(50);
    expect(q<HTMLButtonElement>('btn-add-row')!.disabled).toBe(true);
    expect(q('prescription-max-rows')).not.toBeNull();
  });

  it('notas > 2000: error accesible y no emite', () => {
    typeIn(all<HTMLInputElement>('item-medication')[0], 'A');
    const notes = q<HTMLTextAreaElement>('prescription-notes')!;
    typeIn(notes, 'x'.repeat(2001));
    submit();
    expect(emitted).toEqual([]);
    expect(notes.getAttribute('aria-invalid')).toBe('true');
    expect(notes.getAttribute('aria-describedby')).toBe(q('prescription-notes-error')!.id);
  });

  it('guarda de reentrada y reset con createdSeq', () => {
    typeIn(all<HTMLInputElement>('item-medication')[0], 'A');
    q('btn-submit-prescription')!.click();
    q('btn-submit-prescription')!.click();
    expect(emitted.length).toBe(1);
    q('btn-add-row')!.click();
    fixture.componentRef.setInput('createdSeq', 1);
    fixture.detectChanges();
    expect(all('prescription-row').length).toBe(1);
    expect(all<HTMLInputElement>('item-medication')[0].value).toBe('');
  });
});
