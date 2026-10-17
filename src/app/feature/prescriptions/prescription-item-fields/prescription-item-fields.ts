import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  AbstractControl, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { CreatePrescriptionItemDto, PRESCRIPTION_LIMITS } from '../../../core/models/prescription.model';
import { INPUT_BASE_CLASS } from '../../../shared/utils/form-validation.util';
import { PRESCRIPTION_MEDICATION_REQUIRED_MESSAGE } from '../../../shared/utils/prescriptions-error.util';

export type PrescriptionItemGroup = FormGroup<{
  medication: FormControl<string>;
  presentation: FormControl<string>;
  dose: FormControl<string>;
  frequency: FormControl<string>;
  duration: FormControl<string>;
  instructions: FormControl<string>;
}>;

// Obligatorio aunque se escriban solo espacios (el backend recorta: "   " → "medication is required.").
export function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}

// El backend rechaza el carácter nulo (NullCharacterGuard → 422): se valida antes de enviar.
export function noNullCharacter(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.includes('\0') ? { nullChar: true } : null;
}

export function createPrescriptionItemGroup(fb: NonNullableFormBuilder): PrescriptionItemGroup {
  const short = (max: number) => ['', [Validators.maxLength(max), noNullCharacter]];
  return fb.group({
    medication: ['', [requiredTrimmed, Validators.maxLength(PRESCRIPTION_LIMITS.medication), noNullCharacter]],
    presentation: short(PRESCRIPTION_LIMITS.presentation),
    dose: short(PRESCRIPTION_LIMITS.dose),
    frequency: short(PRESCRIPTION_LIMITS.frequency),
    duration: short(PRESCRIPTION_LIMITS.duration),
    instructions: short(PRESCRIPTION_LIMITS.instructions),
  }) as PrescriptionItemGroup;
}

// Valores del grupo → DTO: recortados; los opcionales vacíos no viajan.
export function prescriptionItemDto(group: PrescriptionItemGroup): CreatePrescriptionItemDto {
  const raw = group.getRawValue();
  const dto: CreatePrescriptionItemDto = { medication: raw.medication.trim() };
  for (const key of ['presentation', 'dose', 'frequency', 'duration', 'instructions'] as const) {
    const value = raw[key].trim();
    if (value) dto[key] = value;
  }
  return dto;
}

type FieldName = keyof PrescriptionItemGroup['controls'];

// Fase 4 Recetas T4: campos de UN medicamento de una receta — PRESENTACIONAL (no emite nada: edita
// el FormGroup que le pasa su formulario). Lo usan "Nueva receta" (una fila por medicamento) y
// "Agregar medicamento". medication obligatorio (≤ 200); presentation/dose/frequency/duration
// opcionales (≤ 200); instructions opcional (≤ 1000). Accesibilidad: label por campo,
// aria-required, aria-invalid y aria-describedby → mensaje de error con role="alert".
@Component({
  selector: 'app-prescription-item-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './prescription-item-fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionItemFields {
  group = input.required<PrescriptionItemGroup>();
  // Prefijo único para ids (label for / aria-describedby).
  idPrefix = input.required<string>();
  // El formulario ya intentó enviarse: se muestran todos los errores.
  showErrors = input(false);
  busy = input(false);
  // Fuerza re-evaluar los errores (OnPush) cuando el formulario cambia el estado desde afuera.
  tick = input(0);

  readonly limits = PRESCRIPTION_LIMITS;
  readonly shortFields: { name: FieldName; label: string; placeholder: string }[] = [
    { name: 'presentation', label: 'Presentación', placeholder: 'ej: Comprimidos 500 mg' },
    { name: 'dose', label: 'Dosis', placeholder: 'ej: 1 comprimido' },
    { name: 'frequency', label: 'Frecuencia', placeholder: 'ej: Cada 8 h' },
    { name: 'duration', label: 'Duración', placeholder: 'ej: 7 días' },
  ];

  fieldId(name: string): string {
    return `${this.idPrefix()}-${name}`;
  }

  control(name: FieldName): FormControl<string> {
    return this.group().controls[name];
  }

  showError(name: FieldName): boolean {
    this.tick();
    const control = this.control(name);
    return control.invalid && (control.touched || control.dirty || this.showErrors());
  }

  describedBy(name: FieldName): string | null {
    return this.showError(name) ? this.fieldId(`${name}-error`) : null;
  }

  errorText(name: FieldName): string {
    const errors = this.control(name).errors;
    if (!errors) return '';
    if (errors['required']) return PRESCRIPTION_MEDICATION_REQUIRED_MESSAGE;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
    if (errors['nullChar']) return 'Contiene un carácter inválido.';
    return 'Valor inválido.';
  }

  inputClass(name: FieldName): string {
    return `${INPUT_BASE_CLASS} w-full ${this.showError(name)
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/18'
      : 'border-border focus:border-brand focus:ring-brand/18'}`;
  }
}
