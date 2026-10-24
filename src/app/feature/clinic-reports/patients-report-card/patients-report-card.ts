import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { StatCard } from '../stat-card/stat-card';
import { PatientsReportService } from '../../../core/services/patients-report.service';

// Corresponde a GET /tenants/reports/patients?from=&to= — sin filtros
// propios más allá del rango de fechas compartido (a diferencia de
// citas/facturas/encuentros, el schema no le da professional_id/status).
@Component({
  selector: 'app-patients-report-card',
  imports: [StatCard],
  templateUrl: './patients-report-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientsReportCard {
  private reportSvc = inject(PatientsReportService);

  from = input.required<string>();
  to = input.required<string>();

  readonly count = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to() });
    });
  }
}
