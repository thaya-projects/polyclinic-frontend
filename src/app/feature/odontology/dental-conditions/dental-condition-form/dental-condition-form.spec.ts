import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DentalConditionForm } from './dental-condition-form';
import { CreateDentalConditionDto, DentalCondition, UpdateDentalConditionDto } from '../../../../core/models/dental-condition.model';

const OWN: DentalCondition = {
  id: 'dc-own-1', tenant_id: 'tenant-mock', code: 'sellante', name: 'Sellante', category: 'tratamiento',
  default_color: '#00ACC1',
};

describe('DentalConditionForm', () => {
  let fixture: ComponentFixture<DentalConditionForm>;
  let form: DentalConditionForm;
  let created: CreateDentalConditionDto[];
  let saved: UpdateDentalConditionDto[];

  function render(condition: DentalCondition | null = null): void {
    fixture = TestBed.createComponent(DentalConditionForm);
    fixture.componentRef.setInput('condition', condition);
    form = fixture.componentInstance;
    created = [];
    saved = [];
    form.created.subscribe(dto => created.push(dto));
    form.saved.subscribe(dto => saved.push(dto));
    fixture.detectChanges();
  }

  it('alta: no emite sin code ni name y marca los campos', () => {
    render();
    form.submit();
    fixture.detectChanges();
    expect(created).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Este campo es obligatorio.');
  });

  it('alta: no emite con name en blanco', () => {
    render();
    form.form.setValue({ code: 'fractura', name: '   ', category: '', default_color: '' });
    form.submit();
    expect(created).toEqual([]);
  });

  it('alta: code con formato inválido o color inválido no emite', () => {
    render();
    form.form.setValue({ code: 'Con-Guion', name: 'X', category: '', default_color: '' });
    form.submit();
    form.form.setValue({ code: 'ok', name: 'X', category: '', default_color: 'rojo' });
    form.submit();
    expect(created).toEqual([]);
  });

  it('alta: emite sin tenant_id ni campos vacíos; color en mayúsculas', () => {
    render();
    form.form.setValue({ code: ' fractura ', name: ' Fractura ', category: '', default_color: '#ab12cd' });
    form.submit();
    expect(created).toEqual([{ code: 'fractura', name: 'Fractura', default_color: '#AB12CD' }]);
  });

  it('edición: code deshabilitado y solo viaja lo que cambió (vacío = null)', () => {
    render(OWN);
    expect(form.form.controls.code.disabled).toBe(true);
    form.form.patchValue({ name: 'Sellante de fosas', default_color: '' });
    form.submit();
    expect(saved).toEqual([{ name: 'Sellante de fosas', default_color: null }]);
  });

  it('edición: no permite guardar sin name', () => {
    render(OWN);
    form.form.patchValue({ name: '' });
    form.submit();
    expect(saved).toEqual([]);
  });
});
