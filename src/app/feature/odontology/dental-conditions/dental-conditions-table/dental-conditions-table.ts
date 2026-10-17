import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { DentalCondition } from '../../../../core/models/dental-condition.model';

// Presentacional: globales (tenant_id null) con badge "Global" y sin acciones; propias con "Editar".
@Component({
  selector: 'app-dental-conditions-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './dental-conditions-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DentalConditionsTable {
  conditions = input.required<DentalCondition[]>();

  edit = output<DentalCondition>();

  rows = computed(() => this.conditions() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'code', label: 'Código', width: '200px' },
    { key: 'category', label: 'Categoría', width: '160px' },
    { key: 'default_color', label: 'Color', width: '140px' },
    { key: 'scope', label: 'Alcance', align: 'center', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '140px' },
  ];
}
