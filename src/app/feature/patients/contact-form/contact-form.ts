import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientContact, PatientContactDto } from '../../../core/models/patient-contact.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactForm {
  private fb = inject(FormBuilder);

  // null => alta de contacto nuevo; con valor => edición de ese contacto.
  contact = input<PatientContact | null>(null);
  saving = input(false);

  submitted = output<PatientContactDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Solo full_name es obligatorio (T4).
  form = this.fb.group({
    full_name: ['', Validators.required],
    relationship: [''],
    phone: [''],
  });

  constructor() {
    effect(() => {
      const c = this.contact();
      this.form.patchValue(
        { full_name: c?.full_name ?? '', relationship: c?.relationship ?? '', phone: c?.phone ?? '' },
        { emitEvent: false },
      );
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as PatientContactDto);
  }

  // T5: el guardado ahora es async — el form ya no se limpia solo al
  // emitir; el contenedor llama esto recién cuando el POST tuvo éxito.
  resetForCreate(): void {
    this.form.reset({ full_name: '', relationship: '', phone: '' });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
