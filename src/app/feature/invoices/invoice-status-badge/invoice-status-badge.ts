import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusChip, StatusChipTone } from '../../../shared/components/status-chip/status-chip';
import { InvoiceStatus } from '../../../core/models/invoice.model';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES } from '../../../core/constants/invoice-status.const';

@Component({
  selector: 'app-invoice-status-badge',
  imports: [StatusChip],
  templateUrl: './invoice-status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceStatusBadge {
  status = input.required<InvoiceStatus>();

  label = computed(() => INVOICE_STATUS_LABELS[this.status()]);
  tone = computed<StatusChipTone>(() => INVOICE_STATUS_TONES[this.status()]);
}
