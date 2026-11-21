import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToothConditionForm } from './tooth-condition-form';
import { DentalCondition } from '../../../../core/models/dental-condition.model';
import { Dentition } from '../../../../core/models/odontogram.model';
import {
  CreateToothConditionDto, ToothCondition, ToothSurface, UpdateToothConditionDto,
} from '../../../../core/models/tooth-condition.model';

const CATALOG: DentalCondition[] = [
  { id: 'dc-1', tenant_id: null, code: 'caries', name: 'Caries', category: 'patologia', default_color: '#E53935' },
  { id: 'dc-own-1', tenant_id: 't', code: 'sellante', name: 'Sellante', category: null, default_color: '#00ACC1' },
];

const ITEM: ToothCondition = {
  id: 'tc-1', odontogram_id: 'odo-2', tooth_fdi: 16, surface: 'oclusal', condition_id: 'dc-1', state: 'existing',
  note: 'Profunda', created_at: '2026-03-10T14:35:00Z', created_by: 'user-mock',
};

describe('ToothConditionForm', () => {
  let fixture: ComponentFixture<ToothConditionForm>;
  let form: ToothConditionForm;
  let created: CreateToothConditionDto[];
  let saved: UpdateToothConditionDto[];

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => el().querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  function render(opts: { tooth?: number; dentition?: Dentition; surface?: ToothSurface | null; item?: ToothCondition | null } = {}): void {
    fixture = TestBed.createComponent(ToothConditionForm);
    fixture.componentRef.setInput('tooth', opts.tooth ?? 16);
    fixture.componentRef.setInput('dentition', opts.dentition ?? 'permanent');
    fixture.componentRef.setInput('catalog', CATALOG);
    fixture.componentRef.setInput('presetSurface', opts.surface ?? null);
    fixture.componentRef.setInput('item', opts.item ?? null);
    form = fixture.componentInstance;
    created = [];
    saved = [];
    form.created.subscribe(dto => created.push(dto));
    form.saved.subscribe(dto => saved.push(dto));
    fixture.detectChanges();
  }

  it('alta: surface whole y state existente por defecto; sin condición no emite', () => {
    render();
    expect(form.form.getRawValue()).toEqual({ condition_id: '', surface: 'whole', state: 'existing', note: '' });
    form.submit();
    fixture.detectChanges();
    expect(created).toEqual([]);
    expect(el().textContent).toContain('Este campo es obligatorio.');
  });

  it('alta: preselecciona la cara elegida en la grilla y la actualiza al cambiar', () => {
    render({ surface: 'oclusal' });
    expect(form.form.controls.surface.value).toBe('oclusal');
    fixture.componentRef.setInput('presetSurface', 'mesial');
    fixture.detectChanges();
    expect(form.form.controls.surface.value).toBe('mesial');
  });

  it('selector: globales y propias agrupadas, cada opción con el color del default_color', () => {
    render();
    const groups = Array.from(el().querySelectorAll('[data-testid^="condition-group-"]')).map(g => g.getAttribute('data-testid'));
    expect(groups).toEqual(['condition-group-Globales', 'condition-group-Propias']);
    const option = q('condition-option-dc-own-1')!;
    expect((option.querySelector('[data-testid="condition-swatch"]') as HTMLElement).style.backgroundColor).toBe('rgb(0, 172, 193)');
    expect(option.textContent).not.toContain('#');

    option.click();
    fixture.detectChanges();
    expect(form.form.controls.condition_id.value).toBe('dc-own-1');
    expect(option.getAttribute('aria-checked')).toBe('true');
  });

  it('alta: emite tooth_fdi de la pieza, sin tenant_id ni created_by; nota recortada', () => {
    render({ tooth: 36 });
    form.form.setValue({ condition_id: 'dc-1', surface: 'distal', state: 'planned', note: '  Revisar  ' });
    form.submit();
    expect(created).toEqual([{ tooth_fdi: 36, condition_id: 'dc-1', surface: 'distal', state: 'planned', note: 'Revisar' }]);
  });

  it('alta: pieza fuera de la dentición → aviso y no emite', () => {
    render({ tooth: 51, dentition: 'permanent' });
    expect(q('fdi-error')?.textContent).toContain('La pieza 51 no corresponde a la dentición permanente.');
    expect((q('tooth-condition-submit') as HTMLButtonElement).disabled).toBe(true);
    form.form.patchValue({ condition_id: 'dc-1' });
    form.submit();
    expect(created).toEqual([]);
  });

  it('alta: en mixta acepta permanentes y temporales', () => {
    render({ tooth: 51, dentition: 'mixed' });
    expect(q('fdi-error')).toBeNull();
    form.form.patchValue({ condition_id: 'dc-1' });
    form.submit();
    expect(created).toHaveLength(1);
  });

  it('edición: carga el item y solo viaja lo que cambió (nota vacía = null)', () => {
    render({ item: ITEM });
    expect(form.form.getRawValue()).toEqual({ condition_id: 'dc-1', surface: 'oclusal', state: 'existing', note: 'Profunda' });
    form.form.patchValue({ state: 'done', note: '' });
    form.submit();
    expect(saved).toEqual([{ state: 'done', note: null }]);
  });

  it('clear(): tras un alta vuelve a la cara preseleccionada y limpia la condición', () => {
    render({ surface: 'vestibular' });
    form.form.setValue({ condition_id: 'dc-1', surface: 'distal', state: 'done', note: 'x' });
    form.clear();
    expect(form.form.getRawValue()).toEqual({ condition_id: '', surface: 'vestibular', state: 'existing', note: '' });
  });
});
