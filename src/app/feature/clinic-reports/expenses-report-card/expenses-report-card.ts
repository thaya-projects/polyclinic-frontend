import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { BranchAmountTable } from '../branch-amount-table/branch-amount-table';
import { ExpensesReportService } from '../../../core/services/expenses-report.service';
import { ExpensesByCurrency } from '../../../core/models/financial-report.model';

const CATEGORY_COLUMNS: DataTableColumn[] = [
  { key: 'category', label: 'Categoría' },
  { key: 'amount', label: 'Monto', align: 'right' },
];

const MONTHLY_COLUMNS: DataTableColumn[] = [
  { key: 'period', label: 'Mes' },
  { key: 'amount', label: 'Monto', align: 'right' },
];

// GET /tenants/reports/expenses?from=&to= — separado por moneda real,
// mismo criterio que MaterialsSpendReportCard pero por categoría.
@Component({
  selector: 'app-expenses-report-card',
  imports: [DataTable, BranchAmountTable],
  templateUrl: './expenses-report-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesReportCard {
  private reportSvc = inject(ExpensesReportService);

  from = input.required<string>();
  to = input.required<string>();

  readonly categoryColumns = CATEGORY_COLUMNS;
  readonly monthlyColumns = MONTHLY_COLUMNS;
  readonly report = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to() });
    });
  }

  categoryRows(group: ExpensesByCurrency): Record<string, unknown>[] {
    return group.by_category.map(c => ({
      id: c.category,
      category: c.category,
      amount: `${c.amount.toFixed(2)} ${group.currency}`,
    }));
  }

  monthlyRows(group: ExpensesByCurrency): Record<string, unknown>[] {
    return group.monthly_breakdown.map(m => ({
      id: `${m.year}-${m.month}`,
      period: `${String(m.month).padStart(2, '0')}/${m.year}`,
      amount: `${m.amount.toFixed(2)} ${group.currency}`,
    }));
  }
}
