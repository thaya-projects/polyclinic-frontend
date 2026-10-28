import {
  ChangeDetectionStrategy, Component, DestroyRef, Injector, afterNextRender, computed, effect, inject, input, output, signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  CUSTOM_MEASUREMENT_TYPE_PATTERN, CreateMeasurementDto, MEASUREMENT_LIMITS, MeasurementType, formatMeasurementRange,
  measurementTypeLabel,
} from '../../../core/models/measurement.model';
import { INPUT_BASE_CLASS } from '../../../shared/utils/form-validation.util';
import { MEASUREMENT_REQUIRED_MESSAGE, MEASUREMENT_TYPE_FORMAT_MESSAGE } from '../../../shared/utils/measurements-error.util';
import {
  MAX_CLOCK_SKEW_MS, MIN_MEASURED_AT_MS, decimalPlaces, offsetLabel, parseLocalInputDetailed, toDatetimeLocalValue,
  toIsoWithOffset,
} from '../measurement-format.util';

// Valor del select para un tipo libre (no catalogado).
export const OTHER_MEASUREMENT_TYPE = '__other__';

let nextFormId = 0;

function measuredAtValidator(control: AbstractControl): ValidationErrors | null {
  const raw = control.value as string | null;
  if (!raw) return { required: true };
  const parsed = parseLocalInputDetailed(raw);
  if (!parsed.ok) return parsed.reason === 'nonexistent' ? { nonexistent: true } : { invalidDate: true };
  const time = parsed.date.getTime();
  if (time < MIN_MEASURED_AT_MS) return { tooOld: true };
  if (time > Date.now() + MAX_CLOCK_SKEW_MS) return { future: true };
  return null;
}

