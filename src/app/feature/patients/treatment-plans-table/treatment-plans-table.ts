import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { TreatmentPlanStatusBadge } from '../treatment-plan-status-badge/treatment-plan-status-badge';
import { TreatmentPlan } from '../../../core/models/treatment-plan.model';

@Component({
  selector: 'app-treatment-plans-table',
  imports: [DataTable, DataTableCellDirective, TreatmentPlanStatusBadge],
  templateUrl: './treatment-plans-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlansTable {
  // Desacoplado de la fuente de datos (criterio de aceptación T1): solo
  // recibe la lista ya resuelta, sin saber si viene de un mock o de HTTP.
  plans = input.required<TreatmentPlan[]>();

  view = output<TreatmentPlan>();

  // app-data-table trabaja con filas genéricas; TreatmentPlan no tiene
  // index signature, así que se castea una sola vez acá para el binding.
  rows = computed(() => this.plans() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'created_at', label: 'Creado', width: '140px' },
    { key: 'status', label: 'Estado', width: '160px' },
    { key: 'total_estimated', label: 'Total estimado', align: 'right', width: '160px' },
    { key: 'actions', label: '', align: 'right', width: '110px' },
  ];

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
