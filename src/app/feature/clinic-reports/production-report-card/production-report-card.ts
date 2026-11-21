import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { StatCard } from '../stat-card/stat-card';
import { BranchAmountTable } from '../branch-amount-table/branch-amount-table';
import { ProductionReportService } from '../../../core/services/production-report.service';
import { ProfessionalsService } from '../../../core/services/professionals.service';
import { AuthStore } from '../../../core/services/auth-store.service';
import { resolveTenantCurrency } from '../../../core/constants/currencies.const';

// GET /tenants/reports/production?from=&to=&professional_id= — el backend
// no separa por moneda ni dedupe facturado/tratamientos completados, así
// que el total se muestra con la moneda del tenant a título informativo.
@Component({
  selector: 'app-production-report-card',
  imports: [StatCard, BranchAmountTable],
  templateUrl: './production-report-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionReportCard {
  private reportSvc = inject(ProductionReportService);
  private professionalsSvc = inject(ProfessionalsService);

  from = input.required<string>();
  to = input.required<string>();

  readonly tenantCurrency = resolveTenantCurrency(inject(AuthStore).tenant());
  readonly professionals = this.professionalsSvc.getAll();
  professionalId = signal('');

  readonly report = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to(), professional_id: this.professionalId() || undefined });
    });
  }

  onProfessionalChange(value: string): void {
    this.professionalId.set(value);
  }
}
