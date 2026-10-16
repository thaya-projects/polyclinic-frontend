import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TreatmentPlanStatus, TreatmentPlanStatusChangeDto } from '../../../core/models/treatment-plan.model';
import { TREATMENT_PLAN_STATUSES, TREATMENT_PLAN_STATUS_LABELS } from '../../../core/constants/treatment-plan-status.const';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

// No hay ningún botón de "facturar" acá ni en ningún lado de esta UI —
// prohibido en el alcance de Fase 7 (eso es Fase 8).
@Component({
  selector: 'app-treatment-plan-status-form',
  imports: [ReactiveFormsModule],
  templateUrl: './treatment-plan-status-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanStatusForm {
  private fb = inject(FormBuilder);

  // Desacoplado de la fuente de datos: solo recibe el status actual, no
  // sabe de dónde viene el plan.
  currentStatus = input.required<TreatmentPlanStatus>();
  saving = input(false);

  changed = output<TreatmentPlanStatusChangeDto>();

  readonly inputClass = fieldInputClass;
  readonly statusOptions = TREATMENT_PLAN_STATUSES;
  readonly statusLabels = TREATMENT_PLAN_STATUS_LABELS;

  form = this.fb.group({
    status: ['', Validators.required],
    note: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.changed.emit({ status: raw.status as TreatmentPlanStatus, note: raw.note || null });
  }

  resetAfterSuccess(): void {
    this.form.reset({ status: '', note: '' });
  }
}
