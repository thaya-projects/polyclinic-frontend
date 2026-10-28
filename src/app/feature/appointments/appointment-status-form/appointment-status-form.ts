import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { APPOINTMENT_STATUS_LABELS, statusOptionsFor } from '../../../core/constants/appointment-status.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

export interface AppointmentStatusChange {
  to_status: AppointmentStatus;
  note: string | null;
  cancelled_reason: string | null;
}

// Único requisito de validación del ticket: no se puede confirmar el
// cambio a "cancelled" sin cancelled_reason. El error queda en el control
// cancelled_reason para mostrarlo debajo de ese input.
function cancelledReasonValidator(group: AbstractControl): ValidationErrors | null {
  const reasonCtrl = group.get('cancelled_reason');
  if (!reasonCtrl) return null;
  const toStatus = group.get('to_status')?.value;
  const reason = reasonCtrl.value as string | null;

  const otherErrors = { ...reasonCtrl.errors };
  delete otherErrors['cancelledReasonRequired'];
  if (toStatus === 'cancelled' && !reason?.trim()) otherErrors['cancelledReasonRequired'] = true;

  reasonCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  return null;
}

@Component({
  selector: 'app-appointment-status-form',
  imports: [ReactiveFormsModule],
  templateUrl: './appointment-status-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentStatusForm {
  private fb = inject(FormBuilder);

  // Desacoplado de la fuente de datos: solo recibe el status actual, no
  // sabe de dónde viene la cita.
  currentStatus = input.required<AppointmentStatus>();
  saving = input(false);

  changed = output<AppointmentStatusChange>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly statusLabels = APPOINTMENT_STATUS_LABELS;

  // "scheduled" no se ofrece como destino si el status actual es terminal
  // (completed/cancelled) — no se reabre una cita cerrada.
  readonly statusOptions = computed(() => statusOptionsFor(this.currentStatus()));

  form = this.fb.group(
    {
      to_status: ['', Validators.required],
      note: [''],
      cancelled_reason: [''],
    },
    { validators: cancelledReasonValidator },
  );

  private readonly selectedStatus = toSignal(this.form.controls.to_status.valueChanges, { initialValue: '' });
  readonly showCancelledReason = computed(() => this.selectedStatus() === 'cancelled');

  errorMessage(control: AbstractControl | null): string {
    if (control?.errors?.['cancelledReasonRequired']) return 'Es obligatorio indicar el motivo para cancelar la cita.';
    if (control === this.form.controls.to_status && control.errors?.['required']) return 'Seleccioná el nuevo estado.';
    return fieldErrorMessage(control);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el panel muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const toStatus = raw.to_status as AppointmentStatus;
    this.changed.emit({
      to_status: toStatus,
      note: raw.note || null,
      cancelled_reason: toStatus === 'cancelled' ? raw.cancelled_reason || null : null,
    });
  }

  // El contenedor llama esto recién cuando el POST confirma éxito — antes
  // (T5, mock) se limpiaba optimistamente al emitir, pero contra el
  // backend real eso borraría lo cargado por el usuario si la request falla.
  resetAfterSuccess(): void {
    this.form.reset({ to_status: '', note: '', cancelled_reason: '' });
  }
}
