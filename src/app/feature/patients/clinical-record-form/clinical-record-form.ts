import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ClinicalHabits, ClinicalRecord, ClinicalRecordDto } from '../../../core/models/clinical-record.model';
import { BLOOD_TYPES } from '../../../core/constants/blood-types.const';
import { HABIT_FIELDS } from '../../../core/constants/clinical-habits.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

const TEXTAREA_CLASS =
  'rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-brand focus:ring-3 focus:ring-brand/18 focus:outline-none';

@Component({
  selector: 'app-clinical-record-form',
  imports: [ReactiveFormsModule],
  templateUrl: './clinical-record-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicalRecordForm {
  private fb = inject(FormBuilder);

  readonly bloodTypes = BLOOD_TYPES;
  readonly habitFields = HABIT_FIELDS;
  readonly textareaClass = TEXTAREA_CLASS;

  // null => el paciente todavía no tiene clinical_record (form vacío).
  record = input<ClinicalRecord | null>(null);
  saved = input(false);
  saving = input(false);

  submitted = output<ClinicalRecordDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Claves de habits que no maneja este form (cargadas por otra vía): se devuelven intactas al
  // guardar, el PATCH reemplaza el objeto entero.
  private extraHabits: ClinicalHabits = {};

  // Sin campos obligatorios (T4 no lo pide) — se puede guardar parcial o vacío.
  form = this.fb.group({
    blood_type: [''],
    allergies: [''],
    chronic_conditions: [''],
    current_medications: [''],
    family_history: [''],
    habits: new FormGroup(
      Object.fromEntries(HABIT_FIELDS.map(f => [f.key, new FormControl('', { nonNullable: true })])) as Record<
        string,
        FormControl<string>
      >,
    ),
  });

  constructor() {
    effect(() => {
      const r = this.record();
      this.form.patchValue(
        {
          blood_type: r?.blood_type ?? '',
          allergies: r?.allergies ?? '',
          chronic_conditions: r?.chronic_conditions ?? '',
          current_medications: r?.current_medications ?? '',
          family_history: r?.family_history ?? '',
        },
        { emitEvent: false },
      );
      const habits = r?.habits ?? {};
      this.extraHabits = Object.fromEntries(
        Object.entries(habits).filter(([key]) => !HABIT_FIELDS.some(f => f.key === key)),
      );
      this.form.controls.habits.reset(
        Object.fromEntries(HABIT_FIELDS.map(f => [f.key, habitText(habits[f.key])])),
        { emitEvent: false },
      );
    });
  }

  habitOptions(key: string, options: string[]): string[] {
    const current = this.form.controls.habits.controls[key]?.value;
    return current && !options.includes(current) ? [current, ...options] : options;
  }

  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  submit(): void {
    const raw = this.form.getRawValue();
    const habits: ClinicalHabits = { ...this.extraHabits };
    for (const [key, value] of Object.entries(raw.habits)) {
      if (value.trim()) habits[key] = value.trim();
    }
    // Strings tal cual ('' incluido): en el PATCH null = "no tocar", '' = vaciar el campo.
    this.submitted.emit({
      blood_type: raw.blood_type ?? '',
      allergies: raw.allergies ?? '',
      chronic_conditions: raw.chronic_conditions ?? '',
      current_medications: raw.current_medications ?? '',
      family_history: raw.family_history ?? '',
      habits,
    });
  }
}

function habitText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
