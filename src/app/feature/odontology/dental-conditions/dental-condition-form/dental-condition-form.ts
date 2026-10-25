import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CreateDentalConditionDto, DENTAL_CONDITION_CATEGORIES, DENTAL_CONDITION_LIMITS, DentalCondition,
  UpdateDentalConditionDto,
} from '../../../../core/models/dental-condition.model';
import { HttpErrorResponse } from '@angular/common/http';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';
import { extractServerError } from '../../../../shared/utils/server-errors.util';
import { DentalConditionError } from '../../../../shared/utils/dental-conditions-error.util';

// Los VOs DentalConditionCode / HexColor lanzan con ParamName "value" (el ProblemDetails no trae
// `field`): el campo se deduce del texto ("Code ...", "Color ...", "Name ...", "Category ...").
const DETAIL_FIELD: [RegExp, string][] = [
  [/^Code\b/i, 'code'],
  [/^Color\b/i, 'default_color'],
  [/^Name\b/i, 'name'],
  [/^Category\b/i, 'category'],
];

function fieldFromDetail(err: unknown): string | null {
  const detail = err instanceof HttpErrorResponse && typeof err.error?.detail === 'string' ? err.error.detail : '';
  return DETAIL_FIELD.find(([pattern]) => pattern.test(detail))?.[1] ?? null;
}

// required no rechaza "   ": el backend sí (Name is required).
function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;
}

// Formato de DentalConditionCode sobre el valor recortado (el backend hace trim antes de validar).
function codeFormat(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value && !DENTAL_CONDITION_LIMITS.codeFormat.test(value) ? { pattern: true } : null;
}

// Largo máximo sobre el valor recortado (DentalCondition hace trim antes de validar el largo).
function trimmedMaxLength(max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = typeof control.value === 'string' ? control.value.trim().length : 0;
    return length > max ? { maxlength: { requiredLength: max, actualLength: length } } : null;
  };
}

// Reutilizable: si `condition` viene → edit (emit saved, diff-only). Si null → create (emit created).
// Solo para condiciones propias: las globales no llegan acá (la tabla no ofrece editarlas).
// Code no editable en modo edit (clave natural, inmutable en el backend).
@Component({
  selector: 'app-dental-condition-form',
  imports: [ReactiveFormsModule],
  templateUrl: './dental-condition-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DentalConditionForm {
  private fb = inject(FormBuilder);

  condition = input<DentalCondition | null>(null);

  created = output<CreateDentalConditionDto>();
  saved = output<UpdateDentalConditionDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly categories = DENTAL_CONDITION_CATEGORIES;
  readonly codeMaxLength = DENTAL_CONDITION_LIMITS.codeMaxLength;
  readonly nameMaxLength = DENTAL_CONDITION_LIMITS.nameMaxLength;
  readonly categoryMaxLength = DENTAL_CONDITION_LIMITS.categoryMaxLength;

  readonly isEdit = computed(() => this.condition() !== null);

  form = this.fb.group({
    code: ['', [
      Validators.required, notBlank, Validators.maxLength(DENTAL_CONDITION_LIMITS.codeMaxLength), codeFormat,
    ]],
    name: ['', [Validators.required, notBlank, trimmedMaxLength(DENTAL_CONDITION_LIMITS.nameMaxLength)]],
    category: ['', trimmedMaxLength(DENTAL_CONDITION_LIMITS.categoryMaxLength)],
    default_color: ['', Validators.pattern(DENTAL_CONDITION_LIMITS.colorFormat)],
  });

  private readonly colorValue = toSignal(this.form.controls.default_color.valueChanges, { initialValue: '' });

  // Muestra del color: solo si el valor actual es un #RRGGBB válido.
  readonly previewColor = computed(() => {
    const value = (this.colorValue() ?? '').trim();
    return DENTAL_CONDITION_LIMITS.colorFormat.test(value) ? value.toUpperCase() : null;
  });

  constructor() {
    effect(() => {
      const c = this.condition();
      if (c) {
        this.form.reset({
          code: c.code, name: c.name, category: c.category ?? '', default_color: c.default_color ?? '',
        });
        this.form.controls.code.disable({ emitEvent: false });
      } else {
        // Reset explícito al pasar de edit → create: sin esto el form conserva datos ajenos.
        this.form.controls.code.enable({ emitEvent: false });
        this.form.reset({ code: '', name: '', category: '', default_color: '' });
      }
    });
  }

  errorMessage(control: AbstractControl | null): string {
    const errors = control?.errors;
    if (control === this.form.controls.code && errors?.['pattern']) {
      return 'Solo minúsculas, números y guion bajo (ej: fractura_coronaria).';
    }
    if (control === this.form.controls.default_color && errors?.['pattern']) {
      return 'Usá el formato #RRGGBB (ej: #E53935).';
    }
    return fieldErrorMessage(control);
  }

  // Error del backend (422 de un campo, o 409 de código duplicado): lo marca en el input del campo,
  // con el texto ya traducido por dentalConditionError. false = no es de un campo de este form (el
  // caller muestra el banner).
  applyServerError(err: unknown, error: DentalConditionError): boolean {
    let field: string | null = null;
    if (error.kind === 'duplicate_code') field = 'code';
    else if (error.kind === 'validation') {
      const serverField = extractServerError(err)?.field ?? null;
      field = serverField === 'color' ? 'default_color' : serverField ?? fieldFromDetail(err);
    }
    const control = field ? this.form.get(field) : null;
    if (!control || control.disabled) return false;
    control.setErrors({ ...(control.errors ?? {}), server: error.message });
    control.markAsTouched();
    return true;
  }

  // El selector nativo devuelve #rrggbb en minúsculas; se guarda en mayúsculas como el backend.
  pickColor(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.form.controls.default_color.setValue(value);
    this.form.controls.default_color.markAsDirty();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const name = (raw.name ?? '').trim();
    const category = optional(raw.category);
    const color = optional(raw.default_color)?.toUpperCase() ?? null;

    const initial = this.condition();
    if (initial) {
      // Diff-only: solo viaja lo que cambió (null = quitar categoría/color).
      const dto: UpdateDentalConditionDto = {};
      if (name !== initial.name) dto.name = name;
      if (category !== initial.category) dto.category = category;
      if (color !== initial.default_color) dto.default_color = color;
      this.saved.emit(dto);
      return;
    }

    const dto: CreateDentalConditionDto = { code: (raw.code ?? '').trim(), name };
    if (category) dto.category = category;
    if (color) dto.default_color = color;
    this.created.emit(dto);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}

function optional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
