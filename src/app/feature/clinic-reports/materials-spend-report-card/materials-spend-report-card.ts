import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { BranchAmountTable } from '../branch-amount-table/branch-amount-table';
import { MaterialsSpendReportService } from '../../../core/services/materials-spend-report.service';
import { MaterialsSpendByCurrency } from '../../../core/models/financial-report.model';

const MATERIAL_COLUMNS: DataTableColumn[] = [
  { key: 'material_name', label: 'Material' },
  { key: 'amount', label: 'Monto', align: 'right' },
];

const MONTHLY_COLUMNS: DataTableColumn[] = [
  { key: 'period', label: 'Mes' },
  { key: 'amount', label: 'Monto', align: 'right' },
];

// GET /tenants/reports/materials?from=&to= — separado por moneda real
// (a diferencia de Producción, acá el backend sí entrega currency por grupo).
@Component({
  selector: 'app-materials-spend-report-card',
  imports: [DataTable, BranchAmountTable],
  templateUrl: './materials-spend-report-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialsSpendReportCard {
  private reportSvc = inject(MaterialsSpendReportService);

  from = input.required<string>();
  to = input.required<string>();

  readonly materialColumns = MATERIAL_COLUMNS;
  readonly monthlyColumns = MONTHLY_COLUMNS;
  readonly report = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    effect(() => {
      this.reportSvc.load({ from: this.from(), to: this.to() });
    });
  }

  materialRows(group: MaterialsSpendByCurrency): Record<string, unknown>[] {
    return group.by_material.map(m => ({
      id: m.material_id,
      material_name: `${m.material_code} · ${m.material_name}`,
      amount: `${m.amount.toFixed(2)} ${group.currency}`,
    }));
  }

  monthlyRows(group: MaterialsSpendByCurrency): Record<string, unknown>[] {
    return group.monthly_breakdown.map(m => ({
      id: `${m.year}-${m.month}`,
      period: `${String(m.month).padStart(2, '0')}/${m.year}`,
      amount: `${m.amount.toFixed(2)} ${group.currency}`,
    }));
  }
}
