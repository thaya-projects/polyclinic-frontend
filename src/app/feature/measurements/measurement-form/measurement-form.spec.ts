import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MeasurementForm, OTHER_MEASUREMENT_TYPE } from './measurement-form';
import { CreateMeasurementDto } from '../../../core/models/measurement.model';
import { MOCK_MEASUREMENT_TYPES } from '../../../testing/measurements-mock.repository';
import { MEASUREMENT_REQUIRED_MESSAGE } from '../../../shared/utils/measurements-error.util';
import { localInputToIsoWithOffset, toDatetimeLocalValue } from '../measurement-format.util';

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

describe('MeasurementForm', () => {
  let fixture: ComponentFixture<MeasurementForm>;
  let el: HTMLElement;
  let emitted: CreateMeasurementDto[];

  const q = <T extends HTMLElement = HTMLElement>(testId: string) => el.querySelector<T>(`[data-testid="${testId}"]`);
  const unit = () => q<HTMLInputElement>('measurement-unit')!;

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    fixture.componentRef.setInput('types', MOCK_MEASUREMENT_TYPES);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function selectType(value: string): void {
    const select = q<HTMLSelectElement>('measurement-type')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function type(testId: string, value: string): void {
    const input = q<HTMLInputElement | HTMLTextAreaElement>(testId)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    q('btn-add-measurement')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MeasurementForm] }).compileComponents();
    fixture = TestBed.createComponent(MeasurementForm);
    el = fixture.nativeElement as HTMLElement;
    emitted = [];
    fixture.componentInstance.submitted.subscribe(dto => emitted.push(dto));
  });

  it('el select ofrece los tipos del catálogo (en español) más "Otro…"', async () => {
    await render();
    const options = Array.from(q<HTMLSelectElement>('measurement-type')!.options).map(o => o.textContent?.trim());
    expect(options).toContain('Peso');
    expect(options).toContain('Frecuencia cardíaca');
    expect(options[options.length - 1]).toBe('Otro…');
  });

  it('no guarda sin type ni value (criterio de aceptación)', async () => {
    await render();
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-required-error')?.textContent).toContain(MEASUREMENT_REQUIRED_MESSAGE);

    selectType('weight');
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-value-error')?.textContent).toContain('Ingresá un valor');

    selectType('');
    type('measurement-value', '70');
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-type-error')).not.toBeNull();
  });

  it('tipo conocido: autocompleta la unidad canónica y la deja de solo lectura', async () => {
    await render();
    selectType('temperature');
    expect(unit().value).toBe('°C');
    expect(unit().readOnly).toBe(true);
    selectType('spo2');
    expect(unit().value).toBe('%');
  });

  it('valida el rango del catálogo en el cliente y muestra el rango permitido', async () => {
    await render();
    selectType('weight');
    expect(q('measurement-range')?.textContent).toContain('Rango permitido: 0,2 – 700 kg');

    type('measurement-value', '900');
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-value-error')?.textContent).toContain('Rango permitido: 0,2 – 700 kg');

    type('measurement-value', '72.5');
    submit();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toMatchObject({ type: 'weight', value: 72.5, unit: 'kg', note: null });
    expect(emitted[0].measured_at).toMatch(ISO_WITH_OFFSET);
    expect('encounter_id' in emitted[0]).toBe(false);
  });

  it('valor con más de 4 decimales → error (el backend no redondea)', async () => {
    await render();
    selectType('weight');
    type('measurement-value', '70.12345');
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-value-error')?.textContent).toContain('Hasta 4 decimales');
  });

  it('"Otro": pide un código libre válido y la unidad es libre y obligatoria', async () => {
    await render();
    selectType(OTHER_MEASUREMENT_TYPE);
    expect(unit().readOnly).toBe(false);
    expect(unit().value).toBe('');
    type('measurement-value', '88');

    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-custom-type-error')?.textContent).toContain('Ingresá el código');
    expect(q('measurement-unit-error')).not.toBeNull();

    type('measurement-custom-type', 'Cintura');
    type('measurement-unit', 'cm');
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-custom-type-error')?.textContent).toContain('minúsculas');

    type('measurement-custom-type', 'weight');
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-custom-type-error')?.textContent).toContain('ya está en el catálogo');

    type('measurement-custom-type', 'waist_circumference');
    submit();
    expect(emitted).toEqual([expect.objectContaining({ type: 'waist_circumference', value: 88, unit: 'cm' })]);
  });

  it('pasar de un tipo conocido a "Otro" vacía la unidad canónica', async () => {
    await render();
    selectType('weight');
    selectType(OTHER_MEASUREMENT_TYPE);
    expect(unit().value).toBe('');
  });

  it('measured_at: por defecto ahora; se envía como ISO con offset local; futura → error', async () => {
    await render();
    const input = q<HTMLInputElement>('measurement-measured-at')!;
    expect(input.value).toBe(fixture.componentInstance.form.controls.measured_at.value);
    expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    selectType('heart_rate');
    type('measurement-value', '80');
    type('measurement-measured-at', toDatetimeLocalValue(new Date(Date.now() + 60 * 60_000)));
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-measured-at-error')?.textContent).toContain('no puede ser futura');

    type('measurement-measured-at', '2026-01-15T08:30');
    submit();
    expect(emitted[0].measured_at).toBe(localInputToIsoWithOffset('2026-01-15T08:30'));
    expect(emitted[0].measured_at).toMatch(ISO_WITH_OFFSET);
    expect(new Date(emitted[0].measured_at!).getTime()).toBe(new Date(2026, 0, 15, 8, 30).getTime());
  });

  it('note: opcional, ≤ 1000', async () => {
    await render();
    selectType('glucose');
    type('measurement-value', '95');
    type('measurement-note', 'x'.repeat(1001));
    submit();
    expect(emitted).toEqual([]);
    expect(q('measurement-note-error')).not.toBeNull();

    type('measurement-note', '  En ayunas  ');
    submit();
    expect(emitted[0].note).toBe('En ayunas');
  });

  it('rango y valor con el locale del tenant', async () => {
    await render({ locale: 'en-US' });
    selectType('weight');
    expect(q('measurement-range')?.textContent).toContain('Rango permitido: 0.2 – 700 kg');
  });

  it('muestra el offset con el que se registra la fecha', async () => {
    await render();
    const expected = /^Hora local \(UTC[+−]\d{2}:\d{2}\)$/;
    expect(q('measurement-offset')?.textContent?.trim()).toMatch(expected);
  });

  it('accesibilidad: aria-required, aria-invalid y aria-describedby hacia el error / la pista de rango', async () => {
    await render();
    const value = q<HTMLInputElement>('measurement-value')!;
    expect(value.getAttribute('aria-required')).toBe('true');
    selectType('weight');
    const rangeId = q('measurement-range')!.id;
    expect(rangeId).toBeTruthy();
    expect(value.getAttribute('aria-describedby')).toBe(rangeId);
    expect(value.getAttribute('aria-invalid')).toBe('false');

    type('measurement-value', '9999');
    submit();
    const errorEl = q('measurement-value-error')!;
    expect(errorEl.getAttribute('role')).toBe('alert');
    expect(value.getAttribute('aria-invalid')).toBe('true');
    expect(value.getAttribute('aria-describedby')).toBe(errorEl.id);
  });

  it('busy deshabilita el select de tipo (desde el FormControl)', async () => {
    await render();
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.type.disabled).toBe(true);
    expect(q<HTMLSelectElement>('measurement-type')!.disabled).toBe(true);
    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    expect(q<HTMLSelectElement>('measurement-type')!.disabled).toBe(false);
  });

  it('"Limpiar" vuelve al estado inicial y borra los errores', async () => {
    await render();
    submit();
    expect(q('measurement-required-error')).not.toBeNull();
    q('btn-reset-measurement')!.click();
    fixture.detectChanges();
    expect(q('measurement-required-error')).toBeNull();
    expect(q('measurement-type-error')).toBeNull();
  });

  describe('fecha por defecto fresca (timers falsos)', () => {
    afterEach(() => vi.useRealTimers());

    // El form se crea en el beforeEach con la hora real: se recrea con el reloj ya falseado.
    function recreate(): void {
      fixture.destroy();
      fixture = TestBed.createComponent(MeasurementForm);
      el = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.submitted.subscribe(dto => emitted.push(dto));
    }

    it('mientras no la toquen, se refresca a "ahora" al enfocar el formulario y antes de enviar', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 17, 9, 0));
      recreate();
      await render();
      expect(q<HTMLInputElement>('measurement-measured-at')!.value).toBe('2026-10-17T09:00');

      vi.setSystemTime(new Date(2026, 9, 17, 11, 30));
      q('measurement-value')!.dispatchEvent(new Event('focusin', { bubbles: true }));
      fixture.detectChanges();
      expect(q<HTMLInputElement>('measurement-measured-at')!.value).toBe('2026-10-17T11:30');

      vi.setSystemTime(new Date(2026, 9, 17, 12, 45));
      selectType('weight');
      fixture.componentInstance.form.controls.value.setValue(70);
      fixture.componentInstance.submit();
      expect(new Date(emitted[0].measured_at!).getTime()).toBe(new Date(2026, 9, 17, 12, 45).getTime());
    });

    it('si el usuario eligió una fecha, no se pisa', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 17, 9, 0));
      recreate();
      await render();
      type('measurement-measured-at', '2026-10-16T20:15');
      vi.setSystemTime(new Date(2026, 9, 17, 11, 30));
      q('measurement-value')!.dispatchEvent(new Event('focusin', { bubbles: true }));
      selectType('weight');
      type('measurement-value', '70');
      submit();
      expect(new Date(emitted[0].measured_at!).getTime()).toBe(new Date(2026, 9, 16, 20, 15).getTime());
    });
  });

  describe('fechas límite', () => {
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
    let previousTz: string | undefined;
    beforeEach(() => (previousTz = env['TZ']));
    afterEach(() => {
      if (previousTz === undefined) delete env['TZ'];
      else env['TZ'] = previousTz;
    });

    it('hora inexistente por el cambio de horario (DST) → aviso y no guarda', async () => {
      env['TZ'] = 'America/New_York';
      await render();
      selectType('weight');
      type('measurement-value', '70');
      type('measurement-measured-at', '2026-03-08T02:30');
      submit();
      expect(emitted).toEqual([]);
      expect(q('measurement-measured-at-error')?.textContent).toContain('cambio de horario');
    });

    it('el offset mostrado es el de la fecha elegida (horario de verano)', async () => {
      env['TZ'] = 'America/New_York';
      await render();
      type('measurement-measured-at', '2026-01-15T08:30');
      expect(q('measurement-offset')?.textContent).toContain('UTC−05:00');
      type('measurement-measured-at', '2026-07-15T08:30');
      expect(q('measurement-offset')?.textContent).toContain('UTC−04:00');
    });

    it('límite inferior en UTC: 1900-01-01T00:00Z', async () => {
      env['TZ'] = 'Etc/GMT+5';
      await render();
      selectType('weight');
      type('measurement-value', '70');
      // 1899-12-31 23:00 en UTC−05:00 = 1900-01-01 04:00 UTC (≥ límite) → se acepta.
      type('measurement-measured-at', '1899-12-31T23:00');
      submit();
      expect(emitted.length).toBe(1);
      expect(emitted[0].measured_at).toBe('1899-12-31T23:00:00-05:00');
    });
  });

  it('con encounterId, el alta va precargada con encounter_id', async () => {
    await render({ encounterId: 'enc-1' });
    selectType('weight');
    type('measurement-value', '70');
    submit();
    expect(emitted[0].encounter_id).toBe('enc-1');
  });

  it('guarda de reentrada: doble submit → una sola intención; busy no emite', async () => {
    await render();
    selectType('weight');
    type('measurement-value', '70');
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    expect(emitted.length).toBe(1);

    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(emitted.length).toBe(1);
    expect(q<HTMLButtonElement>('btn-add-measurement')!.disabled).toBe(true);
  });

  it('alta exitosa (createdSeq cambia) → vuelve al estado inicial', async () => {
    await render();
    selectType('weight');
    type('measurement-value', '70');
    submit();
    fixture.componentRef.setInput('createdSeq', 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(q<HTMLSelectElement>('measurement-type')!.value).toBe('');
    expect(q<HTMLInputElement>('measurement-value')!.value).toBe('');
    expect(unit().value).toBe('');
  });
});
