import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { StatCard } from '../stat-card/stat-card';
import { PatientsReportService } from '../../../core/services/patients-report.service';

type ActiveFilter = 'all' | 'true' | 'false';

// Corresponde a GET /tenants/reports/patients?from=&to=&is_active= — sin
// professional_id/status (a diferencia de citas/facturas/encuentros).
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

  activeFilter = signal<ActiveFilter>('true');

  readonly report = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      const active = this.activeFilter();
      this.reportSvc.load({
        from: this.from(),
        to: this.to(),
        is_active: active === 'all' ? undefined : active === 'true',
      });
    });
  }

  onActiveFilterChange(value: string): void {
    this.activeFilter.set(value as ActiveFilter);
  }
}
