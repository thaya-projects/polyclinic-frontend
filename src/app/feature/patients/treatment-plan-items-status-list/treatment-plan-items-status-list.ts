import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

  subtotal(item: TreatmentPlanItem): number {
    return item.quantity * item.unit_price;
  }
}
