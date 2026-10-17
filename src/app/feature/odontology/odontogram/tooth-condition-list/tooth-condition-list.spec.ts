import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToothConditionList } from './tooth-condition-list';
import { DentalCondition } from '../../../../core/models/dental-condition.model';
import { ToothCondition } from '../../../../core/models/tooth-condition.model';

const CATALOG: DentalCondition[] = [
  { id: 'dc-1', tenant_id: null, code: 'caries', name: 'Caries', category: 'patologia', default_color: '#E53935' },
];

const item = (id: string, conditionId: string, note: string | null = null): ToothCondition => ({
  id, odontogram_id: 'odo-2', tooth_fdi: 16, surface: 'oclusal', condition_id: conditionId, state: 'realizado', note,
  created_at: '2026-03-10T14:35:00Z', created_by: 'user-mock',
});

describe('ToothConditionList', () => {
  let fixture: ComponentFixture<ToothConditionList>;

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string, scope: ParentNode = el()) => scope.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  function render(items: ToothCondition[]): void {
    fixture = TestBed.createComponent(ToothConditionList);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('catalog', CATALOG);
    fixture.detectChanges();
  }

  it('sin condiciones: estado vacío', () => {
    render([]);
    expect(q('tooth-condition-empty')).not.toBeNull();
  });

  it('muestra nombre y color del catálogo, cara, estado y nota', () => {
    render([item('tc-1', 'dc-1', 'Profunda'), item('tc-2', 'dc-borrada')]);
    const first = q('tooth-condition-tc-1')!;
    expect(first.textContent).toContain('Caries');
    expect(first.textContent).toContain('Oclusal');
    expect(first.textContent).toContain('Realizado');
    expect(first.textContent).toContain('Profunda');
    expect(first.querySelector<HTMLElement>('span[title]')!.title).toBe('#E53935');
    expect(q('tooth-condition-tc-2')!.textContent).toContain('Condición no disponible');
  });

  it('editar emite el item; eliminar pide confirmación antes de emitir', () => {
    const it0 = item('tc-1', 'dc-1');
    render([it0]);
    const edits: ToothCondition[] = [];
    const removes: ToothCondition[] = [];
    fixture.componentInstance.edit.subscribe(i => edits.push(i));
    fixture.componentInstance.remove.subscribe(i => removes.push(i));

    q('edit')!.click();
    expect(edits).toEqual([it0]);

    q('remove')!.click();
    fixture.detectChanges();
    expect(removes).toEqual([]);
    q('remove-cancel')!.click();
    fixture.detectChanges();
    expect(q('remove-confirm')).toBeNull();

    q('remove')!.click();
    fixture.detectChanges();
    q('remove-confirm')!.click();
    expect(removes).toEqual([it0]);
  });
});
