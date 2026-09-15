import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';

// Fila ya resuelta a texto (nombre de rol/sucursal) — el componente no
// conoce ClinicRole/Branch/UserRoleAssignment, así queda desacoplado de la
// fuente de datos y se puede reutilizar tanto en la página (solo lectura)
// como dentro del modal de asignación (con la columna de "Quitar").
export interface AssignmentRow {
  id: string;
  roleName: string;
  branchName: string;
}

@Component({
  selector: 'app-user-role-assignments-table',
  imports: [DataTable, DataTableCellDirective],
  templateUrl: './user-role-assignments-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRoleAssignmentsTable {
  rows = input.required<AssignmentRow[]>();
  editable = input(false);

  remove = output<string>();

  gridRows = computed(() => this.rows() as unknown as Record<string, unknown>[]);

  readonly columns = computed<DataTableColumn[]>(() => {
    const base: DataTableColumn[] = [
      { key: 'roleName', label: 'Rol' },
      { key: 'branchName', label: 'Sucursal' },
    ];
    return this.editable() ? [...base, { key: 'actions', label: '', align: 'right', width: '90px' }] : base;
  });
}
