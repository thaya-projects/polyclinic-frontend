import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CreatePatientDto, Patient, PatientSex } from '../../../core/models/patient.model';
import { DOCUMENT_TYPES, SEX_OPTIONS } from '../../../core/constants/patient-options.const';
import {
  fieldErrorMessage,
  fieldInputClass,
  isFieldInvalid,
  notFutureDateValidator,
  requiredNotBlankValidator,
} from '../../../shared/utils/form-validation.util';

// Si document_number viene con valor, document_type se vuelve obligatorio.
function documentRequiresTypeValidator(group: AbstractControl): ValidationErrors | null {
  const docType = group.get('document_type');
  const docNumber = group.get('document_number');
  if (!docType || !docNumber) return null;

  const hasNumber = !!(docNumber.value as string)?.trim();
  const hasType = !!(docType.value as string)?.trim();
  const otherErrors = { ...docType.errors };
  delete otherErrors['requiredWithDocumentNumber'];

  if (hasNumber && !hasType) {
    docType.setErrors({ ...otherErrors, requiredWithDocumentNumber: true });
  } else {
    docType.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  }
  return null;
}

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

  readonly todayStr = new Date().toISOString().slice(0, 10);

  // Solo first_name/last_name son obligatorios (T6) — el resto queda
  // opcional a propósito.
  form = this.fb.group(
    {
      first_name: ['', requiredNotBlankValidator],
      last_name: ['', requiredNotBlankValidator],
      document_type: [''],
      document_number: [''],
      birth_date: ['', notFutureDateValidator],
      sex: [''],
      whatsapp_phone: [''],
      phone_alt: [''],
      email: ['', Validators.email],
      address: [''],
      notes: [''],
    },
    { validators: documentRequiresTypeValidator },
  );

  constructor() {
    effect(() => {
      const p = this.patient();
      if (!p) return;
      this.form.patchValue(
        {
          first_name: p.first_name,
          last_name: p.last_name,
          document_type: p.document_type ?? '',
          document_number: p.document_number ?? '',
          birth_date: p.birth_date ?? '',
          sex: p.sex ?? '',
          whatsapp_phone: p.whatsapp_phone ?? '',
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
    const raw = this.form.getRawValue();
    this.submitted.emit({
      first_name: (raw.first_name ?? '').trim(),
      last_name: (raw.last_name ?? '').trim(),
      document_type: raw.document_type || null,
      document_number: raw.document_number || null,
      birth_date: raw.birth_date || null,
      sex: (raw.sex || null) as PatientSex | null,
      whatsapp_phone: raw.whatsapp_phone || null,
      phone_alt: raw.phone_alt || null,
      email: raw.email || null,
      address: raw.address || null,
      notes: raw.notes || null,
    });
  }
}
