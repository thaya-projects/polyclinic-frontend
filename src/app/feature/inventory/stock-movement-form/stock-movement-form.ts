import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Branch } from '../../../core/models/branch.model';
import { Material } from '../../../core/models/material.model';
import { CreateStockMovementDto, StockMovementCreateType } from '../../../core/models/stock.model';
import { STOCK_MOVEMENT_CREATE_TYPES, STOCK_MOVEMENT_TYPE_LABELS } from '../../../core/constants/stock-movement-type.const';
import { inventoryCurrencyOptions } from '../../../core/constants/inventory-currency.const';
import { resolveTenantCurrency } from '../../../core/constants/currencies.const';
import { AuthStore } from '../../../core/services/auth-store.service';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

// inbound/consumption: magnitud positiva. adjustment: cualquier valor distinto de cero (puede bajar
// o subir el stock). Espeja la regla del backend (sección 5 del contrato).
function quantityForTypeValidator(getType: () => StockMovementCreateType | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '') return null;
    const n = Number(value);
    if (getType() === 'adjustment') return n !== 0 ? null : { quantityZero: true };
    return n > 0 ? null : { quantityNotPositive: true };
  };
}

@Component({
  selector: 'app-stock-movement-form',
  imports: [ReactiveFormsModule],
  templateUrl: './stock-movement-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockMovementForm {
  private fb = inject(FormBuilder);

  branches = input.required<Branch[]>();
  materials = input.required<Material[]>();

  readonly types = STOCK_MOVEMENT_CREATE_TYPES;
  readonly typeLabels = STOCK_MOVEMENT_TYPE_LABELS;
  readonly tenantCurrency = resolveTenantCurrency(inject(AuthStore).tenant());
  readonly currencies = inventoryCurrencyOptions(this.tenantCurrency);

  submitted = output<CreateStockMovementDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  private readonly typeControl = this.fb.control<StockMovementCreateType>('inbound', Validators.required);
  private readonly quantityControl = this.fb.control<number | null>(null, [
    Validators.required,
    quantityForTypeValidator(() => this.typeControl.value),
  ]);

  form = this.fb.group({
    branch_id: ['', Validators.required],
    material_id: ['', Validators.required],
    type: this.typeControl,
    quantity: this.quantityControl,
    unit_cost: this.fb.control<number | null>(null, Validators.min(0)),
    currency: [''],
    note: [''],
  });

  constructor() {
    // El signo permitido depende del tipo elegido: re-valida la cantidad al cambiarlo.
    this.typeControl.valueChanges.subscribe(() => this.quantityControl.updateValueAndValidity());
  }

  quantityErrorMessage(): string {
    const control = this.form.controls.quantity;
    if (control.hasError('quantityNotPositive') && !control.hasError('server')) {
      return 'La cantidad debe ser mayor a 0 para este tipo de movimiento.';
    }
    if (control.hasError('quantityZero') && !control.hasError('server')) {
      return 'La cantidad no puede ser 0 en un ajuste.';
    }
    return fieldErrorMessage(control);
  }

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
      branch_id: raw.branch_id!,
      material_id: raw.material_id!,
      type: raw.type!,
      quantity: Number(raw.quantity),
      unit_cost: raw.unit_cost ?? null,
      currency: raw.currency || null,
      note: raw.note?.trim() || null,
    });
  }
}
