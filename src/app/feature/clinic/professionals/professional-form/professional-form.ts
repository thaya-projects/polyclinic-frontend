import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import {
  CreateProfessionalDto, Professional, UpdateProfessionalDto,
} from '../../../../core/models/professional.model';
import { Specialty } from '../../../../core/models/specialty.model';
import {
  emailValidator, fieldErrorMessage, fieldInputClass, isFieldInvalid, phoneValidator, requiredNotBlankValidator,
} from '../../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../../shared/utils/server-errors.util';
import { PhoneInput } from '../../../../shared/components/phone-input/phone-input';

// create_login_account=true requiere email.
function emailRequiredForLoginValidator(group: AbstractControl): ValidationErrors | null {
  const createLogin = group.get('create_login_account');
  const email = group.get('email');
  if (!createLogin || !email) return null;

  const otherErrors = { ...email.errors };
  delete otherErrors['requiredForLogin'];

  if (createLogin.value && !(email.value as string)?.trim()) {
    email.setErrors({ ...otherErrors, requiredForLogin: true });
  } else {
    email.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  }
  return null;
}

// Reutilizable: si `professional` viene → edit (emit saved). Si null → create (emit created).
// Las specialties se manejan aparte porque el backend las expone en un endpoint PUT dedicado —
// el form las mantiene en un signal local y las emite junto con el resto solo en modo create.
// En edit, el componente padre decide si emitir un segundo PUT específico para specialties.
@Component({
  selector: 'app-professional-form',
  imports: [ReactiveFormsModule, PhoneInput],
  templateUrl: './professional-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalForm {
  private fb = inject(FormBuilder);

  professional = input<Professional | null>(null);
  availableSpecialties = input.required<Specialty[]>();

  created = output<{ dto: CreateProfessionalDto }>();
  saved = output<{ patch: UpdateProfessionalDto; specialtyIds: string[]; specialtiesChanged: boolean }>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  readonly isEdit = computed(() => this.professional() !== null);

  // Selección de specialties: set local, no atado al FormGroup (el multi-select con chips es más
  // simple con signals que con FormArray para este caso).
  readonly selectedSpecialtyIds = signal<Set<string>>(new Set());

  form = this.fb.group(
    {
      full_name: ['', requiredNotBlankValidator],
      license_number: [''],
      email: ['', emailValidator],
      phone: ['', phoneValidator],
      create_login_account: [false],
    },
    { validators: emailRequiredForLoginValidator },
  );

  constructor() {
    effect(() => {
      const p = this.professional();
      if (p) {
        this.form.patchValue({
          full_name: p.full_name,
          license_number: p.license_number ?? '',
          email: p.email ?? '',
          phone: p.phone ?? '',
          create_login_account: false,
        }, { emitEvent: false });
        this.selectedSpecialtyIds.set(new Set(p.specialty_ids));
      } else {
        this.form.reset(
          { full_name: '', license_number: '', email: '', phone: '', create_login_account: false },
          { emitEvent: false },
        );
        this.selectedSpecialtyIds.set(new Set());
      }
    });
  }

  toggleSpecialty(id: string): void {
    this.selectedSpecialtyIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isSelected(id: string): boolean {
    return this.selectedSpecialtyIds().has(id);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje general). El backend nombra el campo por el
  // parámetro de Professional.Create (fullName → full_name), igual que el control.
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  // 409 "app user with email" (alta con cuenta de acceso): el correo ya tiene una cuenta.
  markEmailTaken(message: string): void {
    const email = this.form.controls.email;
    email.setErrors({ ...(email.errors ?? {}), server: message });
    email.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const licenseNumber = raw.license_number?.trim() ? raw.license_number : null;
    const email = raw.email?.trim() ? raw.email.trim() : null;
    const phone = raw.phone?.trim() ? raw.phone : null;
    const specialtyIds = Array.from(this.selectedSpecialtyIds());

    const initial = this.professional();
    if (initial) {
      const patch: UpdateProfessionalDto = {};
      if (raw.full_name !== initial.full_name) patch.full_name = raw.full_name!;
      if (licenseNumber !== initial.license_number) patch.license_number = licenseNumber;
      if (email !== initial.email) patch.email = email;
      if (phone !== initial.phone) patch.phone = phone;

      const initialSet = new Set(initial.specialty_ids);
      const specialtiesChanged = initialSet.size !== specialtyIds.length
        || specialtyIds.some(id => !initialSet.has(id));

      this.saved.emit({ patch, specialtyIds, specialtiesChanged });
      return;
    }

    const dto: CreateProfessionalDto = {
      full_name: raw.full_name!,
      license_number: licenseNumber,
      email,
      phone,
      user_id: null,
      specialty_ids: specialtyIds,
      create_login_account: raw.create_login_account ?? false,
    };
    this.created.emit({ dto });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
