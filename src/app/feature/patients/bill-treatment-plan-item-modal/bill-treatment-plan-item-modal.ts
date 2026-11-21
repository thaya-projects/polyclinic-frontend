import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { Modal } from '../../../shared/components/modal/modal';
import { InvoiceForm, InvoiceSubmitPayload } from '../../invoices/invoice-form/invoice-form';
import { InvoicesService } from '../../../core/services/invoices.service';
import { InvoiceItemsService } from '../../../core/services/invoice-items.service';
import { TreatmentPlanItem } from '../../../core/models/treatment-plan-item.model';
import { InvoiceItemDto } from '../../../core/models/invoice-item.model';
import { invoiceSaveErrorMessage } from '../../../shared/utils/invoices-error.util';
import { invoiceItemSaveErrorMessage } from '../../../shared/utils/invoice-items-error.util';

// "Facturar" desde un item de plan de tratamiento ya completado: paciente
// fijo y el item precargado en una factura nueva (ver TreatmentPlansSection,
// que es quien abre este modal pasando el item elegido).
@Component({
  selector: 'app-bill-treatment-plan-item-modal',
  imports: [Modal, InvoiceForm],
  templateUrl: './bill-treatment-plan-item-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillTreatmentPlanItemModal {
  private invoicesSvc = inject(InvoicesService);
  private invoiceItemsSvc = inject(InvoiceItemsService);

  patientId = input.required<string>();
  // null = cerrado.
  item = input<TreatmentPlanItem | null>(null);
  currency = input<string | null>(null);

  closed = output<void>();

  saving = signal(false);
  saveError = signal<string | null>(null);

  itemDto(item: TreatmentPlanItem): InvoiceItemDto {
    return {
      service_id: item.service_id,
      treatment_plan_item_id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    };
  }

  close(): void {
    this.saveError.set(null);
    this.closed.emit();
  }

  // POST /tenants/invoices (paciente fijo) + POST .../items — mismo
  // patrón de alta en dos pasos que InvoicesPage.onCreate.
  onSubmit(payload: InvoiceSubmitPayload): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.invoicesSvc.create(payload.invoice).subscribe({
      next: invoice => {
        const itemRequests = payload.items.map(dto => this.invoiceItemsSvc.create(invoice.id, dto));
        (itemRequests.length ? forkJoin(itemRequests) : of([])).subscribe({
          next: () => {
            this.saving.set(false);
            this.close();
          },
          error: err => {
            this.saving.set(false);
            this.saveError.set(invoiceItemSaveErrorMessage(err));
          },
        });
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(invoiceSaveErrorMessage(err));
      },
    });
  }
}
