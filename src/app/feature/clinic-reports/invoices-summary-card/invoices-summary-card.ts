import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { InvoicesReportService } from '../../../core/services/invoices-report.service';
import { InvoiceStatus } from '../../../core/models/invoice.model';
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '../../../core/constants/invoice-status.const';

// Corresponde a GET /tenants/reports/invoices?from=&to=&status= —
// autocontenida (igual criterio que AppointmentsByStatusCard).
@Component({
  selector: 'app-invoices-summary-card',
  imports: [],
  templateUrl: './invoices-summary-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesSummaryCard {
  private reportSvc = inject(InvoicesReportService);

  from = input.required<string>();
  to = input.required<string>();

  readonly statuses = INVOICE_STATUSES;
  readonly statusLabels = INVOICE_STATUS_LABELS;

  status = signal('');

  readonly summaries = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to(), status: (this.status() as InvoiceStatus) || undefined });
    });
  }

  onStatusChange(value: string): void {
    this.status.set(value);
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
