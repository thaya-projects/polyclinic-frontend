import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceOptionsService } from '../../../core/services/invoice-options.service';
import { InvoiceItemDto } from '../../../core/models/invoice-item.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

// Form de alta rápida de un item — se resetea después de cada "Agregar"
// (sin HTTP de por medio, no aplica el cuidado de "esperar al POST" que
// sí usamos en forms conectados a backend real).
@Component({
  selector: 'app-invoice-item-form',
  imports: [ReactiveFormsModule],
  templateUrl: './invoice-item-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceItemForm {
  private fb = inject(FormBuilder);
  private optionsSvc = inject(InvoiceOptionsService);

  // Para filtrar el picker de items de plan a los del paciente ya elegido
  // en la factura — null mientras no se eligió paciente todavía.
  patientId = input<string | null>(null);

  readonly services = this.optionsSvc.services();
  private readonly allTreatmentPlanItems = this.optionsSvc.treatmentPlanItems();
  readonly treatmentPlanItemOptions = computed(() => {
    const pid = this.patientId();
    return pid ? this.allTreatmentPlanItems().filter(i => i.patient_id === pid) : [];
  });

  added = output<InvoiceItemDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    service_id: [''],
    treatment_plan_item_id: [''],
    description: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unit_price: [0, [Validators.required, Validators.min(0)]],
  });

  // Criterio de aceptación: al elegir un service o un item de plan,
  // propone unit_price y description (el form sigue siendo editable
  // después). Mutuamente excluyentes — elegir uno limpia el otro.
  onServiceChange(id: string): void {
    if (!id) return;
    const service = this.services().find(s => s.id === id);
    if (!service) return;
    this.form.patchValue(
      { treatment_plan_item_id: '', description: service.name, unit_price: service.base_price },
      { emitEvent: false },
    );
  }

  onPlanItemChange(id: string): void {
    if (!id) return;
    const item = this.treatmentPlanItemOptions().find(i => i.id === id);
    if (!item) return;
    this.form.patchValue(
      { service_id: '', description: item.description, unit_price: item.unit_price },
      { emitEvent: false },
    );
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.added.emit({
      service_id: raw.service_id || null,
      treatment_plan_item_id: raw.treatment_plan_item_id || null,
      description: raw.description!,
      quantity: raw.quantity!,
      unit_price: raw.unit_price!,
    });
    this.form.reset({ service_id: '', treatment_plan_item_id: '', description: '', quantity: 1, unit_price: 0 });
  }
}
