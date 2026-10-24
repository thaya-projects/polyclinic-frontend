import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Cie10Search } from './cie10-search';
import { MockCie10Catalog } from '../../../testing/cie10-mock.catalog';
import { Cie10Entry } from '../../../core/models/diagnosis.model';

describe('Cie10Search', () => {
  let fixture: ComponentFixture<Cie10Search>;
  let el: HTMLElement;
  let catalog: MockCie10Catalog;
  let search: ReturnType<typeof vi.fn>;
  let picked: Cie10Entry[];

  const q = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const input = () => q('cie10-input') as HTMLInputElement;
  const options = () => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="cie10-option"]'));

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function key(name: string): void {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: name, cancelable: true }));
    fixture.detectChanges();
  }

  function tick(ms = 300): void {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [Cie10Search] }).compileComponents();
    catalog = new MockCie10Catalog();
    search = vi.fn((term: string) => catalog.search(term));
    fixture = TestBed.createComponent(Cie10Search);
    fixture.componentRef.setInput('search', search);
    picked = [];
    fixture.componentInstance.picked.subscribe(e => picked.push(e));
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('debounce: una sola búsqueda con el último término', () => {
    type('mi');
    type('mig');
    type('migr');
    tick(299);
    expect(search).not.toHaveBeenCalled();
    tick(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('migr');
    expect(options().map(o => o.textContent?.trim())).toEqual(['G43.9 — Migraña, no especificada']);
  });

  it('mínimo 2 caracteres: con 1 no busca y muestra la ayuda', () => {
    type('m');
    tick();
    expect(search).not.toHaveBeenCalled();
    expect(q('cie10-hint')?.textContent).toContain('al menos 2');
  });

  it('switchMap: la respuesta vieja no pisa la nueva', () => {
    const responses: Record<string, Subject<Cie10Entry[]>> = { ce: new Subject(), cef: new Subject() };
    search.mockImplementation((term: string): Observable<Cie10Entry[]> => responses[term]);

    type('ce');
    tick();
    type('cef');
    tick();
    responses['cef'].next([{ code: 'R51', description: 'Cefalea' }]);
    responses['ce'].next([{ code: 'XXX', description: 'Vieja' }]);
    fixture.detectChanges();

    expect(options().map(o => o.textContent?.trim())).toEqual(['R51 — Cefalea']);
  });

  it('teclado: ↓/↑ recorren y Enter elige', () => {
    type('j0');
    tick();
    expect(options().length).toBe(4);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');

    key('ArrowDown');
    key('ArrowDown');
    key('ArrowUp');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    key('Enter');

    expect(picked).toEqual([{ code: 'J02.9', description: 'Faringitis aguda, no especificada' }]);
    expect(input().value).toBe('');
    expect(options().length).toBe(0);
  });

  it('Enter durante el debounce no elige un resultado viejo', () => {
    type('j0');
    tick();
    expect(options().length).toBe(4);

    type('j06');
    key('Enter');
    expect(picked).toEqual([]);

    tick();
    key('Enter');
    expect(picked).toEqual([{ code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores, no especificada' }]);
  });

  it('selección con mousedown (antes del blur)', () => {
    type('cefalea');
    tick();
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[1].dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(picked.map(e => e.code)).toEqual(['R51']);
  });

  it('mousedown en el popup (ej. barra de scroll) no saca el foco; blur cierra y focus reabre', () => {
    type('j0');
    tick();
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    q('cie10-popup')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(options().length).toBe(0);
    expect(input().getAttribute('aria-controls')).toBeNull();

    input().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(options().length).toBe(4);
  });

  it('ARIA: aria-controls solo con la lista visible, listbox con label y estado en aria-live', () => {
    expect(input().getAttribute('aria-controls')).toBeNull();
    type('j0');
    tick();
    const listbox = el.querySelector('[role="listbox"]')!;
    expect(input().getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.getAttribute('aria-label')).toBe('Resultados CIE-10');
    expect(q('cie10-status')?.getAttribute('aria-live')).toBe('polite');
    expect(q('cie10-status')?.textContent).toContain('4 resultados');

    type('zzzz');
    expect(q('cie10-status')?.textContent).toContain('Buscando');
    tick();
    expect(q('cie10-status')?.textContent).toContain('Sin resultados');
  });

  it('maxlength 100 en el input', () => {
    expect(input().getAttribute('maxlength')).toBe('100');
  });

  it('422 del backend: muestra el mensaje traducido', () => {
    search.mockImplementation(() => new Observable<never>(s => s.error(new HttpErrorResponse({
      status: 422, error: { detail: "q must have at least 2 characters. (Parameter 'q')" },
    }))));
    type('ce');
    tick();
    expect(q('cie10-error')?.textContent).toContain('Escribí al menos 2 caracteres para buscar.');
  });

  it('Escape cierra la lista; error de búsqueda muestra aviso', () => {
    type('j0');
    tick();
    key('Escape');
    expect(options().length).toBe(0);

    search.mockImplementation(() => new Observable<never>(s => s.error(new Error('boom'))));
    type('ce');
    tick();
    expect(q('cie10-error')).not.toBeNull();
  });
});
