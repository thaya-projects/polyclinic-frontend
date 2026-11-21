import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TreatmentPlanItemForm } from '../treatment-plan-item-form/treatment-plan-item-form';
import { TreatmentPlanItemsPreview, TreatmentPlanItemDraft } from '../treatment-plan-items-preview/treatment-plan-items-preview';
import { currencyOptions, resolveTenantCurrency } from '../../../core/constants/currencies.const';
import { AuthStore } from '../../../core/services/auth-store.service';
import { TreatmentPlan, TreatmentPlanDto } from '../../../core/models/treatment-plan.model';
import { TreatmentPlanItem, TreatmentPlanItemDto } from '../../../core/models/treatment-plan-item.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

export interface TreatmentPlanSubmitPayload {
  plan: TreatmentPlanDto;
  items: TreatmentPlanItemDto[];
}

let nextTempId = 1;

// No llama a ningún servicio para guardar — arma el payload (plan + items
// en borrador) y lo emite; el contenedor (TreatmentPlansSection) decide
// cómo persistirlo (hoy: mock local; T4/T5: HTTP real).
@Component({
  selector: 'app-treatment-plan-form',
  imports: [ReactiveFormsModule, TreatmentPlanItemForm, TreatmentPlanItemsPreview],
  templateUrl: './treatment-plan-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanForm {
  private fb = inject(FormBuilder);

  // null => alta de plan nuevo; con valor => edición de ese plan.
  plan = input<TreatmentPlan | null>(null);
  existingItems = input<TreatmentPlanItem[]>([]);
  saving = input(false);
  saveError = input<string | null>(null);

  submitted = output<TreatmentPlanSubmitPayload>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;
  // Moneda de la clínica preseleccionada; las demás quedan disponibles para cambiarla.
  readonly tenantCurrency = resolveTenantCurrency(inject(AuthStore).tenant());
  readonly currencies = currencyOptions(this.tenantCurrency);

  form = this.fb.group({
    notes: [''],
    currency: [this.tenantCurrency],
  });

  items = signal<TreatmentPlanItemDraft[]>([]);

  // Vista previa en cliente (criterio de aceptación) — el valor oficial
  // lo recalcula el backend; excluye items cancelados.
  readonly totalPreview = computed(() =>
    this.items()
      .filter(i => i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.dto.quantity * i.dto.unit_price, 0),
  );

  constructor() {
    effect(() => {
      const p = this.plan();
      this.form.patchValue({ notes: p?.notes ?? '', currency: p?.currency ?? this.tenantCurrency }, { emitEvent: false });
    });

    effect(() => {
      const existing = this.existingItems();
      this.items.set(
        existing.map(item => ({
          tempId: item.id,
          status: item.status,
          dto: {
            service_id: item.service_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tooth_fdi: item.tooth_fdi,
            surfaces: item.surfaces,
          },
        })),
      );
    });
  }

  onItemAdded(dto: TreatmentPlanItemDto): void {
    this.items.update(list => [...list, { tempId: `draft-${nextTempId++}`, status: 'pending', dto }]);
  }

  onItemRemoved(tempId: string): void {
    this.items.update(list => list.filter(i => i.tempId !== tempId));
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló (notes/currency). false = no
  // es de un campo de este form (el caller muestra el mensaje general).
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
      plan: { notes: raw.notes || null, currency: raw.currency || undefined },
      items: this.items().map(i => i.dto),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
