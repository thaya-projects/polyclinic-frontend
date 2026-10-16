import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { Branch } from '../../../../core/models/branch.model';

@Component({
  selector: 'app-branches-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './branches-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesTable {
  branches = input.required<Branch[]>();

  edit = output<Branch>();
  deactivate = output<Branch>();

  rows = computed(() => this.branches() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'address', label: 'Dirección' },
    { key: 'phone', label: 'Teléfono', width: '140px' },
    { key: 'timezone', label: 'Zona horaria', width: '180px' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '160px' },
  ];
}
