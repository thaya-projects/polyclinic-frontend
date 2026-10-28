import { ChangeDetectionStrategy, Component, input, output, viewChildren } from '@angular/core';
import { TreatmentPlanItemStatusForm } from '../treatment-plan-item-status-form/treatment-plan-item-status-form';
import { TreatmentPlanItem, TreatmentPlanItemStatusChangeDto } from '../../../core/models/treatment-plan-item.model';
import { TreatmentPlanAppointmentOption } from '../../../core/services/treatment-plan-options.service';

export interface TreatmentPlanItemStatusChangeEvent {
  itemId: string;
  dto: TreatmentPlanItemStatusChangeDto;
}

// Desacoplado de la fuente de datos (criterio de aceptación T3): recibe
// los items y las citas ya resueltas, no sabe de dónde salen.
@Component({
  selector: 'app-treatment-plan-items-status-list',
  imports: [TreatmentPlanItemStatusForm],
  templateUrl: './treatment-plan-items-status-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanItemsStatusList {
  items = input.required<TreatmentPlanItem[]>();
  appointments = input.required<TreatmentPlanAppointmentOption[]>();
  savingItemId = input<string | null>(null);

  changed = output<TreatmentPlanItemStatusChangeEvent>();
  remove = output<string>();

  private readonly statusForms = viewChildren(TreatmentPlanItemStatusForm);

  // Error 400/422 del cambio de estado de un item: lo marca en el form de ESE item. false = no es de
  // un campo del form (el caller muestra el mensaje general).
  applyServerError(itemId: string, err: unknown): boolean {
    return this.statusForms().find(f => f.item().id === itemId)?.applyServerError(err) ?? false;
  }

  subtotal(item: TreatmentPlanItem): number {
    return item.quantity * item.unit_price;
  }
}
