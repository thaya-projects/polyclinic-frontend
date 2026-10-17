import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PrescriptionItemForm } from './prescription-item-form';
import { CreatePrescriptionItemDto } from '../../../core/models/prescription.model';
import { PRESCRIPTION_MEDICATION_REQUIRED_MESSAGE } from '../../../shared/utils/prescriptions-error.util';

describe('PrescriptionItemForm', () => {
  let fixture: ComponentFixture<PrescriptionItemForm>;
  let el: HTMLElement;
  let emitted: CreatePrescriptionItemDto[];

  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el.querySelector<T>(`[data-testid="${testId}"]`);

  function type(testId: string, value: string): void {
    const input = q<HTMLInputElement | HTMLTextAreaElement>(testId)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    q('btn-save-item')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PrescriptionItemForm] }).compileComponents();
    fixture = TestBed.createComponent(PrescriptionItemForm);
    el = fixture.nativeElement as HTMLElement;
    emitted = [];
    fixture.componentInstance.submitted.subscribe(dto => emitted.push(dto));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('no guarda sin medication (criterio de aceptación), tampoco con solo espacios', () => {
    submit();
    expect(emitted).toEqual([]);
    const error = q('item-medication-error')!;
    expect(error.textContent).toContain(PRESCRIPTION_MEDICATION_REQUIRED_MESSAGE);
    expect(error.getAttribute('role')).toBe('alert');

    type('item-medication', '   ');
    submit();
    expect(emitted).toEqual([]);
  });

  it('accesibilidad: label, aria-required, aria-invalid y aria-describedby al error', () => {
    const input = q<HTMLInputElement>('item-medication')!;
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(el.querySelector(`label[for="${input.id}"]`)?.textContent).toContain('Medicamento');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('aria-describedby')).toBeNull();
    submit();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(q('item-medication-error')!.id);
    expect(q('prescription-item-form')!.getAttribute('aria-label')).toBe('Agregar medicamento');
  });

  it('emite el DTO recortado; los opcionales vacíos no viajan', () => {
    type('item-medication', '  Amoxicilina ');
    type('item-dose', '1 cápsula');
    type('item-frequency', '   ');
    type('item-instructions', 'Con agua');
    submit();
    expect(emitted).toEqual([{ medication: 'Amoxicilina', dose: '1 cápsula', instructions: 'Con agua' }]);
  });

  it('límites: medication ≤ 200 e instructions ≤ 1000 (no emite)', () => {
    type('item-medication', 'x'.repeat(201));
    submit();
    expect(emitted).toEqual([]);
    expect(q('item-medication-error')?.textContent).toContain('Máximo 200 caracteres.');
    type('item-medication', 'A');
    type('item-instructions', 'x'.repeat(1001));
    submit();
    expect(emitted).toEqual([]);
    expect(q('item-instructions-error')?.textContent).toContain('Máximo 1000 caracteres.');
  });

  it('rechaza el carácter nulo antes de enviar', () => {
    type('item-medication', 'A\0B');
    submit();
    expect(emitted).toEqual([]);
    expect(q('item-medication-error')?.textContent).toContain('carácter inválido');
  });

  it('guarda de reentrada: doble submit → una sola emisión; con busy no emite', () => {
    type('item-medication', 'Amoxicilina');
    q('btn-save-item')!.click();
    q('btn-save-item')!.click();
    expect(emitted.length).toBe(1);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(emitted.length).toBe(1);
  });

  it('con cada alta exitosa (createdSeq) se limpia para cargar otro medicamento', () => {
    type('item-medication', 'Amoxicilina');
    submit();
    fixture.componentRef.setInput('createdSeq', 1);
    fixture.detectChanges();
    expect(q<HTMLInputElement>('item-medication')!.value).toBe('');
    expect(q('item-medication-error')).toBeNull();
  });
});
