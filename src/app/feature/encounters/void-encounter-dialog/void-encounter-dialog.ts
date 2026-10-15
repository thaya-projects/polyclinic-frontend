import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { ENCOUNTER_LIMITS } from '../../../core/models/encounter.model';
import { fieldErrorMessage, isFieldInvalid } from '../../../shared/utils/form-validation.util';

// El backend recorta antes de validar 1-500: solo espacios cuenta como vacío.
function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length === 0 ? { required: true } : null;
}

// Fase 4 T6: diálogo de anulación — pide el motivo (obligatorio, 1-500) y emite el texto. Quién
// anula (voided_by) lo resuelve el backend desde el token.
@Component({
  selector: 'app-void-encounter-dialog',
  imports: [Modal, ReactiveFormsModule],
  templateUrl: './void-encounter-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoidEncounterDialog {
  private fb = inject(FormBuilder);

  open = input(false);
  saving = input(false);
  error = input<string | null>(null);

  confirmed = output<string>();
  cancelled = output<void>();

  readonly maxLength = ENCOUNTER_LIMITS.void_reason;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    reason: ['', [Validators.required, notBlank, Validators.maxLength(ENCOUNTER_LIMITS.void_reason)]],
  });

  constructor() {
    // Cada vez que se abre arranca limpio.
    effect(() => {
      if (this.open()) this.form.reset({ reason: '' });
    });
  }

  get reasonLength(): number {
    return this.form.controls.reason.value?.length ?? 0;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmed.emit(this.form.controls.reason.value!.trim());
  }

  cancel(): void {
    if (this.saving()) return;
    this.cancelled.emit();
  }
}
