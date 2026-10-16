import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TreatmentPlanItemDto, TreatmentPlanItemStatus } from '../../../core/models/treatment-plan-item.model';

export interface TreatmentPlanItemDraft {
  tempId: string;
  dto: TreatmentPlanItemDto;
  // 'pendiente' para items recién agregados en esta sesión; conserva el
  // status real cuando viene de un plan existente (edición) — necesario
  // para excluir cancelados del total (criterio de aceptación de T2).
  status: TreatmentPlanItemStatus;
}

// Desacoplado de la fuente de datos (criterio de aceptación T2): solo
// recibe la lista de borradores ya armada, no sabe de dónde salió ni
// cómo se van a persistir.
@Component({
  selector: 'app-treatment-plan-items-preview',
  imports: [],
  templateUrl: './treatment-plan-items-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanItemsPreview {
  items = input.required<TreatmentPlanItemDraft[]>();

  remove = output<string>();

  subtotal(dto: TreatmentPlanItemDto): number {
    return dto.quantity * dto.unit_price;
  }
}
