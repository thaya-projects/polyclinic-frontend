import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ClinicalRecord, ClinicalRecordDto } from '../../../core/models/clinical-record.model';
import { BLOOD_TYPES } from '../../../core/constants/blood-types.const';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

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
  readonly textareaClass = TEXTAREA_CLASS;

  // null => el paciente todavía no tiene clinical_record (form vacío).
  record = input<ClinicalRecord | null>(null);
  saved = input(false);
  saving = input(false);

  submitted = output<ClinicalRecordDto>();

  readonly inputClass = fieldInputClass;

  // Sin campos obligatorios (T4 no lo pide) — se puede guardar parcial o vacío.
  form = this.fb.group({
    blood_type: [''],
    allergies: [''],
    chronic_conditions: [''],
    current_medications: [''],
    family_history: [''],
    habits: [''],
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
          habits: r?.habits ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  submit(): void {
    this.submitted.emit(this.form.getRawValue() as ClinicalRecordDto);
  }
}
