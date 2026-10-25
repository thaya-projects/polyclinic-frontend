import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dentition, dentitionLabel } from '../../../../core/models/odontogram.model';
import { DentalCondition, isGlobalDentalCondition } from '../../../../core/models/dental-condition.model';
import {
  CreateToothConditionDto, DEFAULT_TOOTH_CONDITION_STATE, DEFAULT_TOOTH_SURFACE, TOOTH_CONDITION_STATE_OPTIONS,
  TOOTH_SURFACE_OPTIONS, ToothCondition, ToothConditionState, ToothSurface, UpdateToothConditionDto,
  isValidFdiForDentition,
} from '../../../../core/models/tooth-condition.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';
import { extractServerError } from '../../../../shared/utils/server-errors.util';

// Largo máximo de la nota (ToothCondition.NoteMaxLength del backend).
const NOTE_MAX_LENGTH = 2000;

// Campo del form al que apunta un 422 cuyo ProblemDetails no trae `field` (ej. "condition_id '…' does
// not exist in the dental condition catalog.").
const DETAIL_FIELD = /^(condition_id|surface|state|note)\b/i;

// Presentacional: formulario para marcar una condición del catálogo en una pieza. No conoce la fuente
// de datos. Si `item` viene → edit (emit saved, diff-only); si null → alta (emit created) sobre `tooth`
// con la cara preseleccionada en la grilla (`presetSurface`, o whole). tooth_fdi no se edita.
// Valida en front que la pieza corresponda a la dentición del odontograma (misma regla que el backend).
@Component({
  selector: 'app-tooth-condition-form',
  imports: [ReactiveFormsModule],
  templateUrl: './tooth-condition-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToothConditionForm {
  private fb = inject(FormBuilder);

  tooth = input.required<number>();
  dentition = input.required<Dentition>();
  catalog = input<DentalCondition[]>([]);
  presetSurface = input<ToothSurface | null>(null);
  item = input<ToothCondition | null>(null);
  saving = input(false);

  created = output<CreateToothConditionDto>();
  saved = output<UpdateToothConditionDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;
  readonly noteMaxLength = NOTE_MAX_LENGTH;
  readonly surfaceOptions = TOOTH_SURFACE_OPTIONS;
  readonly stateOptions = TOOTH_CONDITION_STATE_OPTIONS;

  readonly isEdit = computed(() => this.item() !== null);

  readonly globalConditions = computed(() => this.catalog().filter(isGlobalDentalCondition));
  readonly ownConditions = computed(() => this.catalog().filter(c => !isGlobalDentalCondition(c)));
  readonly conditionGroups = computed(() =>
    [
      { label: 'Globales', items: this.globalConditions() },
      { label: 'Propias', items: this.ownConditions() },
    ].filter(g => g.items.length > 0),
  );

  // Pieza fuera de la dentición del odontograma: bloquea el alta (el backend respondería 422).
  readonly fdiError = computed(() => {
    const fdi = this.tooth();
    const dentition = this.dentition();
    return isValidFdiForDentition(fdi, dentition)
      ? null
      : `La pieza ${fdi} no corresponde a la dentición ${dentitionLabel(dentition).toLowerCase()}.`;
  });

  form = this.fb.nonNullable.group({
    condition_id: ['', Validators.required],
    surface: [DEFAULT_TOOTH_SURFACE as ToothSurface, Validators.required],
    state: [DEFAULT_TOOTH_CONDITION_STATE as ToothConditionState, Validators.required],
    note: ['', Validators.maxLength(NOTE_MAX_LENGTH)],
  });

  // form.reset() emite valueChanges, así que el chip seleccionado sigue también al cargar un item en edit.
  readonly conditionValue = toSignal(this.form.controls.condition_id.valueChanges, { initialValue: '' });

  chooseCondition(id: string): void {
    const control = this.form.controls.condition_id;
    control.setValue(id);
    control.markAsTouched();
  }

  constructor() {
    effect(() => {
      const item = this.item();
      const surface = this.presetSurface();
      this.tooth();
      untracked(() => {
        if (item) {
          this.form.reset({
            condition_id: item.condition_id, surface: item.surface, state: item.state, note: item.note ?? '',
          });
        } else {
          // Reset explícito al cambiar de pieza / cara o al salir de edit: sin esto quedan datos ajenos.
          this.resetForCreate(surface);
        }
      });
    });
  }

  // Lo llama el contenedor tras un alta exitosa: vuelve a la cara preseleccionada y limpia el resto.
  clear(): void {
    if (!this.item()) this.resetForCreate(this.presetSurface());
  }

  private resetForCreate(surface: ToothSurface | null): void {
    this.form.reset({
      condition_id: '', surface: surface ?? DEFAULT_TOOTH_SURFACE, state: DEFAULT_TOOTH_CONDITION_STATE, note: '',
    });
  }

  // Error 422 del backend: lo marca en el input del campo que falló, con el texto ya traducido por
  // odontogramError (`message`). false = no es de un campo de este form (ej. tooth_fdi, que no se
  // edita acá): el caller muestra el banner.
  applyServerError(err: unknown, message: string): boolean {
    const field = extractServerError(err)?.field
      ?? (err instanceof HttpErrorResponse && typeof err.error?.detail === 'string'
        ? err.error.detail.match(DETAIL_FIELD)?.[1]?.toLowerCase() : undefined);
    const control = field ? this.form.get(field) : null;
    if (!control || control.disabled) return false;
    control.setErrors({ ...(control.errors ?? {}), server: message });
    control.markAsTouched();
    return true;
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const note = raw.note.trim() || null;

    const initial = this.item();
    if (initial) {
      // Diff-only: solo viaja lo que cambió (note vacía = null, quita la nota).
      const dto: UpdateToothConditionDto = {};
      if (raw.condition_id !== initial.condition_id) dto.condition_id = raw.condition_id;
      if (raw.surface !== initial.surface) dto.surface = raw.surface;
      if (raw.state !== initial.state) dto.state = raw.state;
      if (note !== initial.note) dto.note = note;
      this.saved.emit(dto);
      return;
    }

    if (this.fdiError()) return;
    const dto: CreateToothConditionDto = {
      tooth_fdi: this.tooth(), condition_id: raw.condition_id, surface: raw.surface, state: raw.state,
    };
    if (note) dto.note = note;
    this.created.emit(dto);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
