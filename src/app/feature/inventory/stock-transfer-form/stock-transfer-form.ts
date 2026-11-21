import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Branch } from '../../../core/models/branch.model';
import { Material } from '../../../core/models/material.model';
import { TransferStockDto } from '../../../core/models/stock.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

// Mismo chequeo que hace el backend (FromBranchId/ToBranchId must be different) — avisa antes de
// pegarle a un 422 evitable.
function sameBranchValidator(control: AbstractControl): ValidationErrors | null {
  const from = control.get('from_branch_id')?.value;
  const to = control.get('to_branch_id')?.value;
  return from && to && from === to ? { sameBranch: true } : null;
}

@Component({
  selector: 'app-stock-transfer-form',
  imports: [ReactiveFormsModule],
  templateUrl: './stock-transfer-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTransferForm {
  private fb = inject(FormBuilder);

  branches = input.required<Branch[]>();
  materials = input.required<Material[]>();

  submitted = output<TransferStockDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group(
    {
      material_id: ['', Validators.required],
      from_branch_id: ['', Validators.required],
      to_branch_id: ['', Validators.required],
      quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.0001)]),
      note: [''],
    },
    { validators: sameBranchValidator },
  );

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
      material_id: raw.material_id!,
      from_branch_id: raw.from_branch_id!,
      to_branch_id: raw.to_branch_id!,
      quantity: Number(raw.quantity),
      note: raw.note?.trim() || null,
    });
  }
}
