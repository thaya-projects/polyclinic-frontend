import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdontogramChart } from './odontogram-chart';
import { Dentition } from '../../../../core/models/odontogram.model';

describe('OdontogramChart', () => {
  let fixture: ComponentFixture<OdontogramChart>;

  const el = () => fixture.nativeElement as HTMLElement;
  const teeth = (scope: ParentNode = el()) =>
    Array.from(scope.querySelectorAll<HTMLButtonElement>('[data-testid^="tooth-"]'))
      .map(b => Number(b.dataset['testid']!.slice('tooth-'.length)));

  function render(dentition: Dentition, selected: number | null = null): void {
    fixture = TestBed.createComponent(OdontogramChart);
    fixture.componentRef.setInput('dentition', dentition);
    fixture.componentRef.setInput('selectedTooth', selected);
    fixture.detectChanges();
  }

  it('permanente: 18-11 | 21-28 arriba y 48-41 | 31-38 abajo (32 piezas en orden FDI)', () => {
    render('permanente');
    expect(teeth()).toEqual([
      18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
      48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
    ]);
  });

  it('temporal: 55-51 | 61-65 arriba y 85-81 | 71-75 abajo', () => {
    render('temporal');
    expect(teeth()).toEqual([55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75]);
  });

  it('mixta: muestra ambas grillas', () => {
    render('mixta');
    expect(teeth(el().querySelector('[data-testid="chart-permanente"]')!)).toHaveLength(32);
    expect(teeth(el().querySelector('[data-testid="chart-temporal"]')!)).toHaveLength(20);
  });

  it('click en una pieza emite su número; la seleccionada queda marcada', () => {
    render('permanente', 36);
    const emitted: number[] = [];
    fixture.componentInstance.toothSelected.subscribe(n => emitted.push(n));
    el().querySelector<HTMLButtonElement>('[data-testid="tooth-11"]')!.click();
    expect(emitted).toEqual([11]);
    expect(el().querySelector('[data-testid="tooth-36"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(el().querySelector('[data-testid="tooth-11"]')!.getAttribute('aria-pressed')).toBe('false');
  });
});
