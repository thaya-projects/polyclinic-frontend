import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { Plan } from '../../../../core/models/plan.model';

@Component({
  selector: 'app-plans-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './plans-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansTable {
  plans = input.required<Plan[]>();

  edit = output<Plan>();
  toggleActive = output<Plan>();

  // DataTable trabaja con filas genéricas; Plan no tiene index signature — cast único acá.
  rows = computed(() => this.plans() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'code', label: 'Código', width: '160px' },
    { key: 'name', label: 'Nombre' },
    { key: 'price', label: 'Precio', align: 'right', width: '140px' },
    { key: 'limits', label: 'Límites (prof / sedes)', align: 'center', width: '180px' },
    { key: 'multi_specialty', label: 'Multi-especialidad', align: 'center', width: '160px' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '110px' },
  ];

  formatPrice(price: number, currency: string): string {
    return `${price.toFixed(2)} ${currency}`;
  }

  formatLimit(value: number | null): string {
    return value === null ? '∞' : String(value);
  }
}
