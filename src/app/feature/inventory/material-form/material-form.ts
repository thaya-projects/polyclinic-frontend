import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateMaterialDto, Material } from '../../../core/models/material.model';
import { CreateUnitOfMeasureDto } from '../../../core/models/unit-of-measure.model';
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS } from '../../../core/constants/material-category.const';
import { inventoryCurrencyOptions } from '../../../core/constants/inventory-currency.const';
import { resolveTenantCurrency } from '../../../core/constants/currencies.const';
import { AuthStore } from '../../../core/services/auth-store.service';
import { UnitsOfMeasureService } from '../../../core/services/units-of-measure.service';
import { unitSaveErrorMessage } from '../../../shared/utils/units-error.util';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';
import { generateMaterialCode } from '../../../shared/utils/material-code.util';
import { Modal } from '../../../shared/components/modal/modal';
import { UnitOfMeasureForm } from '../unit-of-measure-form/unit-of-measure-form';

@Component({
  selector: 'app-material-form',
  imports: [ReactiveFormsModule, Modal, UnitOfMeasureForm],
  templateUrl: './material-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialForm {
  private fb = inject(FormBuilder);
  private unitsSvc = inject(UnitsOfMeasureService);
  private quickAddForm = viewChild<UnitOfMeasureForm>('quickAddForm');

  readonly categories = MATERIAL_CATEGORIES;
  readonly categoryLabels = MATERIAL_CATEGORY_LABELS;
  readonly tenantCurrency = resolveTenantCurrency(inject(AuthStore).tenant());
  readonly currencies = inventoryCurrencyOptions(this.tenantCurrency);

  readonly activeUnits = computed(() => this.unitsSvc.getAll()().filter(u => u.is_active));
  readonly unitsLoading = this.unitsSvc.loading;

  // null => alta de material nuevo; con valor => edición de ese material.
  material = input<Material | null>(null);

  submitted = output<CreateMaterialDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    name: ['', requiredNotBlankValidator],
    category: this.fb.control(this.categories[0], Validators.required),
    unit_of_measure_id: ['', Validators.required],
    unit_cost: this.fb.control<number | null>(0, Validators.min(0)),
    min_stock: this.fb.control<number | null>(0, Validators.min(0)),
    currency: [this.tenantCurrency],
  });

  // El código ya no se tipea: se deriva del nombre (ver material-code.util.ts).
  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, {
    initialValue: this.form.controls.name.value,
  });
  readonly generatedCode = computed(() => generateMaterialCode(this.nameValue() ?? ''));

  quickAddOpen = signal(false);
  quickAddSaving = signal(false);
  quickAddError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const m = this.material();
      this.form.patchValue(
        {
          name: m?.name ?? '',
          category: m?.category ?? this.categories[0],
          unit_of_measure_id: m?.unit_of_measure_id ?? '',
          unit_cost: m?.unit_cost ?? 0,
          min_stock: m?.min_stock ?? 0,
          currency: m?.currency ?? this.tenantCurrency,
        },
        { emitEvent: false },
      );
    });
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  openQuickAddUnit(): void {
    this.quickAddError.set(null);
    this.quickAddOpen.set(true);
  }

  closeQuickAddUnit(): void {
    this.quickAddOpen.set(false);
    this.quickAddError.set(null);
  }

  submitQuickAddUnit(): void {
    this.quickAddForm()?.submit();
  }

  onQuickAddUnitSave(dto: CreateUnitOfMeasureDto): void {
    this.quickAddSaving.set(true);
    this.quickAddError.set(null);
    this.unitsSvc.create(dto).subscribe({
      next: created => {
        this.quickAddSaving.set(false);
        this.form.controls.unit_of_measure_id.setValue(created.id);
        this.closeQuickAddUnit();
      },
      error: err => {
        this.quickAddSaving.set(false);
        this.quickAddError.set(this.quickAddForm()?.applyServerError(err) ? null : unitSaveErrorMessage(err));
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      code: this.generatedCode() || null,
      name: (raw.name ?? '').trim(),
      category: raw.category!,
      unit_of_measure_id: raw.unit_of_measure_id!,
      unit_cost: Number(raw.unit_cost ?? 0),
      min_stock: Number(raw.min_stock ?? 0),
      currency: raw.currency || null,
    });
  }
}
