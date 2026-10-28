import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PatientContact, PatientContactDto } from '../../../core/models/patient-contact.model';
import {
  fieldErrorMessage,
  fieldInputClass,
  isFieldInvalid,
  phoneValidator,
  requiredNotBlankValidator,
} from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';
import { PhoneInput } from '../../../shared/components/phone-input/phone-input';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule, PhoneInput],
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

  // Solo full_name es obligatorio (T4). El teléfono, si viene, en E.164 (<app-phone-input>).
  form = this.fb.group({
    full_name: ['', requiredNotBlankValidator],
    relationship: [''],
    phone: ['', phoneValidator],
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
    this.submitted.emit({
      ...raw,
      full_name: (raw.full_name ?? '').trim(),
    } as PatientContactDto);
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
