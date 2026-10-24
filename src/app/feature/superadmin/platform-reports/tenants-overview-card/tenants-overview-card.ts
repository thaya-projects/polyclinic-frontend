import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TenantsReportService } from '../../../../core/services/tenants-report.service';
import { countryLabel } from '../../../../core/constants/countries.const';

// Corresponde a GET /superadmin/reports/tenants. Desacoplada de la
// fuente de datos más allá de leer el signal del servicio — sin filtros
// (el ticket no pide rango de fechas para reportes de plataforma).
@Component({
  selector: 'app-tenants-overview-card',
  imports: [],
  templateUrl: './tenants-overview-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsOverviewCard {
  private reportSvc = inject(TenantsReportService);

  readonly summary = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    this.reportSvc.load();
  }

  countryLabel(code: string): string {
    return countryLabel(code);
  }
}
