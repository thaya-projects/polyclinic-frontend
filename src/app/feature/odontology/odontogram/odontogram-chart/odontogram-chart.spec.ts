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

  it('pinta caras con el color de su condición: whole de fondo, caras encima y cervical como contorno', () => {
    render('permanente');
    fixture.componentRef.setInput('paint', {
      16: { faces: { center: '#E53935' } },
      36: { whole: '#FBC02D', cervical: '#00ACC1', faces: { top: '#1E88E5' } },
    });
    fixture.detectChanges();
    const fill = (id: string) => el().querySelector(`[data-testid="${id}"]`)!.getAttribute('fill');
    expect(fill('face-16-center')).toBe('#E53935');
    expect(fill('face-16-top')).toBe('none');
    expect(fill('face-36-top')).toBe('#1E88E5');
    expect(fill('face-36-left')).toBe('#FBC02D');
    expect(el().querySelector('[data-testid="cervical-36"]')!.getAttribute('stroke')).toBe('#00ACC1');
    expect(el().querySelector('[data-testid="cervical-16"]')).toBeNull();
  });

  it('click en una cara emite pieza + surface clínica (no la pieza sola) y la resalta', () => {
    render('permanente');
    const faces: unknown[] = [];
    const teethEmitted: number[] = [];
    fixture.componentInstance.faceSelected.subscribe(f => faces.push(f));
    fixture.componentInstance.toothSelected.subscribe(n => teethEmitted.push(n));
    el().querySelector('[data-testid="face-16-right"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el().querySelector('[data-testid="face-31-center"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(faces).toEqual([{ fdi: 16, surface: 'mesial' }, { fdi: 31, surface: 'incisal' }]);
    expect(teethEmitted).toEqual([]);

    fixture.componentRef.setInput('selectedTooth', 16);
    fixture.componentRef.setInput('selectedSurface', 'mesial');
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="face-16-right"]')!.getAttribute('stroke-width')).toBe('3');
    expect(el().querySelector('[data-testid="face-16-left"]')!.getAttribute('stroke-width')).toBe('1.5');
  });
});
