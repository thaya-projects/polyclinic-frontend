import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ClinicReportsFilters } from '../clinic-reports-filters/clinic-reports-filters';
import { ProductionReportCard } from '../production-report-card/production-report-card';
import { MaterialsSpendReportCard } from '../materials-spend-report-card/materials-spend-report-card';
import { ExpensesReportCard } from '../expenses-report-card/expenses-report-card';
import { BalanceReportCard } from '../balance-report-card/balance-report-card';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toIsoDate(date);
}

// Sección delgada: igual criterio que ClinicReportsSummarySection — solo
// es dueña del rango de fechas compartido por los 4 endpoints de
// ReportsController; cada card arma su propio query y servicio.
@Component({
  selector: 'app-financial-reports-section',
  imports: [ClinicReportsFilters, ProductionReportCard, MaterialsSpendReportCard, ExpensesReportCard, BalanceReportCard],
  templateUrl: './financial-reports-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReportsSection {
  from = signal(defaultFrom());
  to = signal(toIsoDate(new Date()));
}
