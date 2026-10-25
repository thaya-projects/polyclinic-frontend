import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TreatmentPlanItem, TreatmentPlanItemStatusChangeDto } from '../../../core/models/treatment-plan-item.model';
import { TreatmentPlanAppointmentOption } from '../../../core/services/treatment-plan-options.service';
import {
  TREATMENT_PLAN_ITEM_STATUSES,
  TREATMENT_PLAN_ITEM_STATUS_LABELS,
} from '../../../core/constants/treatment-plan-item-status.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

// Desacoplado de la fuente de datos: recibe el item y las citas ya
// resueltas, no sabe si vienen de un mock o de HTTP.
@Component({
  selector: 'app-treatment-plan-item-status-form',
  imports: [ReactiveFormsModule],
  templateUrl: './treatment-plan-item-status-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanItemStatusForm {
  private fb = inject(FormBuilder);

  item = input.required<TreatmentPlanItem>();
  appointments = input.required<TreatmentPlanAppointmentOption[]>();
  saving = input(false);

  changed = output<TreatmentPlanItemStatusChangeDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;
  readonly statusOptions = TREATMENT_PLAN_ITEM_STATUSES;
  readonly statusLabels = TREATMENT_PLAN_ITEM_STATUS_LABELS;

  form = this.fb.group({
    status: ['', Validators.required],
    appointment_id: [''],
  });

  constructor() {
    // Precarga el estado y el link actual — a diferencia del form de
    // plan, acá sí interesa partir de lo que ya tiene el item (el usuario
    // puede querer solo agregar/quitar el link sin cambiar el estado).
    effect(() => {
      const i = this.item();
      this.form.patchValue({ status: i.status, appointment_id: i.appointment_id ?? '' }, { emitEvent: false });
    });
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.changed.emit({
      status: raw.status as TreatmentPlanItemStatusChangeDto['status'],
      appointment_id: raw.appointment_id || null,
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
