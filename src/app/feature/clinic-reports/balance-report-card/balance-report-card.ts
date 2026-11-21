import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { StatCard } from '../stat-card/stat-card';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { BalanceReportService } from '../../../core/services/balance-report.service';
import { BranchesService } from '../../../core/services/branches.service';
import { BalanceReport } from '../../../core/models/financial-report.model';

const BRANCH_COLUMNS: DataTableColumn[] = [
  { key: 'branch_name', label: 'Sucursal' },
  { key: 'income', label: 'Ingresos', align: 'right' },
  { key: 'material_spend', label: 'Materiales', align: 'right' },
  { key: 'operating_expenses', label: 'Gastos', align: 'right' },
  { key: 'net_balance', label: 'Balance neto', align: 'right' },
];

// GET /tenants/reports/balance?from=&to= — net_balance solo considera los
// montos en la moneda local del tenant (sin conversión); los `_detail` ya
// se muestran en las otras 3 cards de esta pestaña, no se repiten acá.
@Component({
  selector: 'app-balance-report-card',
  imports: [StatCard, DataTable],
  templateUrl: './balance-report-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceReportCard {
  private reportSvc = inject(BalanceReportService);
  private branchesSvc = inject(BranchesService);

  from = input.required<string>();
  to = input.required<string>();

  readonly branchColumns = BRANCH_COLUMNS;
  readonly report = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to() });
    });
  }

  branchRows(r: BalanceReport): Record<string, unknown>[] {
    return r.by_branch.map(b => ({
      id: b.branch_id,
      branch_name: this.branchesSvc.find(b.branch_id)?.name ?? b.branch_id,
      income: `${b.income.toFixed(2)} ${r.currency}`,
      material_spend: `${b.material_spend.toFixed(2)} ${r.currency}`,
      operating_expenses: `${b.operating_expenses.toFixed(2)} ${r.currency}`,
      net_balance: `${b.net_balance.toFixed(2)} ${r.currency}`,
    }));
  }
}