// Fase 4 T3: alta de una medición — componente PRESENTACIONAL (no sabe de dónde vienen los datos ni
// a dónde van). Recibe el catálogo de tipos (con sus rangos, que vienen del backend) y emite el DTO.
//   type: select con el catálogo + "Otro" (pide un código libre ^[a-z][a-z0-9_]{1,49}$ que no sea
//         uno del catálogo). Se deshabilita (desde el FormControl) mientras hay una operación.
//   value: numérico y obligatorio, ≤ 4 decimales; para tipos conocidos se valida el rango del
//          catálogo y se muestra (números con el locale del tenant).
//   unit: obligatoria. Tipo conocido → la canónica, de solo lectura; "Otro" → libre (≤ 20).
//   measured_at: datetime-local en la hora local del navegador (se muestra su offset) → ISO con ese
//                offset. Por defecto "ahora", y se refresca a "ahora" mientras el usuario no la
//                toque: al enfocar el formulario y justo antes de enviar (si el form quedó abierto un
//                rato, no se registra la hora en que se cargó la página). No futura (> 5 min), no
//                anterior a 1900-01-01 UTC, y no una hora inexistente por el cambio de horario.
//   note: opcional, ≤ 1000.
// `encounterId`: si viene (sección del detalle), el alta va precargada con ese encounter_id.
// Guarda de reentrada propia: tras emitir no vuelve a emitir hasta que el contenedor termine (busy
// pasa a false). Con cada alta exitosa (`createdSeq`) o con "Limpiar" vuelve al estado inicial.
@Component({
  selector: 'app-measurement-form',
  imports: [ReactiveFormsModule],
  templateUrl: './measurement-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeasurementForm {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  types = input<MeasurementType[]>([]);
  encounterId = input<string | null>(null);
  busy = input(false);
  saving = input(false);
  createdSeq = input(0);
  locale = input('es');
  // Botones propios (sección compacta); en el modal los pone el pie del modal.
  showSubmit = input(true);
  compact = input(false);

  submitted = output<CreateMeasurementDto>();

  readonly id = `measurement-form-${++nextFormId}`;
  readonly other = OTHER_MEASUREMENT_TYPE;
  readonly noteLimit = MEASUREMENT_LIMITS.note;
  readonly unitLimit = MEASUREMENT_LIMITS.unit;
  readonly requiredMessage = MEASUREMENT_REQUIRED_MESSAGE;
  readonly label = measurementTypeLabel;
  readonly maxLocal = signal(toDatetimeLocalValue(new Date(Date.now() + MAX_CLOCK_SKEW_MS)));

  form = this.fb.group({
    type: ['', Validators.required],
    custom_type: [''],
    value: this.fb.control<number | null>(null, [Validators.required, control => this.valueError(control)]),
    unit: ['', [Validators.required, Validators.maxLength(MEASUREMENT_LIMITS.unit)]],
    measured_at: [toDatetimeLocalValue(), measuredAtValidator],
    note: ['', Validators.maxLength(MEASUREMENT_LIMITS.note)],
  });

  readonly selectedType = signal('');
  readonly noteLength = signal(0);
  readonly submittedOnce = signal(false);
  // Offset con el que se va a registrar la fecha elegida (respeta el horario de verano de ESA fecha).
  readonly offsetHint = signal(this.computeOffsetHint(this.form.controls.measured_at.value));
  // Para re-evaluar los mensajes de error en OnPush cuando cambia el estado del form.
  private readonly formTick = signal(0);

  // Definición del catálogo del tipo elegido (null = "Otro" o nada).
  readonly definition = computed<MeasurementType | null>(() =>
    this.types().find(t => t.type === this.selectedType()) ?? null);
  readonly isOther = computed(() => this.selectedType() === OTHER_MEASUREMENT_TYPE);
  readonly unitReadonly = computed(() => this.definition() !== null);
  readonly rangeText = computed(() => {
    const d = this.definition();
    return d ? `Rango permitido: ${formatMeasurementRange(d.min, d.max, d.unit, this.locale())}` : null;
  });

  private emitLocked = false;

  constructor() {
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onTypeChange(type ?? ''));
    this.form.controls.note.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.noteLength.set((value ?? '').length));
    this.form.controls.measured_at.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.offsetHint.set(this.computeOffsetHint(value)));
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.formTick.update(n => n + 1));

    // Si el catálogo llega después de elegir un tipo, se aplica su unidad y rango.
    effect(() => {
      this.types();
      untracked(() => this.onTypeChange(this.form.controls.type.value ?? ''));
    });

    // busy: libera la guarda al terminar y deshabilita el select de tipo mientras dura.
    effect(() => {
      const busy = this.busy();
      if (!busy) this.emitLocked = false;
      const type = this.form.controls.type;
      if (busy) type.disable({ emitEvent: false });
      else type.enable({ emitEvent: false });
    });

    let lastSeq: number | null = null;
    effect(() => {
      const seq = this.createdSeq();
      if (lastSeq !== null && seq !== lastSeq) untracked(() => this.reset());
      lastSeq = seq;
    });
  }

  // ids para aria-describedby / label for.
  fieldId(name: string): string {
    return `${this.id}-${name}`;
  }

  inputClass(control: AbstractControl, extra = ''): string {
    return `${INPUT_BASE_CLASS} w-full ${extra} ${this.showError(control)
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/18'
      : 'border-border focus:border-brand focus:ring-brand/18'}`;
  }

  showError(control: AbstractControl): boolean {
    this.formTick();
    return control.invalid && (control.touched || control.dirty || this.submittedOnce());
  }

  // aria-describedby: el error si lo hay, si no la pista (rango / zona horaria), si hay.
  describedBy(control: AbstractControl, name: string, hint: string | null = null): string | null {
    return this.showError(control) ? this.fieldId(`${name}-error`) : hint;
  }

  // Error 400/422 del backend (MeasurementsStore.fieldError, texto ya traducido): lo marca en el
  // input del campo. `type` de un tipo libre va al código. false = no es un campo de este form (el
  // contenedor deja el banner).
  applyServerError(field: string, message: string): boolean {
    const name = field === 'type' && this.isOther() ? 'custom_type' : field;
    const control = this.form.get(name);
    if (!control) return false;
    const apply = () => {
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
      this.formTick.update(n => n + 1);
    };
    apply();
    // El select de tipo está deshabilitado mientras dura la operación: al rehabilitarse (busy → false)
    // Angular recalcula sus errores y perdería el del backend, así que se vuelve a aplicar.
    if (control.disabled) afterNextRender(() => { if (control.enabled) apply(); }, { injector: this.injector });
    return true;
  }

  private serverError(control: AbstractControl): string | null {
    const server = control.errors?.['server'];
    return typeof server === 'string' ? server : null;
  }

  typeErrorText(): string {
    return this.serverError(this.form.controls.type) ?? 'Elegí un tipo.';
  }

  unitErrorText(): string {
    const control = this.form.controls.unit;
    return this.serverError(control)
      ?? (control.hasError('maxlength') ? `Máximo ${this.unitLimit} caracteres.` : 'Indicá la unidad.');
  }

  noteErrorText(): string {
    return this.serverError(this.form.controls.note) ?? `La nota no puede superar los ${this.noteLimit} caracteres.`;
  }

  valueErrorText(): string {
    const errors = this.form.controls.value.errors;
    if (!errors) return '';
    if (typeof errors['server'] === 'string') return errors['server'];
    if (errors['required']) return 'Ingresá un valor numérico.';
    if (errors['range']) return this.rangeText() ?? 'Valor fuera de rango.';
    if (errors['decimals']) return `Hasta ${MEASUREMENT_LIMITS.decimals} decimales.`;
    if (errors['tooLarge']) return 'El valor es demasiado grande.';
    return 'Valor inválido.';
  }

  customTypeErrorText(): string {
    const errors = this.form.controls.custom_type.errors;
    if (!errors) return '';
    if (typeof errors['server'] === 'string') return errors['server'];
    if (errors['required']) return 'Ingresá el código del tipo.';
    if (errors['known']) return 'Ese tipo ya está en el catálogo: elegilo de la lista.';
    return MEASUREMENT_TYPE_FORMAT_MESSAGE;
  }

  measuredAtErrorText(): string {
    const errors = this.form.controls.measured_at.errors;
    if (!errors) return '';
    if (typeof errors['server'] === 'string') return errors['server'];
    if (errors['required']) return 'Indicá la fecha y hora de la medición.';
    if (errors['nonexistent']) return 'Esa hora no existe en tu zona horaria por el cambio de horario. Elegí otra.';
    if (errors['future']) return 'La fecha de medición no puede ser futura.';
    if (errors['tooOld']) return 'La fecha de medición no puede ser anterior a 1900.';
    return 'Fecha inválida.';
  }

  showRequiredError(): boolean {
    this.formTick();
    return this.submittedOnce() && (this.form.controls.type.hasError('required') || this.form.controls.value.hasError('required'));
  }

  // measured_at sigue "ahora" mientras el usuario no la haya tocado.
  refreshDefaultDate(): void {
    const control = this.form.controls.measured_at;
    if (control.dirty) return;
    control.setValue(toDatetimeLocalValue());
    this.maxLocal.set(toDatetimeLocalValue(new Date(Date.now() + MAX_CLOCK_SKEW_MS)));
  }

  submit(): void {
    if (this.busy() || this.emitLocked) return;
    this.refreshDefaultDate();
    this.submittedOnce.set(true);
    this.form.controls.measured_at.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formTick.update(n => n + 1);
      return;
    }
    const raw = this.form.getRawValue();
    const type = this.isOther() ? (raw.custom_type ?? '').trim() : raw.type ?? '';
    const value = raw.value;
    const parsed = raw.measured_at ? parseLocalInputDetailed(raw.measured_at) : null;
    if (!type || typeof value !== 'number' || !parsed?.ok) return;
    const note = (raw.note ?? '').trim();
    const encounterId = this.encounterId();
    const dto: CreateMeasurementDto = {
      type,
      value,
      unit: (raw.unit ?? '').trim(),
      measured_at: toIsoWithOffset(parsed.date),
      note: note || null,
      ...(encounterId ? { encounter_id: encounterId } : {}),
    };
    this.lockUntilIdle();
    this.submitted.emit(dto);
  }

  // Vuelve al estado inicial (fecha = ahora, sin errores).
  reset(): void {
    this.form.reset({
      type: '', custom_type: '', value: null, unit: '', measured_at: toDatetimeLocalValue(), note: '',
    });
    this.selectedType.set('');
    this.submittedOnce.set(false);
    this.noteLength.set(0);
    this.maxLocal.set(toDatetimeLocalValue(new Date(Date.now() + MAX_CLOCK_SKEW_MS)));
    this.formTick.update(n => n + 1);
  }

  private computeOffsetHint(value: string | null): string {
    const parsed = value ? parseLocalInputDetailed(value) : null;
    return `Hora local (${offsetLabel(parsed?.ok ? parsed.date : new Date())})`;
  }

  private onTypeChange(type: string): void {
    this.selectedType.set(type);
    const definition = this.types().find(t => t.type === type) ?? null;
    const unit = this.form.controls.unit;
    const custom = this.form.controls.custom_type;
    if (definition) {
      unit.setValue(definition.unit);
    } else if (this.types().some(t => t.unit === unit.value)) {
      // Venía de un tipo conocido: la canónica no aplica a un tipo libre.
      unit.setValue('');
    }
    if (type === OTHER_MEASUREMENT_TYPE) {
      custom.setValidators([Validators.required, Validators.pattern(CUSTOM_MEASUREMENT_TYPE_PATTERN), c => this.knownTypeError(c)]);
    } else {
      custom.clearValidators();
      custom.setValue('');
    }
    custom.updateValueAndValidity();
    this.form.controls.value.updateValueAndValidity();
  }

  private valueError(control: AbstractControl): ValidationErrors | null {
    const value = control.value as number | null;
    if (value === null || value === undefined) return null;
    if (decimalPlaces(value) > MEASUREMENT_LIMITS.decimals) return { decimals: true };
    if (Math.abs(value) >= MEASUREMENT_LIMITS.maxAbsoluteValue) return { tooLarge: true };
    const definition = this.definition?.();
    if (!definition) return null;
    return value < definition.min || value > definition.max ? { range: { min: definition.min, max: definition.max } } : null;
  }

  private knownTypeError(control: AbstractControl): ValidationErrors | null {
    const code = ((control.value as string | null) ?? '').trim();
    return this.types().some(t => t.type === code) ? { known: true } : null;
  }

  // Si el contenedor rechaza la intención sin arrancar nada (busy nunca pasa a true), la guarda se
  // libera tras el próximo render.
  private lockUntilIdle(): void {
    this.emitLocked = true;
    afterNextRender(() => {
      if (!this.busy()) this.emitLocked = false;
    }, { injector: this.injector });
  }
}
