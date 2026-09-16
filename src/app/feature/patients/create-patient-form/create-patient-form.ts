import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreatePatientDto, Patient } from '../../../core/models/patient.model';
import { DOCUMENT_TYPES, SEX_OPTIONS } from '../../../core/constants/patient-options.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

@Component({
  selector: 'app-create-patient-form',
  imports: [ReactiveFormsModule],
  templateUrl: './create-patient-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePatientForm {
  private fb = inject(FormBuilder);

  readonly documentTypes = DOCUMENT_TYPES;
  readonly sexOptions = SEX_OPTIONS;

  // Se reutiliza este mismo form para editar (T7): si viene un paciente,
  // el form se precarga con sus datos; si no, queda vacío (alta).
  patient = input<Patient | null>(null);

  submitted = output<CreatePatientDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Solo first_name/last_name son obligatorios (T6) — el resto queda
  // opcional a propósito.
  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    document_type: [''],
    document_number: [''],
    birth_date: [''],
    sex: [''],
    whatsapp_phone: [''],
    phone_alt: [''],
    email: ['', Validators.email],
    address: [''],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const p = this.patient();
      if (!p) return;
      this.form.patchValue(
        {
          first_name: p.first_name,
          last_name: p.last_name,
          document_type: p.document_type,
          document_number: p.document_number,
          birth_date: p.birth_date ?? '',
          sex: p.sex,
          whatsapp_phone: p.whatsapp_phone,
          phone_alt: p.phone_alt ?? '',
          email: p.email ?? '',
          address: p.address ?? '',
          notes: p.notes ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as CreatePatientDto);
  }
}
