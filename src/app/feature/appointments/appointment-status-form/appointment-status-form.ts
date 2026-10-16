import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { APPOINTMENT_STATUS_LABELS, statusOptionsFor } from '../../../core/constants/appointment-status.const';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

export interface AppointmentStatusChange {
  to_status: AppointmentStatus;
  note: string | null;
  cancelled_reason: string | null;
}

// Único requisito de validación del ticket: no se puede confirmar el
// cambio a "cancelled" sin cancelled_reason.
function cancelledReasonValidator(group: AbstractControl): ValidationErrors | null {
  const toStatus = group.get('to_status')?.value;
  const reason = group.get('cancelled_reason')?.value as string | null;
  if (toStatus === 'cancelled' && !reason?.trim()) return { cancelledReasonRequired: true };
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

  get hasCancelledReasonError(): boolean {
    return !!this.form.errors?.['cancelledReasonRequired'] && this.form.controls.cancelled_reason.touched;
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
