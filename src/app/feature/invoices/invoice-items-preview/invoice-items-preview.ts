import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { InvoiceItemDto } from '../../../core/models/invoice-item.model';

export interface InvoiceItemDraft {
  tempId: string;
  dto: InvoiceItemDto;
}

// Desacoplado de la fuente de datos (criterio de aceptación T2): solo
// recibe la lista de borradores ya armada.
@Component({
  selector: 'app-invoice-items-preview',
  imports: [],
  templateUrl: './invoice-items-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceItemsPreview {
  items = input.required<InvoiceItemDraft[]>();
  readonly = input(false);

  remove = output<string>();

  subtotal(dto: InvoiceItemDto): number {
    return dto.quantity * dto.unit_price;
  }
}
