import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { BranchesService } from '../../../core/services/branches.service';
import { ReportByBranchAmount } from '../../../core/models/financial-report.model';

const COLUMNS: DataTableColumn[] = [
  { key: 'branch_name', label: 'Sucursal' },
  { key: 'amount', label: 'Monto', align: 'right' },
];

// Reutilizada por producción/materiales/gastos: las 3 devuelven el mismo
// shape {branch_id, amount} por sucursal — solo cambia la moneda a mostrar.
@Component({
  selector: 'app-branch-amount-table',
  imports: [DataTable],
  templateUrl: './branch-amount-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchAmountTable {
  private branchesSvc = inject(BranchesService);

  rows = input.required<ReportByBranchAmount[]>();
  currency = input.required<string>();

  readonly columns = COLUMNS;

  readonly tableRows = computed(() =>
    this.rows().map(r => ({
      id: r.branch_id,
      branch_name: this.branchesSvc.find(r.branch_id)?.name ?? r.branch_id,
      amount: `${r.amount.toFixed(2)} ${this.currency()}`,
    })),
  );
}
