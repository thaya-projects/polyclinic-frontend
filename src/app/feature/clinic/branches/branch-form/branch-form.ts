import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../../../../core/models/branch.model';
import {
  fieldErrorMessage, fieldInputClass, isFieldInvalid, phoneValidator, requiredNotBlankValidator,
} from '../../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../../shared/utils/server-errors.util';
import { PhoneInput } from '../../../../shared/components/phone-input/phone-input';

// Reutilizable: si `branch` viene → edit (emit saved). Si null → create (emit created).
@Component({
  selector: 'app-branch-form',
  imports: [ReactiveFormsModule, PhoneInput],
  templateUrl: './branch-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchForm {
  private fb = inject(FormBuilder);

  branch = input<Branch | null>(null);

  created = output<CreateBranchDto>();
  saved = output<UpdateBranchDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  readonly isEdit = computed(() => this.branch() !== null);

  form = this.fb.group({
    name: ['', requiredNotBlankValidator],
    address: [''],
    phone: ['', phoneValidator],
    // El backend valida que sea un id IANA reconocido (ej. America/La_Paz): eso vuelve como 422
    // con field "timezone" y se marca en el input.
    timezone: ['America/La_Paz', requiredNotBlankValidator],
  });

  constructor() {
    effect(() => {
      const b = this.branch();
      if (b) {
        this.form.patchValue({
          name: b.name,
          address: b.address ?? '',
          phone: b.phone ?? '',
          timezone: b.timezone,
        }, { emitEvent: false });
      }
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
    const address = raw.address?.trim() ? raw.address : null;
    const phone = raw.phone?.trim() ? raw.phone : null;

    const initial = this.branch();
    if (initial) {
      // Diff-only: solo keys que cambian. undefined omitido por JSON.stringify → backend lo ve Unset.
      const dto: UpdateBranchDto = {};
      if (raw.name !== initial.name) dto.name = raw.name!;
      if (address !== initial.address) dto.address = address;
      if (phone !== initial.phone) dto.phone = phone;
      if (raw.timezone !== initial.timezone) dto.timezone = raw.timezone!;
      this.saved.emit(dto);
      return;
    }

    const createDto: CreateBranchDto = {
      name: raw.name!,
      address,
      phone,
      timezone: raw.timezone!,
    };
    this.created.emit(createDto);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
