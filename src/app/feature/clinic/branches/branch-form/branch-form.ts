import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../../../../core/models/branch.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';

// Reutilizable: si `branch` viene → edit (emit saved). Si null → create (emit created).
@Component({
  selector: 'app-branch-form',
  imports: [ReactiveFormsModule],
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
    name: ['', Validators.required],
    address: [''],
    phone: [''],
    timezone: ['America/La_Paz', Validators.required],
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
