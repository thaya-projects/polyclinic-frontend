import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { Room } from '../../../../core/models/room.model';

@Component({
  selector: 'app-rooms-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './rooms-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsTable {
  rooms = input.required<Room[]>();
  togglingId = input<string | null>(null);

  edit = output<Room>();
  toggleActive = output<Room>();

  tableRows = computed(() => this.rooms() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '200px' },
  ];
}
