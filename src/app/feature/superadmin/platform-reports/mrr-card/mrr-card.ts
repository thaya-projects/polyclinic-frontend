import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MrrReportService } from '../../../../core/services/mrr-report.service';

// Corresponde a GET /superadmin/reports/mrr.
@Component({
  selector: 'app-mrr-card',
  imports: [],
  templateUrl: './mrr-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MrrCard {
  private reportSvc = inject(MrrReportService);

  readonly summary = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    this.reportSvc.load();
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
